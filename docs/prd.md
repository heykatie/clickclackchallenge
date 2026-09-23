# Typing Test — V1 Product Requirements Document

This file owns product behavior: scoring, the accuracy gate, ranking, name rules, continue-event duration, reset timing, what must persist, the requirement that the booth works offline, and the booth acceptance tests.

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

## 1. Overview

The **Typing Test** is an offline-first typing competition designed for repeated use at event booths with a giant physical keyboard connected to a landscape iPad.

The app replaces the current workflow of using a generic browser typing test, manually refreshing the page between contestants, and manually tracking the high score.

V1 is focused on a fast, reliable booth experience that works even when event Wi-Fi is unavailable or unstable.

The interface should follow:

- `docs/design_system.md`
- wireframes in `docs/wireframes/`
- the technical implementation details in `docs/technical_plan.md`

---

## 2. Problem

The current booth workflow relies on a generic browser typing test.

This creates several issues:

- the page must be manually refreshed or reset between contestants
- the high score is tracked manually
- the generic test is not designed for the booth's giant keyboard
- the visual design does not match the intended event experience
- event Wi-Fi may be unavailable or unreliable
- generic typing sites may require internet access
- the current workflow creates unnecessary friction between contestants
- prize qualification and leaderboard behavior are not integrated into the test

The custom Typing Test should provide a complete booth-specific flow from contestant start through scoring, leaderboard display, and reset.

---

## 3. Users

### Primary User — Contestant

A visitor at an event booth who uses the giant physical keyboard to complete a timed typing test.

Contestants should be able to:

- understand the challenge immediately
- start without touching the iPad
- type continuously without unnecessary interruptions
- see live WPM, accuracy, and remaining time
- see their final result
- enter a name if they qualify for the Top 10
- see the Top 5 leaderboard

### Secondary User — Booth Operator

The person running the booth.

The operator should be able to:

- select a 30-second or 60-second event
- start a fresh event leaderboard
- continue the current/most recently active event
- use the app repeatedly without browser refreshes
- retain event scores between contestants
- continue operating without internet access

---

## 4. Current Workflow and Pain Points

Current workflow:

```text
open generic typing website
→ contestant types
→ operator reads result
→ operator manually tracks high score
→ operator refreshes/resets website
→ next contestant
```

Pain points:

- unnecessary manual work
- inconsistent reset behavior
- no persistent local event leaderboard
- no integrated name flow
- no integrated Top 5 display
- no booth-specific prize messaging
- no guaranteed offline operation
- no visual connection to the event's branding/design direction

---

## 5. Goals

V1 should:

1. provide a reliable typing test for the giant physical keyboard
2. work fully offline after being installed/cached
3. support both 30-second and 60-second event modes
4. calculate WPM and accuracy consistently
5. prevent incorrect typing from inflating WPM
6. prevent very low-accuracy button mashing from entering the leaderboard
7. retain event scores locally
8. support a Top 10 name flow
9. display a Top 5 leaderboard
10. remove the need for browser refreshes between contestants
11. reset cleanly for the next contestant
12. maintain a simple, readable landscape-iPad interface
13. keep each game mode fair: Race uses one sentence sequence, and Standard draws from one fixed word list
14. follow the documented visual design system

---

## 6. V1 Scope

### In Scope

V1 includes:

- event setup
- 30-second mode
- 60-second mode
- operator-selected Standard and Race game modes
- fresh event creation
- continue previous/current active event
- Ready / Attract screen
- press-any-key start behavior
- timed typing screen
- live WPM
- live accuracy
- countdown timer
- character-level error feedback
- Backspace support
- Race sentence sequence, the same for every attempt
- Standard word list, with a new draw for each attempt
- results screen
- high-score detection
- minimum leaderboard accuracy requirement
- Top 10 name eligibility
- name entry
- Top 5 leaderboard
- Next Player action
- automatic reset after leaderboard display
- local event persistence
- local score persistence
- offline PWA operation
- landscape-iPad layout
- locally bundled fonts, passages, and required visual assets

### Out of Scope

V1 does not include:

- user accounts
- authentication
- online multiplayer
- cloud synchronization
- cross-device leaderboard synchronization
- backend API
- Flask
- SQLAlchemy
- PostgreSQL
- storefront integration
- e-commerce
- historical-event management UI
- detailed analytics
- AI-generated passages
- contestants choosing their own game mode
- advanced anti-cheat systems
- operator score deletion
- multiple-device event management

---

## 7. User Flow

### Event Setup

