#!/usr/bin/env python3
"""SessionStart (source=clear) hook.

Finds the most recently modified handoff file under .claude/session-data/
and injects its path + content as additionalContext, so a new session
picks up where the previous one left off without the user having to say
"read <path> and continue".
"""
import json
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parents[2]
session_dir = root / ".claude" / "session-data"

if not session_dir.is_dir():
    sys.exit(0)

files = sorted(session_dir.glob("*.tmp"), key=lambda p: p.stat().st_mtime, reverse=True)
if not files:
    sys.exit(0)

latest = files[0]
content = latest.read_text(encoding="utf-8")

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": (
            f"直前のセッションのhandoffファイルが見つかりました: {latest.relative_to(root)}\n\n"
            f"{content}"
        ),
    }
}))
