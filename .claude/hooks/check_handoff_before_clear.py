#!/usr/bin/env python3
"""SessionEnd (reason=clear) hook.

Warns via systemMessage if no handoff file for today exists yet under
.claude/session-data/. Cannot block /clear (session is already ending) -
this is a safety-net reminder, not an enforcement mechanism.
"""
import datetime
import json
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parents[2]
session_dir = root / ".claude" / "session-data"
today = datetime.date.today().isoformat()

if session_dir.is_dir() and list(session_dir.glob(f"{today}-*.tmp")):
    sys.exit(0)

print(json.dumps({
    "systemMessage": "handoffファイルが見つかりません。/clear前に /handoff を実行することを推奨します。"
}))