```text
operator opens app
→ selects 30 seconds or 60 seconds
→ selects Standard or Race
→ selects Start Fresh or Continue Previous Event
→ event begins
→ Ready screen
```

### Contestant Flow

```text
Ready
→ press any key
→ Typing screen appears
→ first valid typing key starts timer
→ contestant types
→ timer expires
→ Results screen
→ Save Score, or View Leaderboard with no name, if Top 10 eligible; otherwise View Leaderboard
→ Leaderboard
→ Next Player or automatic reset
→ Ready
```

No browser refresh should be required between contestants.

---

## 8. User Stories

### Contestant

As a contestant, I want to understand the challenge quickly so I can start without needing instructions from the operator.

As a contestant, I want to start using the giant keyboard so I do not need to touch the iPad.

As a contestant, I want the sentence visible before the timer starts so I am not losing time while the screen changes.

As a contestant, I want typing feedback that clearly shows where I am and where I made mistakes.

As a contestant, I want to see my WPM, accuracy, and remaining time while I type.

As a contestant, I want to see my result immediately when time expires.

As a qualifying contestant, I want to enter a name so my result can appear on the leaderboard.

### Booth Operator

As an operator, I want to choose 30 or 60 seconds before the event starts.

As an operator, I want to start a fresh leaderboard without deleting old event data.

As an operator, I want to continue the active event and retain all existing scores.

As an operator, I want the test to reset itself for the next contestant.

As an operator, I want the app to work without Wi-Fi.

---

## 9. Event Setup Requirements

The Event Setup screen must allow the operator to:

- select `30 seconds` or `60 seconds`
- select a game mode: `Standard` or `Race`
- start a fresh event
- continue the current/most recently active event when one exists

When Event Setup opens and no event exists, Start Fresh, `30 seconds`, and Race are selected. Continue is unavailable.

When an event already exists, including when the operator returns from Ready, Typing, Results, or the Leaderboard, Continue is selected. The duration control shows that event's stored duration. The game mode control shows that event's stored mode.

### Start Fresh

Starting fresh should:

- create a new event
- use the selected duration
- use the selected game mode
- begin with an empty leaderboard
- preserve previous event data
- make the new event the active event

Starting fresh must **not** permanently delete prior scores or events.

### Continue Previous Event

Continuing should:

- reopen the current/most recently active event
- retain all existing scores
- retain its leaderboard
- use the duration and game mode selected on this screen for the next contestant

If no previous event exists, the Continue option should be unavailable.

`30 seconds` and `60 seconds` stay selectable while Continue is selected. `Standard` and `Race` stay selectable too. Either choice applies to the next contestant. It does not archive the event, clear the leaderboard, or rewrite the duration, game mode, passage set, or WPM stored on earlier scores. A test that has already started keeps the duration and game mode it began with. Start fresh remains the way to open an empty leaderboard.

### Returning to Event Setup

After Start Event, a long-press on the logo-only badge opens Event Setup from Ready, Typing, Results, and the Leaderboard. The active event stays as it is. An attempt that has not been saved is discarded. Keyboard input does not open Event Setup. Ready still shows no operator settings.

---

## 10. Ready / Attract Screen

The Ready screen should clearly communicate the contest and current high score.

Required strings live in `docs/design_system.md` (Brand voice).

When a high score exists, show the name and WPM from the eligible rank #1 score.

Ready does not need to show the test duration. The Typing screen shows the remaining time before the timer starts.

The Ready screen must **not** show:

- the event Top 5
- Start button
- operator settings

After 2 minutes with no key and no tap, and only when at least one qualifying score exists, Ready is replaced by a rolling all-time list. A score qualifies when it meets the accuracy gate and its displayed WPM is at least 1. The list includes qualifying scores from archived events and keeps at most 50. Escape or Space returns to Ready and does not start the test. Any other key or a tap does the same. The next key starts it, the same way a key does from the normal Ready screen.

### Start Behavior

Any key except Escape may transition from Ready to Typing. Escape is the key that leaves a typing session for Ready, so it does not start a test.

The key used to leave the Ready screen:

- must not start the timer
- must not count as typed input
- must not affect WPM
- must not affect accuracy

The Typing screen appears first.

The timer starts only when the contestant presses the first valid typing character on the Typing screen.

If that key has not been pressed within 5 seconds, Ready appears again. No score is saved. Keys that do not start the timer do not reset those 5 seconds.

---

## 11. Typing Screen Requirements

The Typing screen should be visually restrained so the contestant can focus on the sentence.

A long-press on the logo badge opens Event Setup and does not save a score. That works while the sentence is waiting and after the timer has started. The attempt in progress is discarded.

