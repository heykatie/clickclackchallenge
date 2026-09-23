# clickclackchallenge — V1 Wireframes

This file owns screen layout and the five PNG wireframes in `docs/wireframes/`.

## Document ownership

Each fact has one owner. Other documents link to that owner instead of restating the rule.

| Topic | Owner |
| --- | --- |
| Scoring, accuracy gate, ranking, name rules, continue-event duration, reset timing, what must persist, offline must-work | `docs/prd.md` |
| Palette, type scale, CSS tokens, motifs, component styling, required contestant-facing strings | `docs/design_system.md` |
| Screen layout and the five PNG wireframes | `docs/wireframes.md` |
| Stack, application state, IndexedDB schema, module boundaries, service worker, precache, navigation fallback, implementation order | `docs/technical_plan.md` |
| Booth acceptance tests and the pre-event checklist | `docs/prd.md` |
| Automated test map and hardware check lists | `docs/technical_plan.md` |

If two documents disagree, follow the owner in this table. The user's latest explicit instruction still takes priority over every document.

This document specifies layout for the five screens on a landscape iPad with a giant keyboard. Product behavior lives in `docs/prd.md`.

**Target:** landscape iPad, 4:3, readable from approximately two feet away. Each contestant screen fits within the viewport without scrolling.

**Current branding rule:** preserve the brand inspired pastel visual style and optional logo-only keycap badge.

## 1. References and interpretation

- Product behavior comes from `docs/prd.md` and `docs/technical_plan.md`. Visual layout comes from this document and `docs/design_system.md`.
- Later decisions replace older examples: blush/white replaces the cream-led palette; Ready has a keyboard prompt and current high score, with no Start button or leaderboard; the passage is a complete centered single line; shop-name text is removed.
- Current PNG exports for all five screens are tracked in `docs/wireframes/`. Each is 4:3. They are layout references, not safe pixel targets. Export pixels are not CSS layout dimensions. Keep the pastel system in `docs/design_system.md`. Do not copy missing-glyph boxes, the palette-legend footer, or the decorative “Offline-ready” chip. Lavender display type in the exports is not a contrast target; essential text uses charcoal.
  - Event Setup: [01-setup.png](./wireframes/01-setup.png), 1448 × 1086. The “Offline-ready” chip in this export is decoration, not a control. See section 4.
  - Ready: [02-ready.png](./wireframes/02-ready.png), 1448 × 1086
  - Typing: [03-typing.png](./wireframes/03-typing.png), 1448 × 1086
  - Results: [04-results.png](./wireframes/04-results.png), 1600 × 1200. This export is the new-high-score state described in section 7, not the ordinary result in the diagram there.
  - Leaderboard: [05-leaderboard.png](./wireframes/05-leaderboard.png), 1448 × 1086
- `01-setup.png`, `02-ready.png`, and `04-results.png` contain missing-glyph boxes on the logo, Start Event, Press Any Key, Top 10, and Save Score. Those boxes are export defects. Layout, hierarchy, and placement in the PNGs still count. Implementation uses a clean logo-only keycap badge and the real strings from `docs/design_system.md`. The button text in the PNGs is not the label: `01-setup.png` shows title-case “Start Event,” and `04-results.png` shows “SAVE SCORE” with a trailing missing glyph. Implementation uses `START EVENT` and `SAVE SCORE` from `docs/design_system.md` §7, with no glyph.
- Names, scores, and accuracy values in examples are sample data. They are not seeded event records. The Setup diagram's 30 seconds and Start fresh match the first-open default in `docs/prd.md`.
- Details marked **Proposed** complete a gap in the wireframe specification.

## 2. Screen flow

