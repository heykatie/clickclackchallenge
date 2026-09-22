# Typing Test — V1 Testing

This document owns the V1 test catalog.

Product rules under test live in `docs/prd.md`. Implementation under test lives in `docs/technical_plan.md`.

## Document ownership

Each fact has one owner. Other documents link to that owner instead of restating the rule.

| Topic | Owner |
| --- | --- |
| Scoring, accuracy gate, ranking, nickname rules, continue-event duration, reset timing, what must persist, offline must-work | `docs/prd.md` |
| Palette, type scale, CSS tokens, motifs, component styling, required contestant-facing strings | `docs/design_system.md` |
| Screen layout and the five PNG wireframes | `docs/wireframes.md` |
| Stack, application state, IndexedDB schema, module boundaries, service worker, precache, navigation fallback, implementation order | `docs/technical_plan.md` |
| Booth acceptance tests, automated test map, giant-keyboard and airplane-mode checks | `docs/testing.md` |

If two documents disagree, follow the owner in this table. The user's latest explicit instruction still takes priority over every document.


## 1. Acceptance tests

Testing must verify that the Typing Test behaves correctly from the operator and contestant perspective and is reliable enough for repeated booth use.

These are the product-level acceptance tests for V1. Automated cases and hardware checks follow in this same document.

The MVP is not complete until the required acceptance tests pass, including the full airplane-mode test on the actual target iPad and giant keyboard.

---

### 30-Second Mode

**Given**

- an active event is configured for 30 seconds
- the contestant is on the Typing screen
- the timer has not started

**When**

- the contestant presses the first valid typing character

**Then**

- that character counts as the first typing attempt
- the timer starts
- the test runs for 30 seconds
- the test ends when 30 seconds have elapsed
- input after the deadline is ignored
- the Results screen appears once

---

### 60-Second Mode

**Given**

- an active event is configured for 60 seconds
- the contestant is on the Typing screen

**When**

- the contestant presses the first valid typing character

**Then**

- that character counts as the first typing attempt
- the timer starts
- the test runs for 60 seconds
- the test ends when 60 seconds have elapsed
- input after the deadline is ignored
- the Results screen appears once

---

### Ready-Screen Start Behavior

**Given**

- the contestant is on the Ready screen

**When**

- the contestant presses any key

**Then**

- the app transitions to the Typing screen
- the Ready-screen key does not start the timer
- the Ready-screen key does not count as a typing attempt
- the Ready-screen key does not affect WPM
- the Ready-screen key does not affect accuracy

The timer should begin only after the first valid typing character is entered on the Typing screen.

---

### First Valid Typing Key

**Given**

- the Typing screen is visible
- the timer has not started

**When**

- the contestant presses the first valid typing character

**Then**

- the timer starts
- the character is scored as the first typing attempt
- the character contributes to WPM only if correct
- the character contributes to accuracy as either a correct or incorrect attempt

---

### Wrong Keys Do Not Inflate WPM

**Given**

- the contestant is actively typing

**When**

- the contestant enters incorrect characters

**Then**

- incorrect characters count against accuracy
- incorrect characters do not increase correct-character count
- incorrect characters do not increase WPM
- the contestant may continue typing without being forced to correct the mistake

Example:

```text
Expected: house
Typed:    housr
```

Expected result:

```text
4 correct characters
1 incorrect attempt
```

---

### Partial Words Count at Timeout

**Given**

- the contestant is typing a word when the timer expires

**When**

- the test ends before the word is complete

**Then**

- all correct characters entered before the deadline count toward WPM
- the partial word is not discarded

Example:

```text
Expected: keyboard
Typed before timeout: keybo
```

If all five typed characters are correct, all five count toward WPM.

---

### Backspace Behavior

**Given**

- the contestant enters an incorrect character

**When**

- they press Backspace and type a replacement character

**Then**

- Backspace itself does not count as a typing attempt
- Backspace itself does not affect accuracy
- the original incorrect attempt remains part of the accuracy calculation
- a corrected character may receive correct-character credit for WPM

Backspace may only edit the currently displayed sentence.

Once a sentence is completed and the next sentence appears, the previous sentence cannot be reopened.

---

### Errors Do Not Block Progress

**Given**

- the contestant types an incorrect character

**When**

- they continue typing without correcting it

**Then**