Escape returns to Ready and does not save a score. That also works while the sentence is waiting and after the timer has started. The attempt in progress is discarded. Escape does not start the timer and does not count as a typed character.

The first valid typing key is the first printable character. Letters, spaces, and punctuation count. Digits count too, and a digit that is not in the passage is an incorrect attempt. These keys do not start the timer and are not that first attempt: Shift, Control, Option/Alt, Command/Meta, Caps Lock, Tab, Escape, arrow keys, and function keys. Backspace does not start the timer.

### Sentence

The typing sentence must:

- be fully visible before the timer starts
- appear as one complete sentence
- use one line only
- remain inside the safe content width
- be horizontally centered
- be visually centered as a complete text block
- use a consistent font size
- never dynamically shrink to fit an individual sentence

If a sentence does not fit at the standard typing size, the sentence should be rewritten or removed from the passage set.

### Character Feedback

The typing sentence should distinguish:

- completed correct text
- active/current word
- caret position
- upcoming text
- incorrect characters

Design behavior:

- completed text: charcoal
- current word: charcoal text on a light-lavender surface
- caret: strong mint
- upcoming text: charcoal
- incorrect character: accessible red plus a non-color indicator such as underline or background tint

The caret must appear at the contestant's exact character position.

### Live Stats

Display:

```text
bottom left   → live WPM
bottom center → remaining time
bottom right  → live accuracy
```

A subtle current high score may appear in the top-right.

The typing screen may retain the logo, but should not display the shop name if the final unbranded design is used.

---

## 12. Scoring Rules

### WPM

WPM is calculated from correctly typed characters:

```text
WPM = (correctCharacters / 5) / elapsedMinutes
```

Rules:

- five correct characters count as one standard word
- correct letters, spaces, and punctuation count toward WPM
- incorrect characters do not increase WPM
- correct characters in a partially completed word still count
- final WPM uses the configured test duration
- WPM is displayed as a rounded whole number

### Accuracy

Accuracy is calculated from typing attempts:

```text
Accuracy =
correctAttempts /
(correctAttempts + incorrectAttempts)
× 100
```

Rules:

- correct character attempt → counts as a correct attempt
- incorrect character attempt → counts as an incorrect attempt
- Backspace itself does not count as a typing attempt
- correcting a mistake does not erase the original incorrect attempt
- accuracy should be hidden or shown as `—%` before the contestant begins typing
- do not display 100, or any other percentage, when there have been no attempts
- accuracy is displayed as a rounded whole number, the same way WPM is

### Character-Level Scoring

Scoring is based on individual characters rather than requiring an entire word to be correct.

Example:

```text
Expected: house
Typed:    housr
```

Result:

```text
h → correct
o → correct
u → correct
s → correct
r → incorrect
```

The contestant receives credit for four correct characters.

### Incorrect Characters

Incorrect characters:

- are visually marked
- do not contribute to WPM
- count against accuracy
- do not block the contestant from continuing

Contestants are not required to correct errors before advancing.

### Backspace

Backspace is allowed.

Backspace:

- removes the most recently entered character in the current sentence
- moves the caret backward one position
- does not count toward WPM
- does not count as a typing attempt
- allows a corrected character to receive correct-character credit
- does not erase the original incorrect attempt from accuracy

Backspace applies only to the currently displayed sentence.

Once a completed sentence has been replaced by the next sentence, the previous sentence is committed and cannot be edited.

### Partial Words

If the timer expires before the contestant finishes the current word, all correct characters typed before timeout still count toward WPM.

Example:

```text
Expected: keyboard
Typed before timeout: keybo
```

If all five characters are correct, all five count.

### Minimum Leaderboard Accuracy

A score must meet a minimum accuracy threshold to participate in leaderboard ranking.

Initial V1 development threshold:

```text
80% accuracy
```

This value is provisional and should be validated using the physical giant keyboard before being treated as final.

A contestant below the threshold:

- still sees their WPM
- still sees their accuracy
- does not qualify for leaderboard ranking
- is not prompted for a leaderboard name

A score that displays as 0 WPM also stays off every board, including the event Top 5 and the all-time roll. 1 WPM still qualifies when accuracy passes. On Results, that 0 WPM attempt shows “Casper, is that you?” and no place line, Plinko line, or name field.

### Ranking and Ties

Leaderboard ranking uses:

1. displayed WPM descending
2. displayed accuracy descending
3. earlier submission first

Displayed accuracy is the rounded whole number the contestant sees. It is not a second stored field. Two scores that round to the same whole percent are tied on accuracy, and the earlier submission ranks first. Hidden tenths do not order them.

