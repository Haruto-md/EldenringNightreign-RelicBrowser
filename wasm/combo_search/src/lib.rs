use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use serde_wasm_bindgen;
use std::collections::HashSet;
use std::sync::atomic::{AtomicU32, Ordering};
// Added: rayon parallel iteration
use rayon::prelude::*;
// Re-export for JS thread pool init
pub use wasm_bindgen_rayon::init_thread_pool;
// Added: represent EffectType as numeric enum like TS const enum
use serde_repr::{Serialize_repr, Deserialize_repr};

// Constants for scoring
const POINTS_FOR_SELECTED_EFFECT: f32 = 1.0;
const POINTS_FOR_SELECTED_DUPLICATE_EFFECT: f32 = 0.9;
const POINTS_FOR_RANDOM_CHARACTER_EFFECT: f32 = 0.2;
const POINTS_FOR_RANDOM_RECOMMENDED_EFFECT: f32 = 0.2;
const POINTS_FOR_RANDOM_EFFECT: f32 = 0.1;
const PENALTY_FOR_MISSING_LEVEL: f32 = -0.1;

const SELECTED_EFFECTS_SPACE: usize = 9*3;
const RECOMMENDED_EFFECTS_SPACE: usize = 35;
const EFFECT_KEY_SPACE: usize = 850;
// Per-must-have match direction, stored per-effect-key (parallel to
// selected_groups_by_key / selected_levels_by_key) since Rust's WASM
// boundary carries it as a plain u8 rather than a Rust enum.
const MATCH_MODE_EXACT: u8 = 0;
const MATCH_MODE_HIGHER_OR_EQUAL: u8 = 1;
const MATCH_MODE_LOWER_OR_EQUAL: u8 = 2;
const EFFECT_GROUP_SPACE: usize = 30;
// Color domain: 0=Any, 1=Red, 2=Blue, 3=Yellow, 4=Green
const COLOR_SPACE: usize = 5;
const ANY_COLOR: usize = 0;
// Limit of combinations returned to UI
const TOP_RESULTS: usize = 50;
// Internal caps when enumerating normal/deep triples before merging
const TOP_GROUP_RESULTS: usize = 200;

// Batch size for flushing the live-progress atomic counter. Each parallel
// per-vessel search call site tracks its own local `checked_local` and only
// flushes to the shared atomic every PROGRESS_BATCH combinations — this
// bounds atomic-op/cache-contention overhead across rayon's threads. The
// final `total_combinations_checked` returned to JS is NEVER read from this
// atomic; it always comes from the accurate local counters, so a search
// result is byte-for-byte identical to before this counter existed.
const PROGRESS_BATCH: u32 = 256;
static PROGRESS_COUNTER: AtomicU32 = AtomicU32::new(0);

#[inline(always)]
fn record_progress(checked_local: u32) {
    if checked_local % PROGRESS_BATCH == 0 {
        PROGRESS_COUNTER.fetch_add(PROGRESS_BATCH, Ordering::Relaxed);
    }
}

/// Returns the module's shared `WebAssembly.Memory`. JS builds an
/// `Int32Array` view over its `.buffer` to poll `PROGRESS_COUNTER` live with
/// `Atomics.load` from the main thread while a search runs on a worker
/// thread (the worker itself is blocked inside the synchronous
/// `search_combinations` call and can't post progress messages itself).
#[wasm_bindgen]
pub fn wasm_memory() -> JsValue {
    wasm_bindgen::memory()
}

/// Byte address of `PROGRESS_COUNTER` inside the shared wasm linear memory.
/// JS divides this by 4 to get an `Int32Array` element index.
#[wasm_bindgen]
pub fn progress_counter_ptr() -> u32 {
    &PROGRESS_COUNTER as *const AtomicU32 as u32
}

// Reusable scoring context avoiding per-combination clears
struct ScoreContext {
    satisfied_keys_gen: [u16; EFFECT_KEY_SPACE],
    satisfied_groups_gen: [u16; EFFECT_GROUP_SPACE],
    current_gen: u16,
}
impl ScoreContext {
    #[inline(always)]
    fn new() -> Self { Self { satisfied_keys_gen: [0; EFFECT_KEY_SPACE], satisfied_groups_gen: [0; EFFECT_GROUP_SPACE], current_gen: 1 } }
    #[inline(always)]
    fn next_generation(&mut self) {
        self.current_gen = self.current_gen.wrapping_add(1);
        if self.current_gen == 0 { // wrapped
            self.satisfied_keys_gen = [0; EFFECT_KEY_SPACE];
            self.satisfied_groups_gen = [0; EFFECT_GROUP_SPACE];
            self.current_gen = 1;
        }
    }
    #[inline(always)] fn is_key(&self, k: usize) -> bool { if k >= EFFECT_KEY_SPACE { return false; } unsafe { *self.satisfied_keys_gen.get_unchecked(k) == self.current_gen } }
    #[inline(always)] fn set_key(&mut self, k: usize) { if k < EFFECT_KEY_SPACE { unsafe { *self.satisfied_keys_gen.get_unchecked_mut(k) = self.current_gen; } } }
    #[inline(always)] fn is_group(&self, g: usize) -> bool { if g >= EFFECT_GROUP_SPACE { return false; } unsafe { *self.satisfied_groups_gen.get_unchecked(g) == self.current_gen } }
    #[inline(always)] fn set_group(&mut self, g: usize) { if g < EFFECT_GROUP_SPACE { unsafe { *self.satisfied_groups_gen.get_unchecked_mut(g) = self.current_gen; } } }
}

#[derive(Serialize_repr, Deserialize_repr, Debug, Copy, Clone, PartialEq, Eq)]
#[repr(u8)]
pub enum EffectType {
    Buff = 0,
    Debuff = 1,
}

#[derive(Serialize, Deserialize)]
pub struct Effect {
    pub key: u32,
    pub nightfarer: Option<u8>,
    pub stacks: Option<bool>,
    pub group: Option<u8>,
    pub level: Option<u8>,
    pub startingBonus: Option<u8>,
    pub r#type: Option<EffectType>,
}

#[derive(Serialize, Deserialize)]
pub struct RelicSlot {
    pub color: Option<u8>,
    pub effects: Vec<Effect>,
}

#[derive(Serialize, Deserialize)]
pub struct VesselCombinationResultEntry {
    pub vessel_index: usize,
    pub relic_indices: [Option<usize>;6],
    pub points: f32,
}

#[derive(Serialize, Deserialize)]
pub struct SearchInput {
    pub nightfarer: u8,
    pub selected_effects: Vec<Effect>,
    pub relics: Vec<RelicSlot>,
    pub deep_relics: Vec<RelicSlot>,
    pub enabled_vessels: Vec<[u8;6]>,
    pub recommended_effects: Vec<Effect>,
    pub selected_effect_ranges: Option<Vec<SelectedEffectRange>>, // new optional
    pub damage_multipliers: Option<Vec<f32>>,   // len == EFFECT_KEY_SPACE; 1.0 = irrelevant
    pub excluded_demerit_keys: Option<Vec<u32>>,
}

#[derive(Serialize, Deserialize)]
pub struct SearchOutput {
    pub combinations: Vec<VesselCombinationResultEntry>,
    pub total_combinations_checked: u32,
}

// `u8` implements `Default` (returning 0, i.e. MATCH_MODE_EXACT), so a bare
// `#[serde(default)]` on `match_mode` below would silently fall back to
// exact-only matching for any payload missing the field. This codebase's
// chosen fallback is MATCH_MODE_HIGHER_OR_EQUAL (matching the pre-match-mode
// behavior), so a named-function default is required instead.
fn default_match_mode() -> u8 { MATCH_MODE_HIGHER_OR_EQUAL }

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct SelectedEffectRange {
    pub effect_key: u32,
    pub min_stacks: u8,
    pub max_stacks: u8,
    #[serde(default = "default_match_mode")]
    pub match_mode: u8,
}

#[inline(always)]
fn is_recommended_effect(effect: &Effect, recommended_bitmap: &[bool; EFFECT_KEY_SPACE]) -> bool {
    let k = effect.key as usize;
    if k >= EFFECT_KEY_SPACE { return false; } // Prevent OOB -> unreachable trap
    unsafe { *recommended_bitmap.get_unchecked(k) }
}