- the caret continues forward
- later correct characters may still receive credit
- the test does not require correction before continuing

---

### Held-Key Repeat Does Not Create Extra Attempts

**Given**

- the contestant holds down a key long enough for the browser to generate repeated key events

**When**

- automatic key-repeat occurs

**Then**

- browser-generated repeat events do not count as additional typing attempts
- WPM is not inflated
- accuracy is not distorted

Separate physical presses of the same key must still work normally.

---

### Minimum Leaderboard Accuracy

**Given**

- the current development minimum leaderboard accuracy is 80%

**When**

- a contestant finishes below 80% accuracy

**Then**

- their WPM is still shown
- their accuracy is still shown
- the score does not participate in leaderboard ranking
- the contestant is not considered Top 10
- nickname entry is not shown
- the score cannot appear in the Top 5

Boundary cases:

```text
80.00% → eligible
79.99% → not eligible
```

The 80% threshold remains provisional until it is validated on the physical giant keyboard.

---

### Leaderboard Sorting

**Given**

- an event contains multiple eligible scores

**When**

- the leaderboard is calculated

**Then**

scores are ordered by:

```text
1. displayed WPM descending
2. accuracy descending
3. earlier submission first
```

Only the first five ranked scores are shown on the visible leaderboard.

Example:

```text
Alex   92 WPM   98%
Mia    92 WPM   96%
Sam    91 WPM   100%
```

Expected order:

```text
1. Alex
2. Mia
3. Sam
```

---

### Top 10 Nickname Eligibility

**Given**

- the contestant meets the minimum accuracy threshold
- the completed score ranks within the event's Top 10

**When**

- the Results screen appears

**Then**

- nickname entry is shown
- the contestant may enter and save a nickname

If the contestant ranks outside the Top 10, nickname entry must not be shown.

---

### Nickname Entry Is Not Interrupted

**Given**

- a qualifying contestant is entering a nickname

**When**

- they remain on the Results screen

**Then**

- automatic reset must not interrupt the nickname flow
- the contestant remains on Results until the nickname flow is completed

---

### Fresh Event Behavior

**Given**

- Event A is active
- Event A contains saved scores

**When**

- the operator chooses **Start Fresh**

**Then**

- Event A is preserved
- Event A's scores are preserved
- Event A becomes archived
- a new Event B is created
- Event B becomes active
- Event B starts with no scores
- Event B's leaderboard is blank

Starting fresh must never delete old event data.

---

### Continue Event Behavior

**Given**

- an active event already contains saved scores

**When**

- the app is reopened
- the operator chooses **Continue Previous Event**

**Then**

- the same event is restored
- the original duration is restored
- the original passage set is restored
- all saved scores remain available
- the high score is restored
- the Top 5 is recalculated correctly

Continuing must not create a new event.

---

### Score Persistence

**Given**

- a contestant score has been successfully saved

**When**

- the application is refreshed or reopened

**Then**

- the active event still exists
- the saved score still exists
- the nickname still exists when applicable
- the high score remains correct
- the leaderboard can be reconstructed from saved scores

A server connection must not be required.

---

### Same Passage Sequence for Every Contestant

**Given**

- multiple contestants participate in the same event

**When**

- each contestant begins their test

**Then**

- every contestant starts with the same first sentence
- every contestant receives the same ordered sentence sequence
- passages are not shuffled per contestant

---

### Passage Layout

**Given**

- the final production passage set is loaded on the target landscape iPad

**When**

- each sentence is displayed at the final typing font size

**Then**

- every sentence remains on one line
- no sentence clips off either side
- no sentence requires dynamic font shrinking
- the typing sentence remains visually centered and readable

Any sentence that does not fit must be rewritten or removed.

---

### Next Player Reset

**Given**

- a contestant has completed a test
- the Leaderboard screen is visible

**When**

- **Next Player** is selected

**Then**

the app returns to Ready and clears:

- typed text
- current sentence position
- timer state
- live WPM
- live accuracy
- current result
- nickname input

The following must remain unchanged:

- active event
- duration
- passage set
- saved scores
- current high score
- leaderboard

---

### Automatic Reset

**Given**

- the Leaderboard screen is visible
- nickname entry is no longer active

**When**

- the configured automatic-reset delay expires

**Then**