The accuracy gate still uses the stored percentage. A score of 79.99% is not eligible, even though it displays as 80%.

### Held-Key Behavior

Holding a key should not generate multiple scored attempts from browser key-repeat behavior.

Each physical keypress should count as one typing attempt.

---

## Data and Persistence Rules

### Event Data

Each event should be stored as a separate record.

An event must retain:

- a unique event ID
- the selected test duration for the next contestant
- the selected game mode for the next contestant
- the passage-set version for that mode
- whether the event is currently active or archived
- the event creation time
- the event's most recent update time

V1 does not store a human-readable event name. Add that field only when an event-history screen exists.

The event's creation timestamp is sufficient to preserve its date and time.

### Score Data

Each completed score belongs to exactly one event.

A score should retain:

- a unique score ID
- the event ID it belongs to
- name, when the contestant saves one
- null name when a Top 10 contestant leaves through View Leaderboard
- final WPM
- final accuracy
- the duration of the attempt that produced the WPM
- the game mode of that attempt
- the passage-set version of that attempt
- score submission time

The technical implementation may retain additional scoring details such as raw WPM, correct-character counts, and correct/incorrect attempt counts. Ranking uses the stored WPM. It does not recalculate an earlier score from the event's later duration or game mode.

Top 5 and Top 10 status should not be permanently stored on a score because rankings may change as new scores are added.

Leaderboard position should always be derived from the event's saved scores.

### Active Event Settings

The app should keep track of the currently active event so the operator can continue it later.

Settings may also remember convenience preferences such as the most recently selected duration.

The event's saved duration and game mode are what the next contestant will use. The operator can change either while continuing the event. Each score keeps the duration, game mode, passage set, and WPM of the attempt that produced it. Ranking uses those stored results.

Changing the duration or game mode does not start a fresh event. Start fresh is only for an empty leaderboard.

### Fresh Leaderboard Behavior

Choosing **Start Fresh** creates a new event with an empty leaderboard.

It must not delete previous event data.

Expected behavior:

```text
current active event
→ becomes archived

new event
→ created
→ becomes active
→ starts with no scores
```

All scores from older events remain stored locally.

Therefore:

> A fresh leaderboard means starting a new event, not deleting old scores.

### Continue Event Behavior

Choosing **Continue Previous Event** should restore the active event and its existing data.

This includes:

- event duration
- passage-set version
- saved scores
- current high score
- leaderboard ranking

If there is no previous event available, the Continue option should be disabled.

### Data Relationships

Each event may have many scores.

Each score belongs to one event.

Conceptually:

```text
Event
├── Score
├── Score
├── Score
└── Score
```

The app's settings point to the currently active event.

Passage content is bundled with the app. The event stores the game mode and passage-set identifier for the next contestant. Each score stores the mode and passage-set identifier from the attempt that earned it.

What must survive a refresh, restart, or loss of connectivity is in §20. Persistence Requirements.

### Historical Data Retention

V1 should retain old event records and their scores even though it does not include a historical-event management screen.

Starting a new event must not overwrite or permanently delete previous events.

This preserves the data for:

- future event-history features
- future analytics
- future cloud synchronization
- debugging or recovery if needed

---

## 13. Prize / Plinko Rule

The Ready-screen prize string is in `docs/design_system.md` (Brand voice).

Prize qualification and leaderboard qualification are separate rules.

A contestant qualifies when their displayed WPM is greater than 50.

```text
51 WPM or higher → qualifies
50 WPM           → does not qualify
```

If the intended business rule is actually **50 WPM or higher**, the rule and UI copy should be changed together before the event.

Leaderboard accuracy requirements do not automatically determine prize qualification unless the operator chooses to make that a future rule.

---

## 14. Passage Rules

### Passage Source

Race sentences and the Standard word list are bundled locally with the application. Standard lines are assembled from that word list when an attempt starts. That assembly does not use the network.

V1 must not depend on:

- API-generated passages
- AI-generated passages
- internet-loaded text
- runtime-written Race sentences

### Sentence Style

Race passages should use natural, grammatical English sentences.

Sentences should:

- use common everyday vocabulary
- avoid obscure or highly technical words
- avoid unnecessary proper nouns
- avoid numbers in V1
- use simple punctuation
- favor normal sentence structure
- be easy to read quickly

Standard is the word-list mode. Its lines are lowercase, have no punctuation, and are drawn from the bundled 200 most common English words.

### Difficulty Consistency

Sentences should be reasonably similar in typing difficulty.

