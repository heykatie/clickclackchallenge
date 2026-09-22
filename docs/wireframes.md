# Typing Test — V1 Wireframes

This document specifies the five-screen experience for an offline typing contest on a giant physical keyboard, displayed on a landscape iPad. It records the latest product and visual decisions from the project conversation and the accompanying leaderboard PNG. It describes the intended interface; application behavior has not been verified against running code in this workspace.

**Target:** landscape iPad, 4:3, readable from approximately two feet away. Each contestant screen fits within the viewport without scrolling.

**Current branding rule:** preserve the Tiny-inspired pastel visual style and optional logo-only keycap badge. Do not display “Tiny Keyboard Shop,” “tinykeyboardshop,” or “TKS” in screen headings, badges, footers, or other interface copy.

## 1. References and interpretation

- Product behavior and design-system values come from the latest PRD and design-system revisions in [Plan AI bug triage app](chatgpt-conversation://6ab1dbf3-b7a0-83e8-a310-6ba5202fb1df).
- Later decisions replace older examples: blush/white replaces the cream-led palette; Ready has a keyboard prompt and current high score, with no Start button or leaderboard; the passage is a complete centered single line; shop-name text is removed.
- The current [leaderboard wireframe](./leaderboard-wireframe.png) is available in this workspace. It is 1448 × 1086 pixels, an exact 4:3 ratio. Export pixels are not CSS layout dimensions.
- The layouts below describe all five screens. Current PNG exports for the other four screens are not present here; older reference images contain superseded branding or styling and are not embedded as current designs.
- Names, scores, accuracy values, and selected options in examples are sample data. They are not seeded event records or confirmed defaults.
- Details marked **Proposed** complete a gap in the wireframe specification. Unresolved product decisions are collected in section 11.

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
RESULTS + NICKNAME                                          │
    │ Top 10: nickname entry and Save Score                  │
    │ Other results: continue without nickname entry        │
    ▼                                                       │
TOP 5 LEADERBOARD                                           │
    └── Next Player or automatic reset ─────────────────────┘
```

There are five screens. Waiting and running are states of Typing; nickname entry is part of Results, not a sixth screen. Event Setup is for the operator and does not repeat between contestants.

| Transition | Required behavior |
| --- | --- |
| Setup → Ready | Create or resume the event and apply its settings. |
| Ready → Typing | Show the whole sentence; consume the opening keypress without entering it into the passage or starting the timer. |
| Waiting → Running | Start timing on the first valid typing keystroke. |
| Running → Results | End the test at the selected duration and show final WPM, accuracy, and qualification status. |
| Results → Leaderboard | Let eligible players save a nickname; all contestants can proceed to the Top 5. The non-qualifier control is proposed in section 7. |
| Leaderboard → Ready | Clear contestant state, retain event data, and return without refreshing the browser. |

## 3. Shared visual system

### Palette

Use the latest documented palette below. These are approximate brand matches, not verified official brand colors. Generated image colors can vary slightly; use these values for implementation.

| Role | Color | Use |
| --- | --- | --- |
| Blush | `#FBEDEF` | Main background |
| Soft white | `#FFFDFC` | Panels, fields, ordinary leaderboard rows |
| Mint | `#9DDED8` | Accent surfaces and decorative shapes |
| Strong mint | `#6CCFC7` | Primary controls, caret, focus accents |
| Lavender | `#AA9AD4` | Borders, current-word treatment, rank accents |
| Light lavender | `#D9D0ED` | First-place row and soft emphasis |
| Soft pink | `#F4C1D4` | Sparse decoration and celebration |
| Peach | `#F5CFC0` | Sparse decorative shapes |
| Charcoal | `#403738` | Essential text and scores |
| Muted gray | `#8C8788` | Secondary text, subject to readability checks |
| Error red | `#D95D5D` | Incorrect characters and validation feedback |

Use charcoal for essential reading. Pastel accents are not a substitute for sufficient text contrast. Check active-word, upcoming-text, and error treatments on the actual iPad; use a tinted background or darker text variant if needed while retaining the state distinction.

### Typography and geometry

| Role | Font | Initial layout size |
| --- | --- | --- |
| Main headline | Fredoka 600–700 | 44–64 px |
| Result WPM | Fredoka 600–700 | 72–100 px |
| Section heading | Fredoka 600–700 | 28–40 px |
| Primary button text | Fredoka 600–700 | 24–34 px |
| Labels and leaderboard names | Nunito 600–700 | 20–24 px |
| Body copy | Nunito 400–600 | 18–22 px |
| Helper copy | Nunito 400–600 | 14–18 px; enlarge when needed for distance reading |
| Typing passage | Atkinson Hyperlegible 400–700 | 32–36 px |
| Typing timer | Fredoka 600–700 | 36–48 px |
| Live WPM and accuracy | Nunito or Fredoka | 22–30 px |

These are starting layout sizes, not measurements extracted from the PNG. Package fonts locally for offline use and validate the layout on the target iPad.

- Use rounded controls, pill labels, and large rounded panels. Typical radii: 12–16 px for small controls, 18–26 px for buttons, and 24–36 px for panels.
- Touch targets are at least 44 × 44 px; major actions should be at least 56 px tall.
- Keep organic blobs, arcs, swirls, dots, and occasional stars near screen edges. Keep text, inputs, and controls clear.
- Prefer flat fills, fine borders, and generous whitespace. Avoid heavy shadows, strong gradients, dark gamer styling, and dense dashboard layouts.
- Keep Typing much quieter than Ready, Results, or Leaderboard. Avoid motion around the passage and honor reduced-motion preferences.
- Provide visible focus and non-color indicators for selected options, current-player status, and errors. Use a proper logo/icon asset rather than missing-glyph boxes from older mockups.

## 4. Screen 01 — Event Setup

**Purpose:** let the operator select the test length and choose whether to start a new event or resume the most recently active event.

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

Use two clear option groups with visible selected states and one large mint action. The example selections do not establish a default duration or event mode.

| Control | Behavior |
| --- | --- |
| Test length | One choice: 30 or 60 seconds. The operator chooses; contestants do not. |
| Start fresh | Create a new active event with an empty leaderboard. Preserve previous event data. |
| Continue previous event | Resume the most recently active event, including its stored scores and event settings. |
| START EVENT | Open Ready for the selected event. |

**Proposed empty state:** disable “Continue previous event” when none exists and show “No previous event yet.” An optional previous-event summary can show its score count and high score.

Keep configuration limited to these choices. V1 has no event-history browser, score-deletion controls, or Clear Leaderboard button. If an offline-ready indicator is included, show it only when offline readiness has actually been established.

## 5. Screen 02 — Ready / Attract

**Purpose:** explain the challenge, show the score to beat, and invite the next contestant to use the physical keyboard.

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

Required copy:

- “GIANT keyboard typing contest!”
- “Type above 50 WPM for a Plinko drop.”
- “CURRENT HIGH SCORE”
- “PRESS ANY KEY TO START”

Show the current event's high-score WPM and nickname, plus the selected duration. The invitation can sit on a lavender or mint panel, but it is a keyboard prompt, not a Start button. Use pastel edge motifs without crowding the contest message or score.

The word **above** means strictly greater than 50 WPM; do not silently change the message to “50 WPM or more.” The prize message and leaderboard qualification are separate concepts.

On the opening keypress, show Typing with the complete sentence and the full duration still remaining. That opening keypress must not count as a typed character or start the test timer.

**Proposed empty state:** replace the sample high-score value and nickname with “Be the first to set a score!” Do not show a fictional contestant.

Do not show the Top 5, operator settings, or a Start button on this screen.

## 6. Screen 03 — Typing

**Purpose:** provide a stable reading target and immediate typing feedback during the 30- or 60-second test.

```text
┌──────────────────────────────────────────────────────────────────┐
│                                  Current high score: 92 WPM      │
│                                                                  │
│                                                                  │
│                                                                  │
│              The little dog ran acr│oss the yard.                 │
│                                                                  │
│                                                                  │
│                                                                  │
│ SPEED                         TIME                   ACCURACY    │
│ 73 WPM                         24s                        96%    │
└──────────────────────────────────────────────────────────────────┘
```

The diagram shows a running test. The `│` inside `across` represents the caret, not a character to type.

### Layout and text states

- Center the entire sentence as one text block, horizontally and near the vertical center. Character styling must not shift the line's position.
- Display one complete sentence on one line. Keep the first and last characters fully visible with equal visual space on both sides.
- Start with approximately 10% safe space at each horizontal edge. Curate passages to fit at the selected font size; do not shrink fonts between sentences or contestants.
- Target roughly 35–50 characters using natural sentences and common words. Character count is a guide; measured fit on the iPad is the actual constraint.
- Put live WPM at the bottom left, the timer at the bottom center, and accuracy at the bottom right. Keep the high-score target small at the top.
- Omit the large badge and decorative panels. A small logo-only mark is optional if it does not compete with the passage.

| Text state | Treatment |
| --- | --- |
| Completed words | Charcoal |
| Current word | Lavender emphasis across the active word; retain legibility |
| Caret | Strong mint, inside the active word at the current character position |
| Upcoming words | Secondary but readable text |
| Incorrect characters | Error red plus underline or another non-color indicator; error feedback takes precedence over ordinary word styling |

### Behavior

1. **Waiting:** the whole first sentence is visible; the selected duration is unchanged and the timer is stopped.
2. **Running:** the first valid typing keystroke starts timing. Incorrect input must not increase WPM.
3. **Sentence complete:** replace it with the next complete sentence at the same central position. Continue the same test and timer; do not wrap onto a second line.
4. **Time expired:** stop accepting test input, finalize the result, and open Results.

Bundle passages and fonts locally. Do not add pause/restart controls, a leaderboard, scrolling passages, or continuous decoration to this screen. The precise definition of a valid first keystroke and correction behavior remain open in section 11.

## 7. Screen 04 — Results + Nickname

**Purpose:** make the final result easy to understand and collect a nickname from eligible Top 10 contestants on the same screen.

```text
┌──────────────────────────────────────────────────────────────────┐
│ [logo only]                                                      │
│                                                                  │
│                          Nice typing!                            │
│                                                                  │
│                             84 WPM                               │
│                          97% ACCURACY                            │
│                                                                  │
│                       You made the Top 10!                        │
│                                                                  │
│                       Nickname                                   │
│                       [ Morgan____________ ]                     │
│                                                                  │
│                       [ SAVE SCORE ]                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Keep the WPM dominant, accuracy secondary, and ranking status clear. Use “NEW HIGH SCORE!” when applicable; otherwise use concise friendly copy such as “Nice typing!” Small pastel celebration motifs are appropriate outside the form area.

| Result state | Content and progression |
| --- | --- |
| Valid result in the Top 10 | Show qualification copy, a labeled nickname field, and SAVE SCORE. Save the nickname with that result, then show the updated leaderboard. |
| Valid result outside the Top 10 | Show WPM, accuracy, and ranking status; omit nickname entry. Still proceed to the leaderboard. |
| Result below the validity threshold | Show WPM, accuracy, and a clear qualification explanation. Exclude it from competitive rankings and omit nickname entry. Still allow progression. |
| New high score | Add the high-score celebration to the eligible result state. |

**Proposed non-qualifier action:** show a large “VIEW LEADERBOARD” button when nickname entry is not offered. The prior requirements establish progression but do not specify this control's label or an automatic Results delay.

- Top 10 eligibility does not guarantee a visible Top 5 row. Ranks 6–10 can enter a nickname even though their rows are not shown on the next screen.
- Accept free-form nicknames; the project does not specify a preset-name list, character limit, or empty-name policy.
- Make the field large and visibly focused when editing. Use the physical keyboard for text entry and keep the action reachable by keyboard and touch.
- Save valid scores locally. Nickname submission must update the same result, not create a duplicate entry. Store valid scores outside the visible Top 5 as well.
- Do not run the leaderboard reset countdown while a contestant is entering a nickname.
- **Proposed save-error state:** preserve the result and entered nickname, show a short save-failure message, and allow retry instead of falsely indicating success.

## 8. Screen 05 — Top 5 Leaderboard

**Purpose:** show the current event's five highest qualifying scores and make the next-player transition obvious.

![Current landscape 4:3 leaderboard wireframe with five sample rows, first-place emphasis, a current-player marker, Next Player button, and reset message](./leaderboard-wireframe.png)

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
│              Returning to ready screen in 10s                     │
└──────────────────────────────────────────────────────────────────┘
```

### Required visual treatment

- Small logo-only badge near the upper-left safe margin.
- Centered “TOP 5” pill and “Leaderboard” heading.
- One wide white rounded panel with five consistent row positions, aligned ranks, left-aligned nicknames, and right-aligned WPM values.
- Rank 1 uses a light lavender row and mint rank accent. A small crown is optional; the numeral and score remain explicit.
- Other ranks use calm white surfaces and subtle separators, not a different bright color per rank.
- When the current player's result is in the Top 5, a subtle mint row treatment and “YOU” pill may identify it. Match the actual result, not just the nickname, because names may repeat.
- Keep rank 1 the strongest ranking emphasis even when another row has the current-player treatment. If the player is first, combine the treatments in that one row.
- Place one large mint “NEXT PLAYER” button below the panel, followed by a readable automatic-reset message.
- Keep pink, peach, and other organic motifs at the edges. No heavy shadows or shop-name text.

### Data and timing

- Rank by WPM descending. Accuracy and submission time are proposed tie-breakers from the PRD, not a separately weighted score; their final use remains to be confirmed.
- Show only the Top 5. Do not append the current player as a sixth row if they rank lower.
- The PNG's five contestants are sample data. **Proposed sparse state:** keep the five-row layout, fill occupied ranks with real results, and show unoccupied rows with a dash. For an entirely empty board, include “No scores yet.”
- “YOU” is temporary feedback for the just-completed attempt, not a permanent property of the stored nickname.
- The current wireframe uses a 10-second return message. Use **10 seconds as the proposed default**, consistent with that image; the original PRD only requires a short automatic delay.
- Begin the countdown when the leaderboard is displayed. Render the remaining time in “Returning to ready screen in {seconds}s”; the live interface must not leave the number fixed at 10.
- NEXT PLAYER returns immediately to Ready. Countdown completion produces the same reset. Cancel the old countdown when leaving the leaderboard so it cannot affect the next contestant.

## 9. Shared scoring, storage, and reset behavior

These rules determine visible values and states; this document does not prescribe a storage library or application framework.

| Rule | Requirement |
| --- | --- |
| WPM | Use correct characters: `(correct characters / 5) / elapsed minutes`. Incorrect keystrokes must not increase the score. |
| Accuracy | The PRD proposes `(correct characters / total typed characters) × 100`; correction and counting details are still to be finalized. |
| Validity | Apply a minimum accuracy/validity threshold before a score qualifies for competition. No numeric cutoff has been agreed. |
| Nicknames | Offered to qualifying Top 10 contestants. |
| Visible rankings | Top 5 of the current active event. |
| Retention | Preserve all valid event scores locally, not only the displayed rows. |
| Fresh event | Create a new empty event; retain prior event data. |
| Continued event | Resume the most recently active event and its saved data. |
| Offline operation | After initial installation/caching, setup, typing, scoring, saving, rankings, and reset work without internet. |

Both reset paths clear the current sentence, typed input, live WPM, live accuracy, timer, result, nickname input, and current-player marker. They preserve the active event, test duration, stored scores, high score, and leaderboard. Return to Ready without a browser reload.

Event settings and scores survive an app/browser restart. V1 does not require accounts, cloud synchronization, a backend, shared rankings across devices, historical-event management, or a storefront.

## 10. Wireframe acceptance checklist

This is a review checklist for the intended interface, not a claim that the app has passed testing.

- [ ] All five screens fit a landscape 4:3 viewport and remain readable at approximately two feet.
- [ ] The shared palette and font roles are consistent; only a logo-only badge is used.
- [ ] Setup offers 30/60 seconds, fresh/continue, and Start Event.
- [ ] Fresh creates a new event without deleting prior scores; Continue restores saved event data.
- [ ] Ready shows the contest copy, strictly-above-50-WPM message, duration, and current high score.
- [ ] Ready has no leaderboard or Start button.
- [ ] The key used to leave Ready neither enters the passage nor starts timing.
- [ ] The full first sentence is visible before the first valid typing keystroke starts the timer.
- [ ] Every passage fits on one centered line with balanced margins and a consistent font size.
- [ ] Current word, caret, completed text, upcoming text, and errors are distinguishable.
- [ ] Timer is bottom-center; live WPM and accuracy are bottom-left and bottom-right.
- [ ] Results show WPM, accuracy, high-score status when applicable, and qualification status.
- [ ] Nickname entry is on Results and offered to Top 10 qualifiers, including ranks 6–10.
- [ ] Nickname entry is protected from automatic reset; saving does not duplicate a score.
- [ ] The leaderboard shows at most five real scores in ranked order, with rank 1 emphasized.
- [ ] The optional YOU highlight refers to the current attempt and never adds a sixth row.
- [ ] NEXT PLAYER and the countdown return to Ready with event data intact.
- [ ] Empty events do not display fabricated names or scores.
- [ ] Required assets, fonts, passages, and stored data work offline on the target iPad.
- [ ] Essential text has sufficient contrast, controls have visible focus, and state is not conveyed by color alone.

## 11. Decisions still to finalize

| Topic | What is established | What remains open |
| --- | --- | --- |
| Validity threshold | Random or inaccurate input must not earn a competitive score. | Minimum accuracy/validity value after testing on the giant keyboard. |
| Typing input and correction | The first valid typing keystroke starts timing; incorrect input does not increase WPM. | Which keys can start the timer, Backspace behavior, cursor advancement on errors, and character counting after corrections. |
| Ranking precision and ties | WPM is the primary ranking value. | Display rounding and comparison precision; whether to adopt accuracy then earlier submission as tie-breakers. |
| Nickname policy | Top 10 players can enter a free-form nickname. | Length, long-name display, blank-name fallback, skip behavior, and abandonment handling. |
| Results progression | Every contestant can reach the leaderboard. | Confirm the proposed VIEW LEADERBOARD control for non-qualifiers and any Results idle behavior. |
| Leaderboard delay | Automatic return after a short delay; the latest PNG shows 10s. | Confirm 10 seconds as the shipped duration. |
| Setup defaults | 30/60-second and fresh/continue choices exist. | Initial selection and whether a continued event permits changing its saved duration. |
| Operator re-entry | Settings are separate from contestant gameplay. | How the operator returns to Setup after starting an event. |

Until these are resolved, do not treat illustrative values or proposed controls as previously approved product rules. Any implementation decision should be reflected here and in the project's PRD/design-system documents.