```text
EVENT SETUP
    │ Start Event
    ▼
READY / ATTRACT ◄────────────────────────────────────────────┐
    │ Press any key                                         │
    ▼                                                       │
TYPING — waiting for first typing input                      │
    │ First valid typing keystroke starts the timer          │
    ▼                                                       │
TYPING — running                                            │
    │ Selected duration expires                             │
    ▼                                                       │
RESULTS + NAME                                          │
    │ Top 10: name entry and Save Score                  │
    │ Other results: View Leaderboard                        │
    ▼                                                       │
TOP 5 LEADERBOARD                                           │
    └── Next Player or automatic reset ─────────────────────┘
```

There are five screens. Waiting and running are states of Typing; name entry is part of Results, not a sixth screen. Event Setup is for the operator and does not repeat between contestants.

| Transition | Required behavior |
| --- | --- |
| Setup → Ready | Create or resume the event and apply its settings. |
| Ready → Typing | Show the whole sentence; consume the opening keypress without entering it into the passage or starting the timer. |
| Waiting → Running | Start timing on the first valid typing keystroke. |
| Running → Results | End the test at the selected duration and show final WPM, accuracy, and qualification status. |
| Results → Leaderboard | Contestants through 20th place save a name. The Top 10 cheer stops at 10th. Other contestants use View Leaderboard. Both open the Top 5. The control is in `docs/prd.md` §15. |
| Leaderboard → Ready | Clear contestant state, retain event data, and return without refreshing the browser. |

## 3. Shared visual system

Palette, type scale, CSS tokens, corner radii, and touch-target sizes live in `docs/design_system.md`. Use those values instead of sampling colors from the PNGs. Words inside the diagrams show placement. The canonical strings live in the design system brand-voice section.

## 4. Screen 01 — Event Setup

**Purpose:** let the operator select the test length and choose whether to start a new event or resume the most recently active event.

![Event Setup wireframe: test length, fresh or continue, and Start Event](./wireframes/01-setup.png)

```text
┌──────────────────────────────────────────────────────────────────┐
│ OPERATOR SETUP                                      [logo only]   │
│ Set up today's typing test                                       │
│ Choose the test length and which leaderboard to use.             │
│                                                                  │
│ ┌────────────────────────┐  ┌─────────────────────────────────┐  │
│ │ 1. Test length         │  │ 2. Leaderboard                  │  │
│ │                        │  │                                 │  │
│ │ [● 30 seconds]         │  │ [● Start fresh]                 │  │
│ │ [○ 60 seconds]         │  │ Create a new event.             │  │
│ │                        │  │                                 │  │
│ │ Applies to everyone    │  │ [○ Continue previous event]     │  │
│ │ in this event.         │  │ Resume the latest event.        │  │
│ └────────────────────────┘  └─────────────────────────────────┘  │
│                                                                  │
│                                           [ START EVENT ]        │
└──────────────────────────────────────────────────────────────────┘
```

Use three clear option groups with visible selected states and one large mint action. When no event exists, the selected options are Start fresh, 30 seconds, and Famous Lines, as in `docs/prd.md`. Continue is unavailable.

| Control | Layout |
| --- | --- |
| Test length | One choice: 30 or 60 seconds, for Standard and Famous Lines. On Continue, the control opens on the event's current length and still accepts the other length for the next contestant. While Story is selected, it shows 60 seconds and cannot be changed. Behavior is in `docs/prd.md`. |
| Game mode | One choice: Standard, Famous Lines, or Story. On Continue, the control opens on the event's current mode and still accepts the other modes for the next contestant. Story shows Test length fixed at 60 seconds. Behavior is in `docs/prd.md`. |
| Start fresh | One option in the leaderboard group. Behavior is in `docs/prd.md`. |
| Continue previous event | The other option in that group. Behavior is in `docs/prd.md`. |
| START EVENT | Opens Ready for the selected event. The keyboard cursor starts here. Arrow keys move through the choices. Enter selects. |

**No previous event:** disable “Continue previous event” and show “No previous event yet.”