Difficulty should be controlled through:

- similar sentence length
- common vocabulary
- similar average word length
- simple punctuation
- normal capitalization
- avoiding unusually long or rare words

Initial target sentence length:

```text
approximately 35–50 characters
```

This includes spaces and punctuation.

The final character limit should be validated using the final typing font and the actual landscape iPad.

### Event Fairness

Race uses one ordered sentence sequence for every attempt in the event.

Example:

```text
Contestant A:
Sentence 1 → Sentence 2 → Sentence 3 → ...

Contestant B:
Sentence 1 → Sentence 2 → Sentence 3 → ...
```

Race sentences are not shuffled per contestant. Every attempt, including a retake, starts again at the first sentence. That keeps Race difficulty consistent across competitors.

Standard uses the same list of the 200 most common English words for every attempt. Each attempt gets a new random draw from that list. Words are lowercase and have no punctuation. A line ends with the space that joins it to the next word, and that space is scored like any other character. The draw changes per attempt. The word list does not.

A score stores the mode, passage set, duration, and WPM from the attempt that earned it. Ranking uses that stored WPM. It does not recompute a Race score with the Standard word list, or a Standard score with the Race sentences. Standard and Race scores in the same event stay on one leaderboard.

### Sentence Progression

Only one sentence should be visible at a time.

When the contestant reaches the end of the current sentence:

```text
commit sentence
→ show next sentence
→ keep timer running
```

The app should not:

- pause between sentences
- display multiple sentences at once
- restart the timer between sentences
- repeat completed sentences during the same test

A sentence is considered complete when the contestant has entered a character for every position, even if some positions contain errors.

Race sentences are stored without a trailing space. After a Race sentence is committed, one space typed before the next sentence is ignored. It does not move the caret, change WPM, or change accuracy. The following character is scored normally, including when the contestant types the next letter with no space. A second space is an ordinary incorrect character. The first sentence does not ignore a leading space.

A Standard line includes the space after its last word. That space is a scored character. The same one-space ignore applies only to an extra space typed after the line is already complete.

### Passage Length

Both game modes must contain enough text for 30-second and 60-second tests, including fast typists.

Race target:

- at least 25–30 curated sentences
- at least approximately 1,200–1,500 total characters
- the same sentence sequence for 30-second and 60-second tests

Standard uses the same 200-word list for both durations. Each attempt builds enough lines for a fast 60-second test. The 30-second test simply ends earlier.

### One-Line Requirement

Every Race sentence and every Standard line must fit completely on one line at the final typing-screen font size on the target landscape iPad.

The app should not shrink one line relative to another. On a window narrower than that iPad, every line uses the same smaller size, chosen so the widest line still fits. The iPad size stays the standard size.

If a Race sentence does not fit within the safe typing area at the iPad size, the sentence should be rewritten or removed.

### Passage Set Versioning

Each passage collection should have a stable identifier so events can retain which text set was used.

Example:

```text
common-sentences-v1
common-words-v1
```

If the passage set changes later, create a new version rather than silently replacing the existing set.

Example:

```text
common-sentences-v2
```

---

## 15. Results and Name Screen

The Results screen should display:

- final WPM
- final accuracy
- new-high-score status when applicable
- Plinko qualification status when the contestant qualifies
- Top 10 qualification status when applicable

Show “You win a Plinko drop!” only when displayed WPM is above 50. Omit the line otherwise. Qualification is in §13. The headline is “Casper, is that you?” when displayed WPM is 0, with no place line and no Plinko line. It is “NEW HIGH SCORE!” for rank 1, with no Top 5 line. It is “Nice typing!” for another Top 5 result, a Top 10 result, or any result above 50 WPM. It is “Thanks for playing!” when the attempt is outside the Top 10 and the displayed WPM is 1 through 50. Places 2 through 5 add “You made the Top 5!” Top 10 outside the five adds “You made the Top 10!” A Top 5 or Top 10 score above 50 shows the place line and the Plinko line together. Rank 1 above 50 shows the Plinko line with “NEW HIGH SCORE!” only. The words are in `docs/design_system.md` (Brand voice).

Results and name entry should remain on the **same screen**.

### Top 10 Qualification

If the contestant's score:

- meets the minimum accuracy threshold, and
- ranks within the event's Top 10

then show name entry.

If the contestant does not qualify for the Top 10, name entry should not be shown.

When name entry is not shown, Results shows one required action, View Leaderboard, which opens the Top 5. That screen has no idle timeout. A long-press on the logo badge opens Event Setup and does not write the score. Save Score and View Leaderboard remain the only ways a result is stored.

