@echo off
REM Double-click this to start the Relic Browser dev server and the
REM sell-relics automation script together.
cd /d "%~dp0"

start "Relic Browser Dev Server" cmd /k npm run dev

set AHK_V2="C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe"
if exist %AHK_V2% (
    start "" %AHK_V2% "automation\sell-relics.ahk"
) else (
    REM Fall back to whatever .ahk is associated with on this machine.
    start "" "automation\sell-relics.ahk"
)