`01-setup.png` also shows decoration that is not UI: the “Offline-ready on this iPad” chip, the palette-legend footer, and “Previous event · 5 scores · High score 92 WPM” while Start fresh is selected. Do not copy them. The chip is not an offline-readiness indicator. Required Setup is the three option groups and Start Event. The setup PNG and the diagram above were drawn before the Game mode group. “Applies to everyone” in that diagram is old sample text. Duration and game mode apply to the next contestant and can change during Continue. The summary is sample text. It is not the event Start fresh creates. If an indicator is included, it must reflect real cache and service-worker readiness, as in `docs/prd.md` (Offline Readiness).

Event setup rules, including saved duration and game mode, are in `docs/prd.md`.

## 5. Screen 02 — Ready / Attract

**Purpose:** explain the challenge, show the score to beat, and invite the next contestant to use the physical keyboard.

![Ready wireframe: contest message, current high score, duration, and press-any-key prompt](./wireframes/02-ready.png)

```text
┌──────────────────────────────────────────────────────────────────┐
│ [logo only]                                  [30 SECOND TEST]    │
│                                                                  │
│                 GIANT keyboard typing contest!                   │
│                                                                  │
│              Type above 50 WPM for a Plinko drop.                  │
│                                                                  │
│                 ┌────────────────────────────┐                   │
│                 │     CURRENT HIGH SCORE     │                   │
│                 │           92 WPM           │                   │
│                 │            Alex            │                   │
│                 └────────────────────────────┘                   │
│                                                                  │
│                    PRESS ANY KEY TO START                        │
│                                                                  │
│           Your timer starts when you begin typing.                │
└──────────────────────────────────────────────────────────────────┘
```

The strings on this screen live in `docs/design_system.md` (Brand voice). The diagram shows where they sit. The headline bounces a little and the start line pulses. Reduced motion keeps both still. When there is no eligible score, the high-score block shows “Be the first high score!” Start behavior and the Plinko rule are in `docs/prd.md`.

Show the current high-score block. The `[30 SECOND TEST]` chip in the diagram and in `02-ready.png` is sample chrome, not a required control. Ready does not need to show the test duration; that rule is in `docs/prd.md` §10. The invitation is a keyboard prompt, not a Start button. Use pastel edge motifs without crowding the contest message or score.

Do not show the event Top 5, operator settings, or a Start button on this screen. After 2 minutes of idle, a rolling all-time list may replace this screen. That state is specified in `docs/prd.md` and `docs/design_system.md`. A long-press on the logo badge opens Event Setup from Ready, Typing, Results, and the Leaderboard, specified in `docs/prd.md` §9. Holding Escape on Ready opens Event Setup the same way.

## 6. Screen 03 — Typing

**Purpose:** provide a stable reading target and immediate typing feedback during the 30- or 60-second test.

![Typing wireframe: one centered sentence with live WPM, timer, and accuracy](./wireframes/03-typing.png)

```text
┌──────────────────────────────────────────────────────────────────┐
│                                  Current high score: 92 WPM      │
│                                                                  │
│                                                                  │
│                                                                  │
│         It's dangerous │to go alone! Take this.          │
│                                                                  │
│                                                                  │
│                                                                  │
│ SPEED                         TIME                   ACCURACY    │
│ 73 WPM                         24s                        96%    │
└──────────────────────────────────────────────────────────────────┘
```

The diagram shows a running test. The `│` inside `across` represents the caret, not a character to type. The timer format is `24s`: the unit is on the number, and `TIME` is only the label. `03-typing.png` shows a bare `24` under `TIME`. That export omits the unit.

### Layout and text states

- Center the entire sentence as one text block, horizontally and near the vertical center. Character styling must not shift the line's position.
- Display one complete sentence on one line. Keep the first and last characters fully visible with equal visual space on both sides.
- Start with approximately 10% safe space at each horizontal edge. Curate Famous Lines sentences to fit at the iPad font size. Do not shrink one line relative to another. On a window narrower than the landscape iPad, every line uses the same smaller size so the widest line still fits.
- Target roughly 30–50 characters. Famous Lines uses the famous quotes in the passage set. Character count is a guide; measured fit on the iPad is the actual constraint.
- Put live WPM at the bottom left, the timer at the bottom center, and accuracy at the bottom right. Keep the high-score target small at the top.
- Omit the large badge and decorative panels. A small logo-only mark is optional if it does not compete with the passage.