- the app returns to Ready
- contestant-specific state is cleared
- event-specific state remains intact

---

### Plinko Qualification

**Given**

the Ready screen says:

```text
Type above 50 WPM for a Plinko drop.
```

**When**

- final displayed WPM is calculated

**Then**

```text
51 WPM or higher → qualifies
50 WPM           → does not qualify
```

If the intended business rule changes to `50 WPM or higher`, both the qualification rule and visible copy must be updated together.

---

### Airplane-Mode Acceptance Test

This test must be completed on the actual target iPad.

**Given**

- the deployed app has been loaded and cached
- the app has been added to the Home Screen

**When**

- airplane mode is enabled
- the installed app is closed and relaunched

**Then**

the complete booth flow must work:

```text
launch app
→ create or continue event
→ Ready
→ start typing test
→ complete test
→ calculate WPM and accuracy
→ enter nickname when eligible
→ save score
→ update leaderboard
→ Next Player or automatic reset
→ Ready
```

Then, while still in airplane mode:

```text
close app
→ reopen app
```

and confirm:

- active event survives
- saved scores survive
- nicknames survive
- high score is reconstructed
- Top 5 is reconstructed
- passages load
- fonts load
- icons and required visual assets load

The MVP is not complete until this full airplane-mode test passes.

---

### Pre-Event Acceptance Checklist

Before using the app at a real event, confirm:

```text
30-second mode passes
60-second mode passes
Ready-screen key is not scored
first typing key starts the timer
WPM calculation passes
accuracy calculation passes
wrong keys do not inflate WPM
partial words count correctly
Backspace behavior passes
held-key repeat protection passes
minimum accuracy gate passes
Top 10 nickname behavior passes
Top 5 sorting passes
Plinko qualification passes
fresh event behavior passes
continue event behavior passes
score persistence passes
same passage sequence is used for all contestants
all passages fit one line
Next Player reset passes
automatic reset passes
giant keyboard input passes
PWA launches offline
full airplane-mode flow passes
saved scores survive offline relaunch
```

If any core item fails, V1 should not be considered event-ready.

---

## 2. Automated and manual checks

Vitest covers the unit and persistence cases. React Testing Library covers the component cases. Playwright is optional after the core booth loop works.

Ignore browser key-repeat when `KeyboardEvent.repeat` is true. Separate physical presses of the same key still count.

### Unit Tests — Scoring

Add unit tests for the pure scoring logic.

Required cases:

```text
perfect typing produces expected WPM
30-second final WPM is correct
60-second final WPM is correct
incorrect characters do not increase WPM
incorrect attempts lower accuracy
zero-attempt accuracy calculation does not return NaN
Backspace itself does not affect accuracy
correcting an error does not erase the original accuracy penalty
removing a credited character removes current correct-character credit
correcting a removed position restores correct-character credit
partial words count toward WPM
incorrect characters do not block later correct input
80% accuracy meets the development threshold
79.99% accuracy does not meet the development threshold
late input after timeout is ignored
held-key repeat events are ignored, including when KeyboardEvent.repeat is true
separate physical presses of the same key still count
Ready-screen start key is not scored
first valid Typing-screen key starts the timer and is scored
```

---

### Unit Tests — Typing Engine

Required cases:

```text
correct character advances caret
incorrect character advances caret
incorrect character is marked incorrect
Backspace removes the most recent current-sentence character
Backspace moves caret backward
Backspace cannot move before the start of the current sentence
sentence completes after every expected position has an entered character
incorrect final character still completes the sentence
sentence completion loads the next sentence
sentence completion preserves cumulative score counters
Backspace cannot reopen the previous committed sentence
passage order remains deterministic
```

---

### Unit Tests — Ranking

Required cases:

```text
higher displayed WPM ranks first
accuracy breaks displayed-WPM ties
earlier createdAt breaks remaining ties
scores below minimum accuracy are excluded
rank is derived rather than stored
Top 10 selection is correct
Top 5 selection is correct
high score is the first eligible ranked score
```

---

### Unit Tests — Events

Required cases:

```text
fresh event is created with selected duration
fresh event stores current passageSetId
fresh event starts with no scores
starting fresh archives the previous active event
starting fresh preserves prior event data
starting fresh preserves prior scores
activeEventId changes to the new event
continue restores the active event
continue does not create a new event
continue restores existing scores
duration persists when continuing
passageSetId persists when continuing
Continue is unavailable when no valid active event exists
```