/// In damage mode, a relic is a search candidate if it carries an effect with a
/// damage multiplier > 1.0, OR an effect named by a must-have range
/// (`min_stacks > 0`) — otherwise a quantity-only must-have (no damage
/// multiplier of its own) could never enter the candidate set, silently
/// making its range constraint unsatisfiable.
#[inline(always)]
fn is_damage_mode_candidate(
    effects: &[Effect],
    nightfarer: u8,
    damage_mults: &[f32],
    range_min_keys: &[bool; EFFECT_KEY_SPACE],
) -> bool {
    for e in effects {
        let k = e.key as usize;
        if k >= EFFECT_KEY_SPACE { continue; }
        if let Some(nf) = e.nightfarer { if nf != nightfarer { continue; } }
        if damage_mults.get(k).copied().unwrap_or(1.0) > 1.0
            || unsafe { *range_min_keys.get_unchecked(k) }
        {
            return true;
        }
    }
    false
}

#[inline(always)]
fn pack_triple_key(relic_indices: [Option<usize>; 3]) -> u32 {
    // Pack up to three sorted relic indices (each < 1023) into 30 bits (3 * 10).
    // Missing indices are represented by sentinel 1023 (all 1s in 10 bits) placed at the end after sorting.
    const SENTINEL: u16 = 1023; // 10-bit all ones; reserved (assert real indices < 1023)
    let mut ids: [u16; 3] = [SENTINEL, SENTINEL, SENTINEL];
    let mut n = 0usize;
    for opt_idx in relic_indices.iter() { if let Some(idx) = opt_idx { debug_assert!(*idx < SENTINEL as usize); ids[n] = *idx as u16; n += 1; } }
    // Sort so that real indices ( < SENTINEL ) come before sentinels, making representation independent of order & count
    ids.sort_unstable();
    (ids[0] as u32) | ((ids[1] as u32) << 10) | ((ids[2] as u32) << 20)
}

#[inline(always)]
fn generate_unique_key6(relic_indices6: [Option<usize>; 6]) -> u64 {
    let normal_key = pack_triple_key([relic_indices6[0], relic_indices6[1], relic_indices6[2]]) as u64;
    let deep_key = pack_triple_key([relic_indices6[3], relic_indices6[4], relic_indices6[5]]) as u64;
    normal_key | (deep_key << 30)
}

#[inline(always)]
fn add_combination_if_unique6(
    results: &mut Vec<VesselCombinationResultEntry>,
    seen_combinations: &mut std::collections::HashSet<u64>,
    vessel_index: usize,
    relic_indices6: [Option<usize>; 6],
    relics_normal: &[RelicSlot],
    relics_deep: &[RelicSlot],
    nightfarer: u8,
    selected_keys: &[bool; EFFECT_KEY_SPACE],
    recommended_bitmap: &[bool; EFFECT_KEY_SPACE],
    min_tracker: &mut (usize, f32),
    score_ctx: &mut ScoreContext,
    ranges: &[(u32,u8,u8)],
    selected_groups_by_key: &[u8; EFFECT_KEY_SPACE],
    selected_levels_by_key: &[u8; EFFECT_KEY_SPACE],
    selected_match_mode_by_key: &[u8; EFFECT_KEY_SPACE],
    damage_mode: bool,
    damage_mults: &[f32],
    excluded_demerits: &[u32],
) {
    // Skip combos where all 6 slots are empty
    if relic_indices6.iter().all(|x| x.is_none()) { return; }

    let unique_key = generate_unique_key6(relic_indices6);
    if !seen_combinations.insert(unique_key) { return; }

    // Drop if out of requested stack ranges
    if !combination_satisfies_ranges(&relic_indices6, relics_normal, relics_deep, nightfarer, ranges, selected_groups_by_key, selected_levels_by_key, selected_match_mode_by_key) { return; }

    if damage_mode && combination_has_excluded_demerit(&relic_indices6, relics_deep, excluded_demerits) { return; }

    let points = if damage_mode {
        calc_damage(nightfarer, relic_indices6, relics_normal, relics_deep, damage_mults, score_ctx)
    } else {
        calc_points(nightfarer, relic_indices6, relics_normal, relics_deep, selected_keys, recommended_bitmap, score_ctx)
    };

    if results.len() < TOP_RESULTS {
        results.push(VesselCombinationResultEntry { vessel_index, relic_indices: relic_indices6, points });
        // Update min tracker
        if points < min_tracker.1 { *min_tracker = (results.len() - 1, points); }
        return;
    }

    // Fast reject if not better than current minimum
    if points <= min_tracker.1 { return; }

    // Replace the current minimum entry
    let min_i = min_tracker.0;
    results[min_i] = VesselCombinationResultEntry { vessel_index, relic_indices: relic_indices6, points };

    // Recompute new minimum (only on replacements)
    let mut new_min_i = 0usize;
    let mut new_min_p = results[0].points;
    for (i, r) in results.iter().enumerate().skip(1) {
        if r.points < new_min_p { new_min_p = r.points; new_min_i = i; }
    }
    *min_tracker = (new_min_i, new_min_p);
}