| Text state | Treatment |
| --- | --- |
| Completed text | Charcoal, in the bold passage weight, on each correct character already typed, including characters before an error in the same word |
| Current word | Charcoal text on a light-lavender surface across the active word |
| Caret | Strong mint, inside the active word at the current character position |
| Upcoming words | Charcoal, in the regular passage weight. Not muted gray. |
| Incorrect characters | Error red plus underline or another non-color indicator; error feedback takes precedence over ordinary word styling |

### Behavior

1. **Waiting:** the whole first sentence is visible; the selected duration is unchanged and the timer is stopped. If no key starts the timer within 5 seconds, Ready appears and no score is saved. A long-press on the logo badge opens Event Setup and does not save a score. That path is in `docs/prd.md` §11.
2. **Running:** the first printable character starts timing. Letters, spaces, and punctuation count. Incorrect input must not increase WPM. The same logo long-press opens Event Setup and discards the attempt without saving a score. Escape returns to Ready and discards the attempt without saving a score. The excluded keys are in `docs/prd.md` §11.
3. **Sentence complete:** replace it with the next complete sentence at the same central position. Continue the same test and timer; do not wrap onto a second line.
4. **Time expired:** stop accepting test input, finalize the result, and open Results.

Bundle passages and fonts locally. Do not add pause/restart controls, a leaderboard, scrolling passages, or continuous decoration to this screen. Accuracy and correction counting live in `docs/prd.md`. Which key starts the timer is in `docs/prd.md` §11.

## 7. Screen 04 — Results + Name

**Purpose:** make the final result easy to understand and collect a name through 20th place on the same screen. The Top 10 cheer stops at 10th.

![Results wireframe: final WPM, accuracy, and name entry](./wireframes/04-results.png)