---

### Unit Tests — Passages

Required cases:

```text
passage set has a stable ID
passage set is not empty
all sentence entries are strings
sentence order is deterministic
passage set contains enough total text for fast 60-second tests
```

Content validation should also check the intended character-length range where useful.

The final one-line fit must still be verified visually on the target iPad because character count alone cannot guarantee rendered width.

---

### Persistence Tests

Verify IndexedDB behavior independently of UI rendering.

Required cases:

```text
event can be written and read
score can be written and read
multiple scores can be retrieved by eventId
settings can save activeEventId
settings can restore activeEventId
nickname persists after update
fresh event does not delete archived events
fresh event does not delete old scores
leaderboard can be reconstructed from persisted scores
data survives page reload
```

---

### Component Tests

Use React Testing Library for high-value UI behavior rather than testing every visual detail.

Required cases:

```text
EventSetup disables Continue when no event exists
EventSetup can select 30-second mode
EventSetup can select 60-second mode
Ready screen responds to a key press
Ready-screen key is not passed into Typing as contestant input
Typing screen renders the full sentence before timer starts
Typing screen waits for first valid typing character before timer starts
Typing screen displays live WPM
Typing screen displays live accuracy
Typing screen displays remaining time
Top 10 result shows NicknameForm
non-Top-10 result does not show NicknameForm
nickname validation rejects empty values
Next Player returns to Ready
auto reset begins only on Leaderboard
auto reset does not run while nickname entry is active
Leaderboard renders no more than five rows
```

Do not over-test static decorative styling through component tests.

---

### Manual Layout Tests

Required on the actual target landscape iPad:

```text
Event Setup fits without clipping
Ready screen is readable from approximately two feet away
typing sentence remains on one line
typing sentence does not clip at either side
typing sentence remains visually centered
current-word highlight is visible
caret is easy to locate
incorrect-character state is distinguishable without relying only on color
live WPM is readable
timer is readable at bottom center
accuracy is readable
Results / Nickname layout fits
Top 5 leaderboard fits
Next Player is easy for the operator to use
```

Test all production passage sentences at the final font size.

Any sentence that does not safely fit on one line should be rewritten or removed rather than dynamically shrinking its font.

---

### Manual Giant-Keyboard Tests

Test with the actual giant physical keyboard.

Required cases:

```text
normal typing
fast typing
slow typing
incorrect typing
Backspace
multiple corrections
held key
repeated letters
spacebar input
punctuation input used by passages
button mashing
first key from Ready
first scored key on Typing
30-second test
60-second test
partial word at timeout
sentence transition
```

Use this testing to validate whether the provisional 80% leaderboard accuracy threshold is appropriate.

Do not treat 80% as final until giant-keyboard testing is complete.

---

### Offline / Airplane-Mode Test

Before V1 is considered finished:

```text
1. Connect the target iPad to the internet.
2. Open the deployed HTTPS app.
3. Allow the app and required assets to finish loading/caching.
4. Add the app to the Home Screen.
5. Launch the installed PWA once while online.
6. Enable airplane mode.
7. Close and relaunch the installed PWA.
8. Create a fresh event.
9. Complete a full typing test.
10. Save a qualifying nickname.
11. Confirm the leaderboard updates.
12. Use Next Player.
13. Complete another test.
14. Close the app.
15. Reopen the app while airplane mode remains enabled.
16. Continue the active event.
17. Confirm previously saved scores remain.
18. Confirm the high score remains correct.
19. Confirm the Top 5 is reconstructed.
20. Confirm passages, fonts, icons, and required visual assets still load.
```

Repeat the test with a previously created event to verify **Continue Previous Event** also works fully offline.

---

### Definition of Testing Complete

Testing for V1 is complete only when:

- all required scoring unit tests pass
- all required typing-engine unit tests pass
- all required ranking tests pass
- all required event tests pass
- persistence tests pass
- high-value component tests pass
- final passage layout has been checked on the actual iPad
- giant-keyboard behavior has been tested
- the minimum accuracy threshold has been reviewed using real keyboard behavior
- the full booth workflow passes in airplane mode
- saved event and score data survive offline app relaunch
- no known issue prevents reliable repeated contestant use

---