When name entry is shown, Save Score still rejects an empty name. View Leaderboard is also shown. It writes one score row with a null name and opens the Top 5. That score stays eligible for ranking. If the name is still empty after 15 seconds, Results shows “Opening the leaderboard in {n}s” for the last 5 seconds, then takes the same blank-name exit. Typing a name stops that countdown. Clearing the name starts the 15 seconds again. The leaderboard's return-to-ready countdown must not run during name entry. The labels are in `docs/design_system.md` (Brand voice).

### Name Rules

Name input should:

- allow any name
- trim leading/trailing whitespace
- reject empty values
- use a reasonable maximum length for layout safety
- display name content as plain text

The stored name is the trimmed value, up to the maximum below. A row may show an ellipsis when the name does not fit. That display does not change the stored value. The truncation is in `docs/design_system.md`.

Recommended maximum:

```text
20 characters
```

Automatic next-player reset must not interrupt name entry.

---

## 16. Leaderboard

The visible leaderboard should show:

```text
Top 5
```

Each leaderboard row should include:

- rank
- name, or a dash when the score has no name
- displayed WPM

Do not invent a name for a null name. A long name may be truncated in the row. The stored name stays complete. The dash and the ellipsis are in `docs/design_system.md`.

The leaderboard may:

- emphasize rank #1
- highlight the newest contestant if they are in the Top 5

The leaderboard should not expose:

- raw character counts
- internal IDs
- database metadata

Only scores that meet the accuracy gate and display at least 1 WPM are eligible for ranking. A displayed 0 WPM score stays off the board.

---

## 17. High Score

The current high score is the rank #1 eligible score for the active event.

The Ready screen should show:

- high-score WPM
- name, or a dash when that score has no name

If the active event has no eligible scores yet, show “Be the first high score!”

---

## 18. Next Player and Reset Behavior

The Leaderboard screen must include:

```text
NEXT PLAYER
```

Selecting Next Player should immediately return to the Ready screen.

The app should also automatically return to Ready after a short delay.

Initial target:

```text
approximately 15 seconds
```

Show “Returning to ready screen in {n}s” only for the last 5 seconds. The message is small. The exact duration may be adjusted after booth testing.

Reset contestant-specific state:

- typed text
- sentence position
- timer
- live WPM
- live accuracy
- current result
- name field

Preserve event state:

- active event
- duration
- game mode
- passage set
- scores
- high score
- leaderboard

Automatic reset should begin only after the Leaderboard screen is shown.

It should not run while name entry is still in progress.

---

## 19. Offline Requirements

The Typing Test must support the complete booth workflow without an active internet connection after the application has been successfully loaded, installed, and cached on the event iPad.

Offline operation is a core V1 requirement, not an optional enhancement.

### Offline Launch

After the app has been loaded and cached while online, it must be able to launch when:

- Wi-Fi is disabled
- cellular data is unavailable
- airplane mode is enabled
- event Wi-Fi is slow, unstable, or completely unavailable

The app must not require a network connection to reach or use:

- Event Setup
- Ready / Attract
- Typing
- Results / Name
- Leaderboard

A temporary or complete loss of connectivity must not prevent the booth from continuing to operate.

### Offline Contestant Flow

The complete contestant flow must work without connectivity:

```text
open app
→ create or continue event
→ Ready screen
→ press any key
→ Typing screen
→ complete typing test
→ calculate WPM and accuracy
→ determine leaderboard eligibility
→ enter name when eligible
→ save score locally
→ update leaderboard
→ show Leaderboard screen
→ reset for next contestant
```

No core gameplay action may depend on:

- a remote API
- a backend server
- a cloud database
- authentication
- a remote passage service
- remote fonts or required visual assets

### Required Offline Assets

All resources required for normal V1 booth operation must be bundled with the application or cached before offline use.

Required offline resources include:

- HTML
- CSS
- JavaScript
- typing passages
- fonts
- app icons
- logo
- required images
- decorative interface assets
- web app manifest
- other files required to render and operate the V1 experience

Typing passages must remain available offline.

Fonts required by the design system must remain available offline.

The app must not depend on Google Fonts, a CDN, or another remote source for assets that are required during booth operation.

### Offline Event and Score Persistence

All event and score data must save locally without connectivity. The records that must persist are in §20. Persistence Requirements.

A network connection must not be required to:

- create an event
- continue an event
- save a score
- save a name
- calculate the current high score
- calculate Top 10 eligibility
- generate the Top 5 leaderboard
- reset for the next contestant