#[inline(always)]
fn calc_points(
    nightfarer: u8,
    relic_indices6: [Option<usize>; 6],
    relics_normal: &[RelicSlot],
    relics_deep: &[RelicSlot],
    selected_keys: &[bool; EFFECT_KEY_SPACE],
    recommended_bitmap: &[bool; EFFECT_KEY_SPACE],
    ctx: &mut ScoreContext,
) -> f32 {
    ctx.next_generation();
    let mut points: f32 = 0.0;
    // Bit mask tracking which startingBonus values have already contributed points (supports 0..=7)
    let mut starting_bonus_mask: u8 = 0;

    for (slot_i, opt_idx) in relic_indices6.iter().enumerate() {
        if let Some(idx) = opt_idx {
            let relic = if slot_i < 3 {
                unsafe { relics_normal.get_unchecked(*idx) }
            } else {
                unsafe { relics_deep.get_unchecked(*idx) }
            };
            for effect in &relic.effects {
                let is_character_effect = effect.nightfarer.is_some();
                let is_usable_character_effect = effect.nightfarer == Some(nightfarer);
                if is_character_effect && !is_usable_character_effect { continue; }

                // If this effect has a starting bonus already seen, skip entirely (no points, no duplicate marking)
                if let Some(sb) = effect.startingBonus {
                    let bit: u8 = 1u8 << (sb & 7);
                    if (starting_bonus_mask & bit) != 0 { continue; }
                    starting_bonus_mask |= bit; // first time this starting bonus contributes
                }

                let k = effect.key as usize;
                if k >= EFFECT_KEY_SPACE { continue; }
                let key_duplicate = ctx.is_key(k);
                let group_duplicate = match effect.group { Some(g) => { let gu = g as usize; ctx.is_group(gu) }, None => false };
                let is_duplicate = key_duplicate || group_duplicate;
                let is_stackable = effect.stacks.unwrap_or(false);
                if is_duplicate && !is_stackable { continue; }
                let is_selected_effect = unsafe { *selected_keys.get_unchecked(k) };
                let level_points_multiplier: f32 = match effect.level {
                    Some(l) => { debug_assert!(l <= 3); let missing: i32 = 3 - l as i32; 1.0 + (missing as f32) * PENALTY_FOR_MISSING_LEVEL },
                    None => 1.0
                };
                let is_debuff = matches!(effect.r#type, Some(EffectType::Debuff));
                if !(is_debuff && !is_selected_effect) {
                    if is_selected_effect {
                        if is_duplicate { points += POINTS_FOR_SELECTED_DUPLICATE_EFFECT * level_points_multiplier; }
                        else { points += POINTS_FOR_SELECTED_EFFECT * level_points_multiplier; }
                    } else if is_usable_character_effect && !is_duplicate {
                        points += POINTS_FOR_RANDOM_CHARACTER_EFFECT * level_points_multiplier;
                    } else if !is_character_effect {
                        let is_recommended = is_recommended_effect(effect, recommended_bitmap);
                        if is_recommended { points += POINTS_FOR_RANDOM_RECOMMENDED_EFFECT * level_points_multiplier; }
                        else { points += POINTS_FOR_RANDOM_EFFECT * level_points_multiplier; }
                    }
                }
                ctx.set_key(k);
                if let Some(g) = effect.group { let gu = g as usize; ctx.set_group(gu); }
            }
        }
    }
    points
}

/// `calc_damage` indexes `multipliers` with `get_unchecked(k)` for k up to
/// EFFECT_KEY_SPACE-1, which is only sound if `multipliers.len() >= EFFECT_KEY_SPACE`.
/// Callers must check this before invoking `calc_damage`.
#[inline(always)]
fn damage_multipliers_valid(mults: &[f32]) -> bool {
    mults.len() >= EFFECT_KEY_SPACE
}

#[inline(always)]
fn calc_damage(
    nightfarer: u8,
    relic_indices6: [Option<usize>; 6],
    relics_normal: &[RelicSlot],
    relics_deep: &[RelicSlot],
    multipliers: &[f32],
    ctx: &mut ScoreContext,
) -> f32 {
    ctx.next_generation();
    let mut product: f32 = 1.0;
    for (slot_i, opt_idx) in relic_indices6.iter().enumerate() {
        if let Some(idx) = opt_idx {
            let relic = if slot_i < 3 { unsafe { relics_normal.get_unchecked(*idx) } }
                        else { unsafe { relics_deep.get_unchecked(*idx) } };
            for effect in &relic.effects {
                if let Some(nf) = effect.nightfarer { if nf != nightfarer { continue; } }
                let k = effect.key as usize;
                if k >= EFFECT_KEY_SPACE { continue; }
                let m = unsafe { *multipliers.get_unchecked(k) };
                if m <= 1.0 { continue; }
                let stacks = effect.stacks.unwrap_or(true);
                if !stacks {
                    if ctx.is_key(k) { continue; }
                    ctx.set_key(k);
                }
                product *= m;
            }
        }
    }
    product
}

#[inline(always)]
fn combination_has_excluded_demerit(
    relic_indices6: &[Option<usize>;6],
    relics_deep: &[RelicSlot],
    excluded: &[u32],
) -> bool {
    if excluded.is_empty() { return false; }
    // Demerits live on deep relics (slots 3..5).
    for slot_i in 3..6 {
        if let Some(idx) = relic_indices6[slot_i] {
            let relic = unsafe { relics_deep.get_unchecked(idx) };
            for effect in &relic.effects {
                if excluded.iter().any(|&e| e == effect.key) { return true; }
            }
        }
    }
    false
}

#[inline(always)]
fn combination_satisfies_ranges(
    relic_indices6: &[Option<usize>;6],
    relics_normal: &[RelicSlot],
    relics_deep: &[RelicSlot],
    nightfarer: u8,
    ranges: &[(u32, u8, u8)],
    selected_groups_by_key: &[u8; EFFECT_KEY_SPACE],
    selected_levels_by_key: &[u8; EFFECT_KEY_SPACE],
    selected_match_mode_by_key: &[u8; EFFECT_KEY_SPACE],
) -> bool {
    if ranges.is_empty() { return true; }
    // One counter per requested range entry, in order
    let mut counts: Vec<u8> = vec![0u8; ranges.len()];

    for (slot_i, opt_idx) in relic_indices6.iter().enumerate() {
        if let Some(idx) = opt_idx {
            let relic = if slot_i < 3 { unsafe { relics_normal.get_unchecked(*idx) } } else { unsafe { relics_deep.get_unchecked(*idx) } };
            for effect in &relic.effects {
                // Skip effects not usable by this nightfarer if character bound
                if let Some(nf) = effect.nightfarer { if nf != nightfarer { continue; } }

                // Check this effect against each requested range key, via the
                // same match rule triple_covered_key_count's pruning bonus
                // uses, so the two can never disagree on what counts.
                for (i, (key, _min_s, _max_s)) in ranges.iter().enumerate() {
                    if effect_satisfies_key(effect, *key, selected_groups_by_key, selected_levels_by_key, selected_match_mode_by_key) {
                        let c = unsafe { counts.get_unchecked_mut(i) };
                        if *c < u8::MAX { *c += 1; }
                    }
                }
            }
        }
    }
    // Now validate counts fall within the ranges
    for (i, (_key, min_s, max_s)) in ranges.iter().enumerate() {
        let c = unsafe { *counts.get_unchecked(i) };
        if c < *min_s || c > *max_s { return false; }
    }
    true
}

// True if `effect` satisfies required `key`: an identical key always
// matches. Otherwise, if `key`'s own match mode is `exact`, no tier match is
// allowed. Otherwise, a same-group stackable tier at or above `key`'s level
// satisfies mode `higherOrEqual`, and at or below satisfies mode
// `lowerOrEqual` (mirroring combination_satisfies_ranges' final-check
// semantics exactly, so the pruning-bonus below can never rank a
// tier-satisfying triple lower than the check that ultimately decides
// whether a full combination is valid).
#[inline(always)]
fn effect_satisfies_key(
    effect: &Effect,
    key: u32,
    selected_groups_by_key: &[u8; EFFECT_KEY_SPACE],
    selected_levels_by_key: &[u8; EFFECT_KEY_SPACE],
    selected_match_mode_by_key: &[u8; EFFECT_KEY_SPACE],
) -> bool {
    if effect.key == key { return true; }
    let k_usize = key as usize;
    if k_usize >= EFFECT_KEY_SPACE { return false; }
    let mode = unsafe { *selected_match_mode_by_key.get_unchecked(k_usize) };
    if mode == MATCH_MODE_EXACT { return false; }
    let sel_g = unsafe { *selected_groups_by_key.get_unchecked(k_usize) };
    let sel_l = unsafe { *selected_levels_by_key.get_unchecked(k_usize) };
    if sel_g == u8::MAX || sel_l == u8::MAX { return false; }
    if let (Some(eg), Some(el)) = (effect.group, effect.level) {
        if !effect.stacks.unwrap_or(false) || eg != sel_g { return false; }
        if mode == MATCH_MODE_LOWER_OR_EQUAL { el <= sel_l } else { el >= sel_l }
    } else {
        false
    }
}

// Number of DISTINCT required-must-have keys (from `range_keys`) carried by
// any slotted relic in this partial 6-combo, respecting the nightfarer gate
// and the same-group-higher-tier match the same way combination_satisfies_ranges
// does. A plain "carries any must-have" boolean can't tell a triple that
// covers two different required keys (needed together to satisfy both) from
// one that only covers a single key - see triple_key_less below for why that
// distinction matters.
#[inline(always)]
fn triple_covered_key_count(
    indices6: &[Option<usize>; 6],
    relics_normal: &[RelicSlot],
    relics_deep: &[RelicSlot],
    nightfarer: u8,
    range_keys: &[u32],
    selected_groups_by_key: &[u8; EFFECT_KEY_SPACE],
    selected_levels_by_key: &[u8; EFFECT_KEY_SPACE],
    selected_match_mode_by_key: &[u8; EFFECT_KEY_SPACE],
) -> u8 {
    let mut covered = 0u8;
    for &key in range_keys {
        for (slot_i, opt_idx) in indices6.iter().enumerate() {
            if let Some(idx) = opt_idx {
                let relic = if slot_i < 3 { unsafe { relics_normal.get_unchecked(*idx) } } else { unsafe { relics_deep.get_unchecked(*idx) } };
                let found = relic.effects.iter().any(|effect| {
                    if let Some(nf) = effect.nightfarer { if nf != nightfarer { return false; } }
                    effect_satisfies_key(effect, key, selected_groups_by_key, selected_levels_by_key, selected_match_mode_by_key)
                });
                if found { covered += 1; break; }
            }
        }
    }
    covered
}

// Retention priority key for a group triple: triples covering more distinct
// required must-have keys always outrank ones covering fewer, and ties break
// by damage points. Used so top-K group pruning never discards a triple
// needed to jointly satisfy several must-have ranges in favor of a
// higher-damage triple that only covers one (or none) of them. When no
// must-haves exist, every triple's count is 0 and this degrades to ordering
// by points alone.
#[inline(always)]
fn triple_key_less(a: (u8, f32), b: (u8, f32)) -> bool {
    a.0 < b.0 || (a.0 == b.0 && a.1 < b.1)
}

fn search_group_triples(
    group_slots: [u8;3],
    by_color_all: &Vec<Vec<usize>>,
    by_color_cand: &Vec<Vec<usize>>,
    relics_normal: &[RelicSlot],
    relics_deep: &[RelicSlot],
    is_deep_group: bool,
    nightfarer: u8,
    selected_bitmap: &[bool; EFFECT_KEY_SPACE],
    recommended_bitmap: &[bool; EFFECT_KEY_SPACE],
    damage_mode: bool,
    damage_mults: &[f32],
    excluded_demerits: &[u32],
    range_keys: &[u32],
    selected_groups_by_key: &[u8; EFFECT_KEY_SPACE],
    selected_levels_by_key: &[u8; EFFECT_KEY_SPACE],
    selected_match_mode_by_key: &[u8; EFFECT_KEY_SPACE],
) -> (Vec<([Option<usize>;3], f32, u8)>, u32) {
    // Retention is split into two independently-capped pools rather than one
    // combined top-TOP_GROUP_RESULTS list ranked by (covered_count, points).
    // A coverage-first ranking is correct for atLeast-only must-haves (more
    // coverage is strictly better), but it starves atMost/exact constraints:
    // satisfying "key X exactly N times" across the full 6-slot combo can
    // require THIS group to contribute ZERO occurrences of X (because the
    // other group already covers it), yet a coverage-first ranking always
    // ranks any covering triple above a zero-covering one regardless of
    // points. If enough triples happen to cover X, zero-coverage triples get
    // squeezed out of the pool entirely, leaving no valid pairing at the
    // merge step even though one exists. `pts_results` is a coverage-blind,
    // points-only reserved half, so zero-coverage triples always have room
    // to survive alongside the coverage-favoring half.
    const COV_CAP: usize = TOP_GROUP_RESULTS / 2;
    const PTS_CAP: usize = TOP_GROUP_RESULTS - COV_CAP;
    let mut cov_results: Vec<([Option<usize>;3], f32, u8)> = Vec::with_capacity(COV_CAP);
    let mut pts_results: Vec<([Option<usize>;3], f32, u8)> = Vec::with_capacity(PTS_CAP);
    let mut local_seen: HashSet<u32> = HashSet::new();
    let mut cov_min_tracker: (usize, (u8, f32)) = (0, (u8::MAX, f32::INFINITY));
    let mut pts_min_tracker: (usize, f32) = (0, f32::INFINITY);
    let mut score_ctx = ScoreContext::new();
    let mut checked_local: u32 = 0;

    for anchor_slot in 0..3 {
        let color_req_anchor = group_slots[anchor_slot] as usize;
        if color_req_anchor >= COLOR_SPACE { continue; }
        // Prefer candidates (relics containing selected effects). If none exist for this group/color,
        // fall back to all relics for that color so this group can still be populated as a filler.
        let anchor_candidates_cand: &Vec<usize> = if color_req_anchor == ANY_COLOR {
            unsafe { by_color_cand.get_unchecked(ANY_COLOR) }
        } else {
            unsafe { by_color_cand.get_unchecked(color_req_anchor) }
        };
        let anchor_candidates_all: &Vec<usize> = if color_req_anchor == ANY_COLOR {
            unsafe { by_color_all.get_unchecked(ANY_COLOR) }
        } else if color_req_anchor < COLOR_SPACE {
            unsafe { by_color_all.get_unchecked(color_req_anchor) }
        } else { &EMPTY_VEC };
        // Change: always use all relics, not only candidates
        let anchor_candidates: &Vec<usize> = anchor_candidates_all;
        if anchor_candidates.is_empty() { continue; }
        let other_slots: [usize; 2] = match anchor_slot { 0 => [1,2], 1 => [0,2], _ => [0,1] };
        let list_a: &Vec<usize> = { let c = group_slots[other_slots[0]] as usize; if c == ANY_COLOR { unsafe { by_color_all.get_unchecked(ANY_COLOR) } } else if c < COLOR_SPACE { unsafe { by_color_all.get_unchecked(c) } } else { &EMPTY_VEC } };
        let list_b: &Vec<usize> = { let c = group_slots[other_slots[1]] as usize; if c == ANY_COLOR { unsafe { by_color_all.get_unchecked(ANY_COLOR) } } else if c < COLOR_SPACE { unsafe { by_color_all.get_unchecked(c) } } else { &EMPTY_VEC } };
        for &cand_idx in anchor_candidates.iter() {
            let valid_a: Vec<usize> = list_a.iter().copied().filter(|&i| i != cand_idx).collect();
            let valid_b: Vec<usize> = list_b.iter().copied().filter(|&i| i != cand_idx).collect();
            let mut emit = |a_opt: Option<usize>, b_opt: Option<usize>| {
                if let (Some(a_i), Some(b_i)) = (a_opt, b_opt) { if a_i == b_i { return; } }
                let mut group_indices: [Option<usize>;3] = [None,None,None];
                group_indices[anchor_slot] = Some(cand_idx);
                group_indices[other_slots[0]] = a_opt;
                group_indices[other_slots[1]] = b_opt;
                checked_local += 1;
                record_progress(checked_local);

                // Calculate points for this group in isolation (other group empty)
                let mut full_indices6: [Option<usize>;6] = [None;6];
                if is_deep_group { full_indices6[3] = group_indices[0]; full_indices6[4] = group_indices[1]; full_indices6[5] = group_indices[2]; }
                else { full_indices6[0] = group_indices[0]; full_indices6[1] = group_indices[1]; full_indices6[2] = group_indices[2]; }

                if damage_mode && is_deep_group && combination_has_excluded_demerit(&full_indices6, relics_deep, excluded_demerits) { return; }

                let points = if damage_mode {
                    calc_damage(
                        nightfarer,
                        full_indices6,
                        relics_normal,
                        relics_deep,
                        damage_mults,
                        &mut score_ctx,
                    )
                } else {
                    calc_points(
                        nightfarer,
                        full_indices6,
                        relics_normal,
                        relics_deep,
                        selected_bitmap,
                        recommended_bitmap,
                        &mut score_ctx,
                    )
                };

                // A must-have effect may carry no damage multiplier at all, so its
                // triples would otherwise lose every points-only pruning contest and
                // never survive to the final 6-slot merge. Rank triples covering more
                // distinct required keys above ones covering fewer so top-K pruning
                // can never discard the only triple capable of jointly satisfying
                // several must-have ranges in favor of a higher-damage triple that
                // only covers one of them.
                let covered_count = if damage_mode {
                    triple_covered_key_count(
                        &full_indices6, relics_normal, relics_deep, nightfarer, range_keys,
                        selected_groups_by_key, selected_levels_by_key, selected_match_mode_by_key
                    )
                } else { 0 };
                let this_priority = (covered_count, points);

                let unique_key = pack_triple_key(group_indices);
                if !local_seen.insert(unique_key) { return; }

                // Coverage-favoring pool (existing behavior, halved capacity).
                if cov_results.len() < COV_CAP {
                    cov_results.push((group_indices, points, covered_count));
                    if triple_key_less(this_priority, cov_min_tracker.1) {
                        cov_min_tracker = (cov_results.len() - 1, this_priority);
                    }
                } else if triple_key_less(cov_min_tracker.1, this_priority) {
                    let min_i = cov_min_tracker.0;
                    cov_results[min_i] = (group_indices, points, covered_count);
                    let mut new_min_i = 0usize;
                    let mut new_min_p = (cov_results[0].2, cov_results[0].1);
                    for (i, r) in cov_results.iter().enumerate().skip(1) {
                        let p = (r.2, r.1);
                        if triple_key_less(p, new_min_p) { new_min_p = p; new_min_i = i; }
                    }
                    cov_min_tracker = (new_min_i, new_min_p);
                }

                // Points-only pool, coverage-blind: guarantees zero-coverage
                // triples always have a reserved place regardless of how many
                // higher-coverage triples exist elsewhere in this group.
                if pts_results.len() < PTS_CAP {
                    pts_results.push((group_indices, points, covered_count));
                    if points < pts_min_tracker.1 {
                        pts_min_tracker = (pts_results.len() - 1, points);
                    }
                } else if points > pts_min_tracker.1 {
                    let min_i = pts_min_tracker.0;
                    pts_results[min_i] = (group_indices, points, covered_count);
                    let mut new_min_i = 0usize;
                    let mut new_min_p = pts_results[0].1;
                    for (i, r) in pts_results.iter().enumerate().skip(1) {
                        if r.1 < new_min_p { new_min_p = r.1; new_min_i = i; }
                    }
                    pts_min_tracker = (new_min_i, new_min_p);
                }
            };
            if valid_a.is_empty() && valid_b.is_empty() { emit(None, None); }
            else if !valid_a.is_empty() && !valid_b.is_empty() {
                let mut any_pair = false;
                for &a in &valid_a { for &b in &valid_b { if a == b { continue; } emit(Some(a), Some(b)); any_pair = true; } }
                if !any_pair { emit(Some(valid_a[0]), None); }
            } else if !valid_a.is_empty() { for &a in &valid_a { emit(Some(a), None); } } else { for &b in &valid_b { emit(None, Some(b)); } }
        }
    }

    // Merge both pools. A triple can legitimately appear in both (it was good
    // enough on points alone AND on coverage) - that's fine, the merge/final
    // range check downstream dedupes full 6-slot combinations independently.
    let mut local_results = cov_results;
    local_results.extend(pts_results);

    // Ensure at least an empty triple so merging can still happen when this group has no relics
    if local_results.is_empty() { local_results.push(([None, None, None], 0.0, 0)); }

    (local_results, checked_local)
}

#[wasm_bindgen]
pub fn search_combinations(input: JsValue) -> JsValue {
    PROGRESS_COUNTER.store(0, Ordering::Relaxed);
    let input: SearchInput = match serde_wasm_bindgen::from_value(input) {
        Ok(v) => v,
        Err(_) => { return serde_wasm_bindgen::to_value(&SearchOutput { combinations: vec![], total_combinations_checked: 0 }).unwrap(); }
    };
    // Soft validation (avoid panics which produce unreachable)
    if input.selected_effects.len() > SELECTED_EFFECTS_SPACE || input.recommended_effects.len() > RECOMMENDED_EFFECTS_SPACE { return serde_wasm_bindgen::to_value(&SearchOutput { combinations: vec![], total_combinations_checked: 0 }).unwrap(); }

    let damage_mode = input.damage_multipliers.is_some();
    let damage_mults: Vec<f32> = input.damage_multipliers.clone().unwrap_or_default();
    // Soft validation: `calc_damage` indexes `damage_mults` with `get_unchecked(k)` for
    // k up to EFFECT_KEY_SPACE-1, relying on the Vec actually having that many elements.
    // A shorter Vec supplied by the JS caller would be an out-of-bounds read (UB), not a
    // panic, so reject it here before any scoring happens.
    if damage_mode && !damage_multipliers_valid(&damage_mults) {
        return serde_wasm_bindgen::to_value(&SearchOutput { combinations: vec![], total_combinations_checked: 0 }).unwrap();
    }
    let excluded_demerits: Vec<u32> = input.excluded_demerit_keys.clone().unwrap_or_default();

    let mut selected_bitmap = [false; EFFECT_KEY_SPACE];
    for e in &input.selected_effects { let k = e.key as usize; if k < EFFECT_KEY_SPACE { unsafe { *selected_bitmap.get_unchecked_mut(k) = true; } } }

    // Build fast lookup arrays for selected effect group/level by key
    let mut selected_groups_by_key = [u8::MAX; EFFECT_KEY_SPACE];
    let mut selected_levels_by_key = [u8::MAX; EFFECT_KEY_SPACE];
    for e in &input.selected_effects {
        let k = e.key as usize;
        if k < EFFECT_KEY_SPACE {
            if let Some(g) = e.group { unsafe { *selected_groups_by_key.get_unchecked_mut(k) = g; } }
            if let Some(l) = e.level { unsafe { *selected_levels_by_key.get_unchecked_mut(k) = l; } }
        }
    }

    // Match-mode is a per-must-have setting, sourced from
    // input.selected_effect_ranges (not input.selected_effects, which only
    // carries each effect's own group/level) — same per-key lookup shape,
    // different source array. Keys with no must-have range default to
    // MATCH_MODE_HIGHER_OR_EQUAL, matching the pre-match-mode behavior; this
    // default is never actually read for a key that isn't in `ranges_vec`
    // below, since combination_satisfies_ranges only ever looks up keys that
    // ARE range keys.
    let mut selected_match_mode_by_key = [MATCH_MODE_HIGHER_OR_EQUAL; EFFECT_KEY_SPACE];
    if let Some(ranges) = &input.selected_effect_ranges {
        for r in ranges {
            let k = r.effect_key as usize;
            if k < EFFECT_KEY_SPACE {
                selected_match_mode_by_key[k] = r.match_mode;
            }
        }
    }

    // Precompute ranges as tuples for faster checks
    let ranges_vec: Vec<(u32,u8,u8)> = match &input.selected_effect_ranges {
        Some(v) => v.iter().map(|r| (r.effect_key, r.min_stacks, r.max_stacks)).collect(),
        None => Vec::new(),
    };

    // Keys named by a must-have range (min_stacks > 0). In damage mode these
    // must also qualify a relic as a candidate — see is_damage_mode_candidate.
    let mut range_min_keys = [false; EFFECT_KEY_SPACE];
    let mut range_keys: Vec<u32> = Vec::new();
    for (k, min, _max) in &ranges_vec {
        if *min > 0 {
            let ku = *k as usize;
            if ku < EFFECT_KEY_SPACE { range_min_keys[ku] = true; }
            range_keys.push(*k);
        }
    }

    // Build candidate bitmaps for normal and deep relics
    let mut effect_candidates_norm: Vec<usize> = Vec::new();
    effect_candidates_norm.reserve(input.relics.len());
    let mut is_candidate_norm: Vec<bool> = vec![false; input.relics.len()];
    for (idx, relic) in input.relics.iter().enumerate() {
        let any_selected = if damage_mode {
            is_damage_mode_candidate(&relic.effects, input.nightfarer, &damage_mults, &range_min_keys)
        } else {
            relic.effects.iter().any(|e| {
                let k = e.key as usize;
                k < EFFECT_KEY_SPACE && unsafe { *selected_bitmap.get_unchecked(k) }
            })
        };
        if any_selected { effect_candidates_norm.push(idx); unsafe { *is_candidate_norm.get_unchecked_mut(idx) = true; } }
    }

    let mut effect_candidates_deep: Vec<usize> = Vec::new();
    effect_candidates_deep.reserve(input.deep_relics.len());
    let mut is_candidate_deep: Vec<bool> = vec![false; input.deep_relics.len()];
    for (idx, relic) in input.deep_relics.iter().enumerate() {
        let any_selected = if damage_mode {
            is_damage_mode_candidate(&relic.effects, input.nightfarer, &damage_mults, &range_min_keys)
        } else {
            relic.effects.iter().any(|e| {
                let k = e.key as usize;
                k < EFFECT_KEY_SPACE && unsafe { *selected_bitmap.get_unchecked(k) }
            })
        };
        if any_selected { effect_candidates_deep.push(idx); unsafe { *is_candidate_deep.get_unchecked_mut(idx) = true; } }
    }

    let mut recommended_bitmap = [false; EFFECT_KEY_SPACE];
    for e in &input.recommended_effects { let k = e.key as usize; if k < EFFECT_KEY_SPACE { unsafe { *recommended_bitmap.get_unchecked_mut(k) = true; } } }

    // Build by-color indices for normal relics
    let relics_len = input.relics.len();
    let all_indices_norm: Vec<usize> = (0..relics_len).collect();
    let mut by_color_all_norm: Vec<Vec<usize>> = vec![Vec::new(); COLOR_SPACE];
    for (idx, relic) in input.relics.iter().enumerate() { if let Some(color) = relic.color { let c = color as usize; if c != ANY_COLOR && c < COLOR_SPACE { by_color_all_norm[c].push(idx); } } }
    by_color_all_norm[ANY_COLOR] = all_indices_norm.clone();

    let mut by_color_cand_norm: Vec<Vec<usize>> = vec![Vec::new(); COLOR_SPACE];
    by_color_cand_norm[ANY_COLOR] = effect_candidates_norm.clone();
    for c in 1usize..COLOR_SPACE { let list = &by_color_all_norm[c]; if list.is_empty() { continue; } let mut v = Vec::with_capacity(list.len()); for &idx in list { if unsafe { *is_candidate_norm.get_unchecked(idx) } { v.push(idx); } } by_color_cand_norm[c] = v; }

    // Build by-color indices for deep relics
    let deep_len = input.deep_relics.len();
    let all_indices_deep: Vec<usize> = (0..deep_len).collect();
    let mut by_color_all_deep: Vec<Vec<usize>> = vec![Vec::new(); COLOR_SPACE];
    for (idx, relic) in input.deep_relics.iter().enumerate() { if let Some(color) = relic.color { let c = color as usize; if c != ANY_COLOR && c < COLOR_SPACE { by_color_all_deep[c].push(idx); } } }
    by_color_all_deep[ANY_COLOR] = all_indices_deep.clone();

    let mut by_color_cand_deep: Vec<Vec<usize>> = vec![Vec::new(); COLOR_SPACE];
    by_color_cand_deep[ANY_COLOR] = effect_candidates_deep.clone();
    for c in 1usize..COLOR_SPACE { let list = &by_color_all_deep[c]; if list.is_empty() { continue; } let mut v = Vec::with_capacity(list.len()); for &idx in list { if unsafe { *is_candidate_deep.get_unchecked(idx) } { v.push(idx); } } by_color_cand_deep[c] = v; }

    // Parallelize over vessels (avoid cloning large vectors)
    let enabled_vessels = &input.enabled_vessels;
    let relics_normal: &[RelicSlot] = &input.relics;
    let relics_deep: &[RelicSlot] = &input.deep_relics;
    let nightfarer = input.nightfarer;

    let per_vessel: Vec<(Vec<VesselCombinationResultEntry>, u32)> = enabled_vessels.par_iter().enumerate().map(|(v_i, vessel_slots)| {
        let mut local_results: Vec<VesselCombinationResultEntry> = Vec::with_capacity(TOP_RESULTS);
        let mut local_seen: HashSet<u64> = HashSet::new();
        let mut min_tracker: (usize, f32) = (0, f32::INFINITY);
        let mut checked_local: u32 = 0;

        // Split vessel slots into normal (0..2) and deep (3..5)
        let norm_slots: [u8;3] = [vessel_slots[0], vessel_slots[1], vessel_slots[2]];
        let deep_slots: [u8;3] = [vessel_slots[3], vessel_slots[4], vessel_slots[5]];

        // Search triples within each group
        let (norm_triples, checked_norm) = search_group_triples(
            norm_slots,
            &by_color_all_norm,
            &by_color_cand_norm,
            relics_normal,
            relics_deep,
            false,
            nightfarer,
            &selected_bitmap,
            &recommended_bitmap,
            damage_mode,
            &damage_mults,
            &excluded_demerits,
            &range_keys,
            &selected_groups_by_key,
            &selected_levels_by_key,
            &selected_match_mode_by_key,
        );
        checked_local += checked_norm;

        let (deep_triples, checked_deep) = search_group_triples(
            deep_slots,
            &by_color_all_deep,
            &by_color_cand_deep,
            relics_normal,
            relics_deep,
            true,
            nightfarer,
            &selected_bitmap,
            &recommended_bitmap,
            damage_mode,
            &damage_mults,
            &excluded_demerits,
            &range_keys,
            &selected_groups_by_key,
            &selected_levels_by_key,
            &selected_match_mode_by_key,
        );
        checked_local += checked_deep;

        // Merge the two groups and score full 6-slot combinations
        let mut score_ctx = ScoreContext::new();
        for (norm_idxs, _, _) in norm_triples.iter() {
            for (deep_idxs, _, _) in deep_triples.iter() {
                let relic_indices6: [Option<usize>;6] = [
                    norm_idxs[0], norm_idxs[1], norm_idxs[2],
                    deep_idxs[0], deep_idxs[1], deep_idxs[2],
                ];
                checked_local += 1;
                record_progress(checked_local);
                add_combination_if_unique6(
                    &mut local_results,
                    &mut local_seen,
                    v_i,
                    relic_indices6,
                    relics_normal,
                    relics_deep,
                    nightfarer,
                    &selected_bitmap,
                    &recommended_bitmap,
                    &mut min_tracker,
                    &mut score_ctx,
                    &ranges_vec,
                    &selected_groups_by_key,
                    &selected_levels_by_key,
                    &selected_match_mode_by_key,
                    damage_mode,
                    &damage_mults,
                    &excluded_demerits,
                );
            }
        }

        (local_results, checked_local)
    }).collect();

    // Merge results with global deduplication across vessels
    let mut results_map: std::collections::HashMap<u64, usize> = std::collections::HashMap::new();
    let mut results: Vec<VesselCombinationResultEntry> = Vec::new();
    let mut total_checked: u32 = 0;
    for (mut local, checked) in per_vessel.into_iter() {
        total_checked += checked;
        for entry in local.drain(..) {
            let key = generate_unique_key6(entry.relic_indices);
            if let Some(&i) = results_map.get(&key) {
                if entry.points > results[i].points {
                    results[i] = entry;
                }
            } else {
                results_map.insert(key, results.len());
                results.push(entry);
            }
        }
    }
    results.sort_by(|a,b| b.points.partial_cmp(&a.points).unwrap());
    if results.len() > TOP_RESULTS { results.truncate(TOP_RESULTS); }

    serde_wasm_bindgen::to_value(&SearchOutput { combinations: results, total_combinations_checked: total_checked }).unwrap()
}

// Fallback empty vec for invalid colors in parallel loops
static EMPTY_VEC: Vec<usize> = Vec::new();

#[cfg(test)]
mod damage_tests {
    use super::*;
    fn relic(effects: Vec<(u32, Option<bool>, Option<u8>)>) -> RelicSlot {
        RelicSlot { color: Some(1), effects: effects.into_iter().map(|(key, stacks, nf)| Effect {
            key, nightfarer: nf, stacks, group: None, level: None, startingBonus: None, r#type: None,
        }).collect() }
    }
    // A relic carrying one stackable, grouped/leveled effect (e.g. a tiered
    // "attack power +N" effect), for tests exercising same-group-higher-tier
    // matching.
    fn tiered_relic(key: u32, group: u8, level: u8) -> RelicSlot {
        RelicSlot { color: Some(1), effects: vec![Effect {
            key, nightfarer: None, stacks: Some(true), group: Some(group), level: Some(level),
            startingBonus: None, r#type: None,
        }] }
    }
    fn mults(pairs: &[(usize, f32)]) -> Vec<f32> {
        let mut m = vec![1.0f32; EFFECT_KEY_SPACE];
        for &(k, v) in pairs { m[k] = v; }
        m
    }

    #[test]
    fn stacks_true_multiplies_each_occurrence() {
        let normal = vec![relic(vec![(10, Some(true), None)]), relic(vec![(10, Some(true), None)])];
        let deep: Vec<RelicSlot> = vec![];
        let m = mults(&[(10, 1.1)]);
        let idx: [Option<usize>;6] = [Some(0), Some(1), None, None, None, None];
        let mut ctx = ScoreContext::new();
        let p = calc_damage(0, idx, &normal, &deep, &m, &mut ctx);
        assert!((p - 1.1f32 * 1.1f32).abs() < 1e-5);
    }

    #[test]
    fn stacks_false_multiplies_once() {
        let normal = vec![relic(vec![(10, Some(false), None)]), relic(vec![(10, Some(false), None)])];
        let deep: Vec<RelicSlot> = vec![];
        let m = mults(&[(10, 1.15)]);
        let idx: [Option<usize>;6] = [Some(0), Some(1), None, None, None, None];
        let mut ctx = ScoreContext::new();
        let p = calc_damage(0, idx, &normal, &deep, &m, &mut ctx);
        assert!((p - 1.15f32).abs() < 1e-5);
    }

    #[test]
    fn nightfarer_mismatch_ignored_and_irrelevant_ignored() {
        let normal = vec![relic(vec![(10, Some(true), Some(3)), (20, Some(true), None)])];
        let deep: Vec<RelicSlot> = vec![];
        let m = mults(&[(10, 1.5) /* nf-exclusive, wrong nf */]); // key 20 stays 1.0
        let idx: [Option<usize>;6] = [Some(0), None, None, None, None, None];
        let mut ctx = ScoreContext::new();
        let p = calc_damage(0 /* nightfarer 0 != 3 */, idx, &normal, &deep, &m, &mut ctx);
        assert!((p - 1.0f32).abs() < 1e-5);
    }

    #[test]
    fn quantity_only_musthave_relic_is_a_candidate() {
        // Effect key 30 has NO damage multiplier (stays 1.0) but is named by a
        // must-have range (min_stacks > 0). It must still be treated as a
        // damage-mode search candidate so the range constraint is satisfiable.
        let effects = vec![Effect {
            key: 30, nightfarer: None, stacks: Some(true), group: None, level: None,
            startingBonus: None, r#type: None,
        }];
        let damage_mults = mults(&[(10, 1.1)]); // key 30 stays 1.0
        let mut range_min_keys = [false; EFFECT_KEY_SPACE];
        range_min_keys[30] = true;
        assert!(is_damage_mode_candidate(&effects, 0, &damage_mults, &range_min_keys));

        // Sanity: without the range-min flag, a non-damage effect is NOT a candidate.
        let range_min_keys_empty = [false; EFFECT_KEY_SPACE];
        assert!(!is_damage_mode_candidate(&effects, 0, &damage_mults, &range_min_keys_empty));
    }

    #[test]
    fn damage_multipliers_valid_rejects_short_vec_and_accepts_full_vec() {
        // A Vec shorter than EFFECT_KEY_SPACE must be rejected: calc_damage's
        // get_unchecked(k) reads up to index EFFECT_KEY_SPACE-1, so anything shorter
        // would be an out-of-bounds read (UB) rather than a panic.
        let short = vec![1.0f32; EFFECT_KEY_SPACE - 1];
        assert!(!damage_multipliers_valid(&short));

        let empty: Vec<f32> = vec![];
        assert!(!damage_multipliers_valid(&empty));

        let full = vec![1.0f32; EFFECT_KEY_SPACE];
        assert!(damage_multipliers_valid(&full));

        let longer = vec![1.0f32; EFFECT_KEY_SPACE + 5];
        assert!(damage_multipliers_valid(&longer));
    }

    #[test]
    fn musthave_triple_survives_top_k_pruning_against_many_higher_damage_triples() {
        // Regression test for a real bug: search_group_triples pruned its
        // per-group top-TOP_GROUP_RESULTS(200) list purely by damage points. A
        // must-have effect with no damage multiplier (points stays 1.0) always
        // lost that contest against filler relics that carry a real damage
        // multiplier, so with >= TOP_GROUP_RESULTS higher-scoring fillers of the
        // same color, the only relic satisfying the must-have was evicted before
        // ever reaching the merge/range-check step, producing zero search
        // results even though a valid combination existed.
        const FILLER_COUNT: usize = TOP_GROUP_RESULTS + 50;

        // key 10 carries a real damage multiplier; every filler relic has it.
        // key 30 is the must-have: no damage multiplier (stays 1.0 in `mults`).
        let mut normal: Vec<RelicSlot> = (0..FILLER_COUNT)
            .map(|_| relic(vec![(10, Some(true), None)]))
            .collect();
        let musthave_relic_idx = normal.len();
        normal.push(relic(vec![(30, Some(true), None)]));

        let by_color_all_norm: Vec<Vec<usize>> =
            vec![(0..normal.len()).collect::<Vec<usize>>(); COLOR_SPACE];
        // by_color_cand is a dead parameter for anchoring (search_group_triples
        // always anchors from by_color_all — see the "always use all relics"
        // comment at its call site); pass a same-shaped placeholder.
        let by_color_cand_norm = by_color_all_norm.clone();

        let damage_mults = mults(&[(10, 1.5)]); // key 30 stays 1.0 (no damage contribution)
        let range_keys: Vec<u32> = vec![30];

        let selected_bitmap = [false; EFFECT_KEY_SPACE];
        let recommended_bitmap = [false; EFFECT_KEY_SPACE];
        let deep: Vec<RelicSlot> = vec![];
        let excluded_demerits: Vec<u32> = vec![];
        let norm_slots: [u8; 3] = [1, 1, 1]; // all Red, matches relic() color

        let (triples, _checked) = search_group_triples(
            norm_slots,
            &by_color_all_norm,
            &by_color_cand_norm,
            &normal,
            &deep,
            false, // is_deep_group
            0,     // nightfarer
            &selected_bitmap,
            &recommended_bitmap,
            true, // damage_mode
            &damage_mults,
            &excluded_demerits,
            &range_keys,
            &[u8::MAX; EFFECT_KEY_SPACE],
            &[u8::MAX; EFFECT_KEY_SPACE],
            &[MATCH_MODE_HIGHER_OR_EQUAL; EFFECT_KEY_SPACE],
        );

        assert!(triples.len() <= TOP_GROUP_RESULTS, "must not exceed the cap");
        let has_musthave_triple = triples.iter().any(|(indices, _points, covered_count)| {
            *covered_count > 0 && indices.iter().any(|i| *i == Some(musthave_relic_idx))
        });
        assert!(
            has_musthave_triple,
            "the only relic carrying the must-have effect was pruned away by \
             {FILLER_COUNT} higher-damage fillers despite TOP_GROUP_RESULTS pruning \
             being must-have-aware"
        );
    }

    #[test]
    fn triple_covering_two_distinct_musthave_keys_survives_pruning_against_single_key_fillers() {
        // Regression test for a real bug: search_group_triples' retention
        // priority is a single "carries ANY must-have" boolean, not which
        // required key(s) a triple actually covers. With multiple distinct
        // must-have keys requested, a triple that jointly covers two
        // different required keys (needed together to satisfy both ranges)
        // can be outranked purely on damage points by triples that only
        // cover one of the keys - even though those single-key triples can
        // never help satisfy the other requirement. Enough high-damage
        // single-key fillers evict the only triple covering both keys
        // before the merge/range-check step, producing zero search results
        // even though a valid full combination exists.
        const NOISE_COUNT: usize = TOP_GROUP_RESULTS + 50;

        // Every noise relic carries required key 30 (redundantly - many
        // other relics already cover it) plus a real damage multiplier, so
        // noise-only triples always outscore any triple needing the rare
        // relic below.
        let mut normal: Vec<RelicSlot> = (0..NOISE_COUNT)
            .map(|_| relic(vec![(10, Some(true), None), (30, Some(true), None)]))
            .collect();
        // The only relic carrying required key 31 - no damage multiplier,
        // so any triple including it scores lower than pure-noise triples.
        let rare_relic_idx = normal.len();
        normal.push(relic(vec![(31, Some(true), None)]));

        let by_color_all_norm: Vec<Vec<usize>> =
            vec![(0..normal.len()).collect::<Vec<usize>>(); COLOR_SPACE];
        let by_color_cand_norm = by_color_all_norm.clone();

        let damage_mults = mults(&[(10, 1.5)]); // keys 30/31 stay 1.0
        let range_keys: Vec<u32> = vec![30, 31];

        let selected_bitmap = [false; EFFECT_KEY_SPACE];
        let recommended_bitmap = [false; EFFECT_KEY_SPACE];
        let deep: Vec<RelicSlot> = vec![];
        let excluded_demerits: Vec<u32> = vec![];
        let norm_slots: [u8; 3] = [1, 1, 1];

        let (triples, _checked) = search_group_triples(
            norm_slots,
            &by_color_all_norm,
            &by_color_cand_norm,
            &normal,
            &deep,
            false,
            0,
            &selected_bitmap,
            &recommended_bitmap,
            true,
            &damage_mults,
            &excluded_demerits,
            &range_keys,
            &[u8::MAX; EFFECT_KEY_SPACE],
            &[u8::MAX; EFFECT_KEY_SPACE],
            &[MATCH_MODE_HIGHER_OR_EQUAL; EFFECT_KEY_SPACE],
        );

        assert!(triples.len() <= TOP_GROUP_RESULTS, "must not exceed the cap");
        let has_both_keys_triple = triples.iter().any(|(indices, _points, _carries_mh)| {
            let mut has30 = false;
            let mut has31 = false;
            for opt in indices.iter() {
                if let Some(idx) = opt {
                    for eff in &normal[*idx].effects {
                        if eff.key == 30 { has30 = true; }
                        if eff.key == 31 { has31 = true; }
                    }
                }
            }
            has30 && has31
        });
        assert!(
            has_both_keys_triple,
            "the only triple covering both required keys (30 and 31, via relic \
             {rare_relic_idx}) was pruned away by {NOISE_COUNT} higher-damage \
             triples that only cover key 30"
        );
    }

    #[test]
    fn musthave_triple_covered_via_higher_tier_survives_pruning_against_lower_tier_fillers() {
        // Regression test for a real bug: triple_covered_key_count matched a
        // required must-have key by exact effect.key equality only, unlike
        // combination_satisfies_ranges' final check, which also accepts a
        // same-group, equal-or-higher stackable tier (e.g. a must-have on
        // "attack power +3" is satisfied by a relic carrying only "+4"). A
        // triple satisfying the requirement solely via a higher tier got
        // covered_count == 0 and lost every pruning contest against fillers
        // that happen to carry the exact literal key, even when those
        // fillers score no higher on damage points - so the only
        // tier-satisfying relic could be evicted from the top-K cap before
        // the merge/range-check step ever ran.
        const FILLER_COUNT: usize = TOP_GROUP_RESULTS + 50;
        const GROUP: u8 = 7;
        const REQUIRED_KEY: u32 = 40; // "tier 3" of the group
        const REQUIRED_LEVEL: u8 = 3;
        const HIGHER_TIER_KEY: u32 = 41; // "tier 4" of the same group

        // Every filler relic carries the exact required key (tier 3) but no
        // damage multiplier either - so fillers and the tiered relic tie on
        // points (both stay at 1.0), isolating the coverage-based retention
        // bonus as the only thing that can save the tiered relic from pure
        // enumeration-order eviction.
        let mut normal: Vec<RelicSlot> = (0..FILLER_COUNT)
            .map(|_| tiered_relic(REQUIRED_KEY, GROUP, REQUIRED_LEVEL))
            .collect();
        let tiered_relic_idx = normal.len();
        normal.push(tiered_relic(HIGHER_TIER_KEY, GROUP, REQUIRED_LEVEL + 1));

        let by_color_all_norm: Vec<Vec<usize>> =
            vec![(0..normal.len()).collect::<Vec<usize>>(); COLOR_SPACE];
        let by_color_cand_norm = by_color_all_norm.clone();

        let damage_mults = mults(&[]); // keys 40/41 stay 1.0 - pure coverage contest
        let range_keys: Vec<u32> = vec![REQUIRED_KEY];

        // Precomputed the same way search_combinations does from
        // input.selected_effects: the required key's OWN group/level.
        let mut selected_groups_by_key = [u8::MAX; EFFECT_KEY_SPACE];
        let mut selected_levels_by_key = [u8::MAX; EFFECT_KEY_SPACE];
        selected_groups_by_key[REQUIRED_KEY as usize] = GROUP;
        selected_levels_by_key[REQUIRED_KEY as usize] = REQUIRED_LEVEL;
        let mut selected_match_mode_by_key = [MATCH_MODE_HIGHER_OR_EQUAL; EFFECT_KEY_SPACE];
        // (this test only needs the default "higherOrEqual" behavior it's
        // named after; no explicit per-key override needed)

        let selected_bitmap = [false; EFFECT_KEY_SPACE];
        let recommended_bitmap = [false; EFFECT_KEY_SPACE];
        let deep: Vec<RelicSlot> = vec![];
        let excluded_demerits: Vec<u32> = vec![];
        let norm_slots: [u8; 3] = [1, 1, 1];

        let (triples, _checked) = search_group_triples(
            norm_slots,
            &by_color_all_norm,
            &by_color_cand_norm,
            &normal,
            &deep,
            false,
            0,
            &selected_bitmap,
            &recommended_bitmap,
            true,
            &damage_mults,
            &excluded_demerits,
            &range_keys,
            &selected_groups_by_key,
            &selected_levels_by_key,
            &selected_match_mode_by_key,
        );

        assert!(triples.len() <= TOP_GROUP_RESULTS, "must not exceed the cap");
        let has_tiered_triple = triples.iter().any(|(indices, _points, covered_count)| {
            *covered_count > 0 && indices.iter().any(|i| *i == Some(tiered_relic_idx))
        });
        assert!(
            has_tiered_triple,
            "the only relic satisfying the must-have via a higher tier (key \
             {HIGHER_TIER_KEY}, tier {}, vs required key {REQUIRED_KEY} tier \
             {REQUIRED_LEVEL}) was pruned away by {FILLER_COUNT} exact-key \
             fillers despite tying on damage points",
            REQUIRED_LEVEL + 1
        );
    }

    #[test]
    fn effect_satisfies_key_exact_mode_rejects_higher_tier() {
        const GROUP: u8 = 7;
        const REQUIRED_KEY: u32 = 40;
        const REQUIRED_LEVEL: u8 = 3;
        const HIGHER_TIER_KEY: u32 = 41;

        let mut selected_groups_by_key = [u8::MAX; EFFECT_KEY_SPACE];
        let mut selected_levels_by_key = [u8::MAX; EFFECT_KEY_SPACE];
        let mut selected_match_mode_by_key = [MATCH_MODE_HIGHER_OR_EQUAL; EFFECT_KEY_SPACE];
        selected_groups_by_key[REQUIRED_KEY as usize] = GROUP;
        selected_levels_by_key[REQUIRED_KEY as usize] = REQUIRED_LEVEL;
        selected_match_mode_by_key[REQUIRED_KEY as usize] = MATCH_MODE_EXACT;

        let higher_tier_effect = Effect {
            key: HIGHER_TIER_KEY, nightfarer: None, stacks: Some(true),
            group: Some(GROUP), level: Some(REQUIRED_LEVEL + 1),
            startingBonus: None, r#type: None,
        };
        assert!(!effect_satisfies_key(&higher_tier_effect, REQUIRED_KEY, &selected_groups_by_key, &selected_levels_by_key, &selected_match_mode_by_key));

        let exact_effect = Effect {
            key: REQUIRED_KEY, nightfarer: None, stacks: Some(true),
            group: Some(GROUP), level: Some(REQUIRED_LEVEL),
            startingBonus: None, r#type: None,
        };
        assert!(effect_satisfies_key(&exact_effect, REQUIRED_KEY, &selected_groups_by_key, &selected_levels_by_key, &selected_match_mode_by_key));
    }

    #[test]
    fn effect_satisfies_key_lower_or_equal_mode_accepts_lower_tier_rejects_higher() {
        const GROUP: u8 = 7;
        const REQUIRED_KEY: u32 = 40;
        const REQUIRED_LEVEL: u8 = 3;
        const LOWER_TIER_KEY: u32 = 39;
        const HIGHER_TIER_KEY: u32 = 41;

        let mut selected_groups_by_key = [u8::MAX; EFFECT_KEY_SPACE];
        let mut selected_levels_by_key = [u8::MAX; EFFECT_KEY_SPACE];
        let mut selected_match_mode_by_key = [MATCH_MODE_HIGHER_OR_EQUAL; EFFECT_KEY_SPACE];
        selected_groups_by_key[REQUIRED_KEY as usize] = GROUP;
        selected_levels_by_key[REQUIRED_KEY as usize] = REQUIRED_LEVEL;
        selected_match_mode_by_key[REQUIRED_KEY as usize] = MATCH_MODE_LOWER_OR_EQUAL;

        let lower_tier_effect = Effect {
            key: LOWER_TIER_KEY, nightfarer: None, stacks: Some(true),
            group: Some(GROUP), level: Some(REQUIRED_LEVEL - 1),
            startingBonus: None, r#type: None,
        };
        assert!(effect_satisfies_key(&lower_tier_effect, REQUIRED_KEY, &selected_groups_by_key, &selected_levels_by_key, &selected_match_mode_by_key));

        let higher_tier_effect = Effect {
            key: HIGHER_TIER_KEY, nightfarer: None, stacks: Some(true),
            group: Some(GROUP), level: Some(REQUIRED_LEVEL + 1),
            startingBonus: None, r#type: None,
        };
        assert!(!effect_satisfies_key(&higher_tier_effect, REQUIRED_KEY, &selected_groups_by_key, &selected_levels_by_key, &selected_match_mode_by_key));
    }

    #[test]
    fn combination_satisfies_ranges_exact_mode_end_to_end() {
        // Full final-check test (not just the effect_satisfies_key unit): a
        // combination carrying only a higher-tier relic must be REJECTED
        // under matchMode exact, even though the same setup would PASS under
        // higherOrEqual.
        const GROUP: u8 = 7;
        const REQUIRED_KEY: u32 = 40;
        const REQUIRED_LEVEL: u8 = 3;
        const HIGHER_TIER_KEY: u32 = 41;

        let normal = vec![tiered_relic(HIGHER_TIER_KEY, GROUP, REQUIRED_LEVEL + 1)];
        let deep: Vec<RelicSlot> = vec![];
        let idx: [Option<usize>; 6] = [Some(0), None, None, None, None, None];

        let mut selected_groups_by_key = [u8::MAX; EFFECT_KEY_SPACE];
        let mut selected_levels_by_key = [u8::MAX; EFFECT_KEY_SPACE];
        selected_groups_by_key[REQUIRED_KEY as usize] = GROUP;
        selected_levels_by_key[REQUIRED_KEY as usize] = REQUIRED_LEVEL;
        let ranges: Vec<(u32, u8, u8)> = vec![(REQUIRED_KEY, 1, 6)];

        let mut exact_mode = [MATCH_MODE_HIGHER_OR_EQUAL; EFFECT_KEY_SPACE];
        exact_mode[REQUIRED_KEY as usize] = MATCH_MODE_EXACT;
        assert!(!combination_satisfies_ranges(&idx, &normal, &deep, 0, &ranges, &selected_groups_by_key, &selected_levels_by_key, &exact_mode));

        let higher_or_equal_mode = [MATCH_MODE_HIGHER_OR_EQUAL; EFFECT_KEY_SPACE];
        assert!(combination_satisfies_ranges(&idx, &normal, &deep, 0, &ranges, &selected_groups_by_key, &selected_levels_by_key, &higher_or_equal_mode));
    }
}