```text
┌──────────────────────────────────────────────────────────────────┐
│ [logo only]                                                      │
│                                                                  │
│                          Nice typing!                            │
│                                                                  │
│                             84 WPM                               │
│                          97% ACCURACY                            │
│                                                                  │
│                    You win a Plinko drop!                       │
│                       You made the Top 10!                        │
│                                                                  │
│                         Name                                     │
│                       [ Morgan____________ ]                     │
│                                                                  │
│                       [ SAVE SCORE ]                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Keep the WPM dominant and the name field clear of celebration motifs. Result strings are in `docs/design_system.md`. Who qualifies, and how a name is saved, is in `docs/prd.md`.

`04-results.png` is a separate high-score state. It is 1600 × 1200, still 4:3, and a much smaller file than the other four exports. It shows “NEW HIGH SCORE!”, 97 WPM, and 96% accuracy, and it omits the Plinko line. 97 WPM qualifies, so that omission is not the layout. The diagram above is the ordinary Top 10 result: “Nice typing!”, 84 WPM, and 97% accuracy, with the Plinko line because 84 is above 50. Both use sample numbers. Use “NEW HIGH SCORE!” as the headline for rank 1, without “You made the Top 5!” Use “Nice typing!” for places 2 through 5, a Top 10 result, or any result above 50 WPM. Add “You made the Top 5!” or “You made the Top 10!” for those places. Show “You win a Plinko drop!” only when displayed WPM is above 50. A Top 5 or Top 10 score above 50 shows the place line and the Plinko line together. Rank 1 above 50 shows “NEW HIGH SCORE!” and the Plinko line only. Use “Casper, is that you?” when displayed WPM is 0. Use “Thanks for playing!” when the attempt is outside the Top 10 and displayed WPM is 1 through 50. The rule is in `docs/prd.md` §13, and the words are in `docs/design_system.md` (Brand voice).

When name entry is omitted, show a large View Leaderboard button. Enter and Space select it. When name entry is shown, focus the name field so the first letter goes into it. Enter saves the score with that name. Show View Leaderboard beside Save Score so an empty name is not the only way off the screen. View Leaderboard writes one score row with a null name. If the name stays empty or blocked, show “Opening the leaderboard in {n}s” for the last 5 seconds of a 15-second wait, then take that same exit. Typing an allowed name hides the countdown. A blocked name shows “Pick a different name.” Both actions are in `docs/prd.md` §15. The label is in `docs/design_system.md` (Brand voice).

Focusing the name field can open the iPad software keyboard over SAVE SCORE, even when the giant keyboard is attached. Check that on the target iPad, as in `docs/technical_plan.md` (Manual Layout Tests). If the keyboard covers the button, keep the name field and SAVE SCORE in the upper half. View Leaderboard sits on that same row, so it stays with them. Do not add a keyboard library.

## 8. Screen 05 — Top 5 Leaderboard

**Purpose:** show the current event's five highest qualifying scores and make the next-player transition obvious.

![Leaderboard wireframe: five ranked rows, first-place emphasis, a current-player marker, Next Player, and a reset message](./wireframes/05-leaderboard.png)

```text
┌──────────────────────────────────────────────────────────────────┐
│ [logo only]                                                      │
│                             TOP 5                                │
│                          Leaderboard                             │
│                                                                  │
│      ┌────────────────────────────────────────────────────┐      │
│      │  1   [crown] Alex                           92 WPM  │      │
│      │  2           Jamie                          88 WPM  │      │
│      │  3           Morgan  [YOU]                  84 WPM  │      │
│      │  4           Riley                          78 WPM  │      │
│      │  5           Casey                          73 WPM  │      │
│      └────────────────────────────────────────────────────┘      │
│                                                                  │
│                    [ NEXT PLAYER → ]                             │
│                                                                  │
│              Returning to ready screen in 5s                      │
└──────────────────────────────────────────────────────────────────┘
```

### Required visual treatment

- Small logo-only badge near the upper-left safe margin. Long-press behavior is in `docs/prd.md` §9.
- Centered “TOP 5” pill and “Leaderboard” heading.
- One wide white rounded panel with five consistent row positions, aligned ranks, left-aligned names, and right-aligned WPM values.
- Rank 1 uses a light lavender row and mint rank accent. A small crown is optional; the numeral and score remain explicit.
- Other ranks use calm white surfaces and subtle separators, not a different bright color per rank.
- When the current player's result is in the Top 5, a subtle mint row treatment and “YOU” pill may identify it. Match the actual result, not just the name, because names may repeat.
- A saved score with no name still occupies its rank. Show a dash in the name column. Do not invent a guest name. Truncate a long name with an ellipsis. The stored name stays the full saved value. Both rules are in `docs/design_system.md`.
- Keep rank 1 the strongest ranking emphasis even when another row has the current-player treatment. If the player is first, combine the treatments in that one row.
- Place one large mint “NEXT PLAYER” button below the panel, followed by a readable automatic-reset message.
- Keep pink, peach, and other organic motifs at the edges. No heavy shadows or shop-name text.

### Data and timing

- Rank by displayed WPM, then displayed accuracy rounded to a whole number, then the earlier submission. That order is in `docs/prd.md`. Do not sort on the stored accuracy tenths.
- Show only the Top 5. Do not append the current player as a sixth row if they rank lower.
- The PNG's five contestants are sample data. **Proposed sparse state:** keep the five-row layout, fill occupied ranks with real results, and show unoccupied rows with a dash. For an entirely empty board, include “No scores yet.”
- “YOU” is temporary feedback for the just-completed attempt, not a permanent property of the stored name.
- The countdown duration lives in `docs/prd.md`. Booth testing may adjust it later. Render the remaining time in the reset message; do not leave the number fixed.
- Begin the countdown when the leaderboard is displayed. Show “Returning to ready screen in {seconds}s” only for the last 5 seconds, in small type. The live interface must not leave the number fixed at 15.
- NEXT PLAYER returns immediately to Ready. Escape, Enter, and Space do the same. Countdown completion produces the same reset. Cancel the old countdown when leaving the leaderboard so it cannot affect the next contestant.

## 9. Shared scoring, storage, and reset behavior

Scoring, name rules, persistence, offline behavior, and reset timing live in `docs/prd.md`. This document shows where those states appear.

Accuracy is attempt-based: correct attempts divided by correct attempts plus incorrect attempts. Backspace is not an attempt, and it does not erase the original incorrect attempt. Both rules are in `docs/prd.md` §12. Do not calculate accuracy as correct characters divided by characters typed.

Both reset paths return to Ready without a browser reload. They clear the current contestant’s on-screen state and leave the active event in place.

## 10. Wireframe acceptance checklist

This is a review checklist for the intended interface, not a claim that the app has passed testing.

- [ ] All five screens fit a landscape 4:3 viewport and remain readable at approximately two feet.
- [ ] The shared palette and font roles are consistent; only a logo-only badge is used.
- [ ] Setup offers test length, game mode, fresh/continue, and Start Event. The keyboard cursor starts on Start Event. Arrow keys move. Enter selects. Story fixes the length at 60 seconds.
- [ ] Fresh creates a new event without deleting prior scores; Continue restores saved event data.
- [ ] Ready shows the contest copy, strictly-above-50-WPM message, and current high score. The headline bounces a little and the start line pulses. Reduced motion keeps both still.
- [ ] Ready has no leaderboard or Start button.
- [ ] The key used to leave Ready neither enters the passage nor starts timing. Holding Escape opens Event Setup. A short Escape press does not.
- [ ] The full first sentence is visible before the first valid typing keystroke starts the timer.
- [ ] Every passage fits on one centered line with balanced margins and a consistent font size.
- [ ] Current word, caret, completed text, upcoming text, and errors are distinguishable.
- [ ] Timer is bottom-center; live WPM and accuracy are bottom-left and bottom-right.
- [ ] Results show the headline, WPM, accuracy, “You win a Plinko drop!” when displayed WPM is above 50, and the place line for Top 5 or Top 10 except rank 1.
- [ ] Name entry is on Results and offered through 20th place. The field is focused, so the first letter goes into the name. Enter saves that name with the score. When name entry is omitted, Enter and Space select View Leaderboard. The Top 10 line stops at 10th.
- [ ] Name entry is protected from automatic reset; saving does not duplicate a score.
- [ ] The leaderboard shows at most five real scores in ranked order, with rank 1 emphasized.
- [ ] The optional YOU highlight refers to the current attempt and never adds a sixth row.
- [ ] NEXT PLAYER, Escape, Enter, Space, and the countdown return to Ready with event data intact.
- [ ] Empty events do not display fabricated names or scores.
- [ ] Required assets, fonts, passages, and stored data work offline on the target iPad.
- [ ] Essential text has sufficient contrast, controls have visible focus, and state is not conveyed by color alone.

## 11. Settled layout decisions

| Topic | Rule |
| --- | --- |
| Typing input | The first printable character starts the timer, including space and punctuation. The excluded non-typing keys are in `docs/prd.md` §11. |
| Name display | A missing name is a dash. A long name is truncated with an ellipsis. The stored name is unchanged. See `docs/design_system.md`. |
| Setup defaults | With no event, Start fresh, 30 seconds, and Famous Lines are selected, and Continue is unavailable. When an event exists, Continue is selected and the duration and game mode show the stored choices. Behavior is in `docs/prd.md` §9. |

Provisional numbers, including the 80% accuracy gate and the 15-second reset, live in `docs/prd.md`. Testing may change them later.