The visible leaderboard should be derived from locally stored event scores.

### Persistence Across App Restarts

Data saved while offline must still be there when the app is reopened, including after a normal iPad restart. The operator must be able to continue the active event with its previously saved scores. What else must survive, including an in-progress test, is in §20.

### Connection Loss During Active Use

If internet connectivity disappears while the app is already running, the local booth workflow should continue normally.

The contestant must not be interrupted because of:

- Wi-Fi loss
- poor event Wi-Fi
- network timeout
- loss of internet access after the app has already launched

V1 should not display blocking network errors for functionality that does not require the network.

### Fresh and Continued Events While Offline

The operator must be able to start a fresh event while offline.

Starting fresh must:

- create a new local event
- begin with an empty leaderboard
- preserve prior event data
- make the new event active

The operator must also be able to continue the active event while offline.

Continuing must restore:

- event duration
- passage-set identifier
- saved scores
- current high score
- derived leaderboard

### Offline Readiness

The app should only be considered ready for event use after all required application resources have been successfully installed or cached.

If required offline assets are missing, the app should not falsely indicate that it is fully offline-ready.

If an offline-readiness indicator is included, it must reflect real cache and service-worker readiness. Chips in the wireframe PNGs are decoration and are not that indicator.

### PWA Installation Requirement

Before relying on the app at an event, the target iPad should be prepared while internet access is available.

Recommended preparation flow:

```text
1. Open the deployed HTTPS application in Safari.
2. Allow the application and required assets to finish loading.
3. Add the application to the iPad Home Screen.
4. Open the installed app at least once while online.
5. Confirm Event Setup and required visual assets load correctly.
6. Confirm the app has completed any required offline caching.
```

The app should not be considered event-ready until the airplane-mode acceptance test in the V1 Testing Plan has passed on the actual iPad.

### Offline Acceptance Criteria

V1 satisfies the offline requirement only when all of the following are true:

- the installed app launches with no internet connection
- Event Setup works offline
- a fresh event can be created offline
- an existing event can be continued offline
- passages load offline
- required fonts and visual assets load offline
- the Ready screen works offline
- the Typing screen works offline
- scoring works offline
- name entry works offline
- scores save offline
- the high score updates offline
- the Top 5 leaderboard updates offline
- Next Player works offline
- automatic reset works offline
- saved event data survives app close/reopen while offline
- saved event data survives a normal iPad restart
- the complete contestant flow passes in airplane mode on the target iPad

---

## 20. Persistence Requirements

The app should preserve event data across:

- browser refresh
- closing/reopening the installed PWA
- temporary network loss
- normal iPad restart

Persist:

- events
- scores
- names
- active-event reference
- event duration
- passage-set identifier
- app settings required to continue an event

A fresh event must not delete old event data.

Leaderboard state should be derived from persisted scores.

A partially completed contestant test does not need to be restored after the app closes unexpectedly. Returning to Ready is acceptable.

---

## 21. Accessibility Requirements

V1 should include:

- semantic buttons and inputs
- visible keyboard focus
- readable contrast
- large text
- large touch targets for operator controls
- error feedback that does not rely on color alone
- explicit name input label
- reduced-motion support where animation is used

The contestant's primary interaction method is the physical keyboard.

The operator must still be able to use touch controls.

---

## 22. Visual Design Requirements

Palette, typography, CSS tokens, and required contestant-facing strings live in `docs/design_system.md`.

Screen layout lives in `docs/wireframes.md`.

## V1 Testing Plan

Testing must verify that the Typing Test behaves correctly from the operator and contestant perspective and is reliable enough for repeated booth use.

These are the product-level acceptance tests for V1. The automated test map and hardware check lists live in `docs/technical_plan.md`.

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
- name entry is not shown
- the score cannot appear in the Top 5

