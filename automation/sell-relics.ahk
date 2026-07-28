; Relic Sell Automation
;
; Reads a JSON array of actions from the clipboard (written by the "Copy
; sell sequence" button in the Relic Browser web app) and replays it as key
; presses into the Elden Ring Nightreign window. Stops immediately after
; sending the final "Confirm" action - the actual in-game sell confirmation
; is always done by hand, never by this script.
;
; Usage: with the relic-sell screen open in-game and the cursor at the top
; -left slot (row 1, column 1), press F9.

#Requires AutoHotkey v2.0
#SingleInstance Force

GameWindowTitle := "ahk_exe nightreign.exe"
KeyDelayMs := 180

; Send() uses SendInput mode with zero key-hold time, which many DirectInput
; games (this one included, potentially) simply ignore. If keys aren't
; registering in-game during manual verification, try switching to
; SendEvent with an explicit hold time instead, e.g.:
;   SendMode("Event")
;   SetKeyDelay(-1, 30)
; before the Send() calls below - this sends real timed key-down/key-up
; events instead of a single low-level input packet.
ActionToKey := Map(
    "Up", "{Up}",
    "Down", "{Down}",
    "Left", "{Left}",
    "Right", "{Right}",
    "Select", "f",
    "Confirm", "3"
)

; Minimal parser for the flat JSON string-array shape buildSellKeySequence
; produces (e.g. ["Down","Right","Select","Confirm"]). Not a general JSON
; parser - deliberately only handles this one shape.
ParseActionArray(json) {
    actions := []
    pos := 1
    while (pos := RegExMatch(json, '"([A-Za-z]+)"', &m, pos)) {
        actions.Push(m[1])
        pos += m.Len[0]
    }
    return actions
}

ShowAbortTooltip(message) {
    ToolTip("Sell automation aborted: " message)
    SetTimer(() => ToolTip(), -2000)
}

F9:: {
    if !WinActive(GameWindowTitle) {
        ShowAbortTooltip("game window not active")
        return
    }

    clipboardText := A_Clipboard
    trimmedText := Trim(clipboardText)
    if (trimmedText = "") {
        ShowAbortTooltip("clipboard is empty")
        return
    }

    ; Cheap guard against replaying unrelated clipboard content: the
    ; payload must look like a JSON array and must end with a "Confirm"
    ; action, otherwise abort without sending anything.
    if (SubStr(trimmedText, 1, 1) != "[" || SubStr(trimmedText, -1) != "]") {
        ShowAbortTooltip("clipboard does not look like a sell sequence")
        return
    }

    actions := ParseActionArray(trimmedText)

    if (actions.Length = 0) {
        ShowAbortTooltip("no actions parsed from clipboard")
        return
    }

    if (actions[actions.Length] != "Confirm") {
        ShowAbortTooltip("parsed sequence does not end with Confirm")
        return
    }

    for action in actions {
        if !ActionToKey.Has(action) {
            ; Unrecognized action - abort rather than send something wrong.
            ShowAbortTooltip("unknown action '" action "'")
            return
        }
        if !WinActive(GameWindowTitle) {
            ; Window lost focus mid-sequence - abort rather than send keys
            ; into whatever else is now focused.
            ShowAbortTooltip("game window lost focus mid-sequence")
            return
        }
        Send(ActionToKey[action])
        Sleep(KeyDelayMs)
    }
}
