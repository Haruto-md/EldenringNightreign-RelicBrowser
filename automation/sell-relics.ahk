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
    for match in json.RegExMatch('"([A-Za-z]+)"', "g") {
        actions.Push(match[1])
    }
    return actions
}

F9:: {
    if !WinActive(GameWindowTitle) {
        return
    }

    clipboardText := A_Clipboard
    if (clipboardText = "") {
        return
    }

    actions := []
    try {
        actions := ParseActionArray(clipboardText)
    } catch as err {
        return
    }

    if (actions.Length = 0) {
        return
    }

    for action in actions {
        if !ActionToKey.Has(action) {
            ; Unrecognized action - abort rather than send something wrong.
            return
        }
        if !WinActive(GameWindowTitle) {
            ; Window lost focus mid-sequence - abort rather than send keys
            ; into whatever else is now focused.
            return
        }
        Send(ActionToKey[action])
        Sleep(KeyDelayMs)
    }
}