A displayed 0 WPM score follows the same exclusion even when accuracy is 80% or higher. Results shows “Casper, is that you?” instead of a place.

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
2. displayed accuracy descending
3. earlier submission first
```

Displayed accuracy is the rounded whole number from §12. Do not sort these ties on the stored tenths.

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

### Top 10 Name Eligibility

**Given**

- the contestant meets the minimum accuracy threshold
- the completed score ranks within the event's Top 10

**When**

- the Results screen appears

**Then**

- name entry is shown
- the contestant may enter and save a name

If the contestant ranks outside the Top 10, name entry must not be shown.

---

### Non-Qualifier Leaves Results

**Given**

- the contestant does not qualify for the Top 10
- name entry is not shown

**When**

- the contestant selects View Leaderboard

**Then**

- the Top 5 leaderboard appears
- Results does not advance on its own

---

### Name Entry Is Not Interrupted

**Given**

- a qualifying contestant is entering a name

**When**

- they remain on the Results screen

**Then**

- automatic reset must not interrupt the name flow
- the contestant remains on Results until the name flow is completed

---

### Name Can Be Skipped

**Given**

- a qualifying contestant is on Results
- the name field is empty

**When**

- the contestant selects View Leaderboard

**Then**

- Save Score would still reject the empty name
- one score row is written
- its name is null
- that score stays eligible for ranking
- the Top 5 leaderboard appears
- automatic reset has not moved the screen on its own

---

### Typing Returns to Event Setup

**Given**

- the Typing screen is showing the sentence

**When**

- the logo badge is long-pressed

**Then**

- Event Setup opens
- the attempt is discarded
- no score is saved

This is the same before and after the timer starts.

### Escape Returns to Ready

**Given**

- the Typing screen is showing the sentence

**When**

- Escape is pressed

**Then**

- Ready appears
- the attempt is discarded
- no score is saved

Escape does not leave Ready for Typing.

### Waiting Typing Returns to Ready

**Given**

- the Typing screen is showing the sentence
- the timer has not started

**When**

- 5 seconds pass without a key that starts the timer

**Then**

- Ready appears
- no score is saved

Once the timer has started, those 5 seconds no longer apply.

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
- the event's current duration is shown, and the operator can select the other length for the next contestant
- the event's current game mode is shown, and the operator can select the other mode for the next contestant
- all saved scores remain available
- Start Event after a duration or game-mode change keeps the same event
- earlier scores keep the duration, game mode, passage set, and WPM from the attempt that earned them
- the high score is restored
- the Top 5 is recalculated from those stored results

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
- the name still exists when applicable
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

- Race starts every contestant at the same first sentence
- Race gives every contestant the same ordered sentence sequence
- Race passages are not shuffled per contestant
- Standard gives every attempt a new draw from the same 200-word list
- a score keeps the mode and WPM from the attempt that earned it

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

### Operator Returns to Event Setup

**Given**

- an event has already been started
- Ready, Typing, Results, or the Leaderboard is visible

**When**

- the operator long-presses the logo-only badge

**Then**

- Event Setup opens
- the active event is unchanged
- a keypress does not open Event Setup

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
- name input

The following must remain unchanged:

- active event
- duration
- game mode
- passage set
- saved scores
- current high score
- leaderboard

---

### Automatic Reset

**Given**

- the Leaderboard screen is visible
- name entry is no longer active

**When**

- the configured automatic-reset delay expires

**Then**

- the app returns to Ready
- contestant-specific state is cleared
- event-specific state remains intact

---

### Plinko Qualification

**Given**

- the Ready prize string in `docs/design_system.md` is the current wording

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
→ enter name when eligible
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
- names survive
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
Top 10 name behavior passes
Top 5 sorting passes
Plinko qualification passes
rank 1 shows NEW HIGH SCORE! and, above 50 WPM, You win a Plinko drop!
places 2 through 5 show Nice typing! and You made the Top 5!
places 6 through 10 show Nice typing! and You made the Top 10!
a Top 5 or Top 10 score above 50 WPM shows the place line and the Plinko line
a score outside the Top 10 at 1 through 50 WPM shows Thanks for playing! only
a displayed 0 WPM score shows Casper, is that you? and does not place
fresh event behavior passes
continue event behavior passes
score persistence passes
Race uses the same sentence sequence for every attempt
Standard draws each attempt from the same 200-word list
every Race sentence and Standard line fits on one line
Next Player reset passes
automatic reset passes
giant keyboard input passes
PWA launches offline
full airplane-mode flow passes
saved scores survive offline relaunch
```

If any core item fails, V1 should not be considered event-ready.

---


## 24. Non-Goals for V1

Do not delay V1 to add:

- cloud accounts
- cloud leaderboard sync
- backend infrastructure
- storefront integration
- historical-event UI
- detailed analytics
- AI-generated passages
- advanced fraud detection
- multiple simultaneous devices
- complex admin features
- manual leaderboard deletion
- large configuration systems

The priority is a reliable local booth workflow.

---

## 25. V1 Product Principle

The central requirement is:

> A contestant should be able to walk up, press the giant keyboard, complete the test, see the result, and hand the station to the next person without the operator needing to refresh the browser or depend on Wi-Fi.

When product decisions conflict, prioritize:

```text
reliability
fairness
clarity
fast turnover
offline operation
```

over unnecessary feature complexity.
