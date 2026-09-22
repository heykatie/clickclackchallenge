# Typing Test — V1 Product Requirements Document

## 1. Overview

The **Typing Test** is an offline-first typing competition designed for repeated use at event booths with a giant physical keyboard connected to a landscape iPad.

The app replaces the current workflow of using a generic browser typing test, manually refreshing the page between contestants, and manually tracking the high score.

V1 is focused on a fast, reliable booth experience that works even when event Wi-Fi is unavailable or unstable.

The interface should follow:

- `docs/DESIGN_SYSTEM.md`
- wireframes in `docs/wireframes/`
- the technical implementation details in `docs/TECHNICAL_PLAN.md`

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
- enter a nickname if they qualify for the Top 10
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
- no integrated nickname flow
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
8. support a Top 10 nickname flow
9. display a Top 5 leaderboard
10. remove the need for browser refreshes between contestants
11. reset cleanly for the next contestant
12. maintain a simple, readable landscape-iPad interface
13. use a deterministic passage sequence for fair competition
14. follow the documented visual design system

---

## 6. V1 Scope

### In Scope

V1 includes:

- event setup
- 30-second mode
- 60-second mode
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
- deterministic local passage sequence
- results screen
- high-score detection
- minimum leaderboard accuracy requirement
- Top 10 nickname eligibility
- nickname entry
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
- contestant-selectable game modes
- advanced anti-cheat systems
- operator score deletion
- multiple-device event management

---

## 7. User Flow

### Event Setup

```text
operator opens app
→ selects 30 seconds or 60 seconds
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
→ nickname entry if Top 10 eligible
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

As a qualifying contestant, I want to enter a nickname so my result can appear on the leaderboard.

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
- start a fresh event
- continue the current/most recently active event when one exists

### Start Fresh

Starting fresh should:

- create a new event
- use the selected duration
- begin with an empty leaderboard
- preserve previous event data
- make the new event the active event

Starting fresh must **not** permanently delete prior scores or events.

### Continue Previous Event

Continuing should:

- reopen the current/most recently active event
- retain all existing scores
- retain its leaderboard
- retain its original duration
- retain its passage set

If no previous event exists, the Continue option should be unavailable.

If the operator wants to change the test duration, they should start a fresh event.

---

## 10. Ready / Attract Screen

The Ready screen should clearly communicate the contest and current high score.

Required content:

```text
GIANT keyboard typing contest!

Type above 50 WPM for a Plinko drop.

CURRENT HIGH SCORE

PRESS ANY KEY TO START
```

When a high score exists, show:

- nickname
- WPM

The Ready screen must **not** show:

- Top 5 leaderboard
- Start button
- operator settings

### Start Behavior

Any key may transition from Ready to Typing.

The key used to leave the Ready screen:

- must not start the timer
- must not count as typed input
- must not affect WPM
- must not affect accuracy

The Typing screen appears first.

The timer starts only when the contestant presses the first valid typing character on the Typing screen.

---

## 11. Typing Screen Requirements

The Typing screen should be visually restrained so the contestant can focus on the sentence.

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
- current word: lavender
- caret: strong mint
- upcoming text: muted gray
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
- is not prompted for a leaderboard nickname

### Ranking and Ties

Leaderboard ranking uses:

1. displayed WPM descending
2. accuracy descending
3. earlier submission first

Accuracy acts as a tie-breaker when displayed WPM is equal.

### Held-Key Behavior

Holding a key should not generate multiple scored attempts from browser key-repeat behavior.

Each physical keypress should count as one typing attempt.

---

## Data and Persistence Rules

### Event Data

Each event should be stored as a separate record.

An event must retain:

- a unique event ID
- the selected test duration
- the passage-set version used for that event
- whether the event is currently active or archived
- the event creation time
- the event's most recent update time

A human-readable event name may be supported later, but it is not required for V1.

The event's creation timestamp is sufficient to preserve its date and time.

### Score Data

Each completed score belongs to exactly one event.

A score should retain:

- a unique score ID
- the event ID it belongs to
- nickname, when applicable
- final WPM
- final accuracy
- score submission time

The technical implementation may retain additional scoring details such as raw WPM, correct-character counts, and correct/incorrect attempt counts.

Top 5 and Top 10 status should not be permanently stored on a score because rankings may change as new scores are added.

Leaderboard position should always be derived from the event's saved scores.

### Active Event Settings

The app should keep track of the currently active event so the operator can continue it later.

Settings may also remember convenience preferences such as the most recently selected duration.

An existing event's saved duration remains the source of truth when that event is continued.

Changing the duration requires starting a fresh event.

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

Passage content is bundled with the app, while each event stores only the identifier of the passage-set version it used.

### Persistence Requirements

The following data must survive:

- browser refresh
- closing and reopening the installed app
- temporary loss of connectivity
- normal iPad restart

Persist:

- events
- scores
- nicknames
- active-event reference
- event duration
- passage-set identifier
- app settings required to continue an event

The leaderboard itself does not need to be stored separately.

It should be recalculated from the event's saved scores.

A partially completed contestant test does not need to be restored if the app closes unexpectedly. Returning to the Ready screen is acceptable.

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

The current Ready-screen message is:

```text
Type above 50 WPM for a Plinko drop.
```

Prize qualification and leaderboard qualification are separate rules.

Based on the current wording, a contestant qualifies when their displayed WPM is greater than 50.

```text
51 WPM or higher → qualifies
50 WPM           → does not qualify
```

If the intended business rule is actually **50 WPM or higher**, the rule and UI copy should be changed together before the event.

Leaderboard accuracy requirements do not automatically determine prize qualification unless the operator chooses to make that a future rule.

---

## 14. Passage Rules

### Passage Source

All typing passages must be prewritten and bundled locally with the application.

V1 must not depend on:

- API-generated passages
- AI-generated passages
- internet-loaded text
- runtime-generated sentence content

This ensures the typing test works fully offline and uses consistent text across contestants.

### Sentence Style

Passages should use natural, grammatical English sentences.

Sentences should:

- use common everyday vocabulary
- avoid obscure or highly technical words
- avoid unnecessary proper nouns
- avoid numbers in V1
- use simple punctuation
- favor normal sentence structure
- be easy to read quickly

Random disconnected word lists should not be used.

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

All contestants within the same event must receive the same ordered sentence sequence.

Example:

```text
Contestant A:
Sentence 1 → Sentence 2 → Sentence 3 → ...

Contestant B:
Sentence 1 → Sentence 2 → Sentence 3 → ...
```

Sentences should not be randomly shuffled for each contestant in V1.

This keeps text difficulty consistent across competitors and makes leaderboard scores more directly comparable.

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

### Passage Length

The bundled passage set must contain enough text for both 30-second and 60-second tests, including fast typists.

Initial V1 target:

- at least 25–30 curated sentences
- at least approximately 1,200–1,500 total characters

Both 30-second and 60-second tests should use the same sentence sequence.

The 30-second test simply ends earlier.

### One-Line Requirement

Every sentence must fit completely on one line at the final typing-screen font size on the target landscape iPad.

The app should not dynamically shrink the font to fit individual sentences.

If a sentence does not fit within the safe typing area, the sentence should be rewritten or removed.

### Passage Set Versioning

Each passage collection should have a stable identifier so events can retain which text set was used.

Example:

```text
common-sentences-v1
```

If the passage set changes later, create a new version rather than silently replacing the existing set.

Example:

```text
common-sentences-v2
```

---

## 15. Results and Nickname Screen

The Results screen should display:

- final WPM
- final accuracy
- new-high-score status when applicable
- Plinko qualification status when applicable
- Top 10 qualification status when applicable

Results and nickname entry should remain on the **same screen**.

### Top 10 Qualification

If the contestant's score:

- meets the minimum accuracy threshold, and
- ranks within the event's Top 10

then show nickname entry.

If the contestant does not qualify for the Top 10, nickname entry should not be shown.

### Nickname Rules

Nickname input should:

- allow any nickname
- trim leading/trailing whitespace
- reject empty values
- use a reasonable maximum length for layout safety
- display nickname content as plain text

Recommended maximum:

```text
20 characters
```

Automatic next-player reset must not interrupt nickname entry.

---

## 16. Leaderboard

The visible leaderboard should show:

```text
Top 5
```

Each leaderboard row should include:

- rank
- nickname
- displayed WPM

The leaderboard may:

- emphasize rank #1
- highlight the newest contestant if they are in the Top 5

The leaderboard should not expose:

- raw character counts
- internal IDs
- database metadata

Only scores meeting the minimum accuracy threshold are eligible for ranking.

---

## 17. High Score

The current high score is the rank #1 eligible score for the active event.

The Ready screen should show:

- high-score WPM
- nickname

If the active event has no eligible scores yet, show an empty state such as:

```text
Be the first high score!
```

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
approximately 10 seconds
```

The exact duration may be adjusted after booth testing.

Reset contestant-specific state:

- typed text
- sentence position
- timer
- live WPM
- live accuracy
- current result
- nickname field

Preserve event state:

- active event
- duration
- passage set
- scores
- high score
- leaderboard

Automatic reset should begin only after the Leaderboard screen is shown.

It should not run while nickname entry is still in progress.

---

## 19. Offline Requirements

The app must work fully offline after being installed or cached on the iPad beforehand.

Required offline assets include:

- HTML
- CSS
- JavaScript
- fonts
- logo
- icons
- required images
- passages

Scores must save locally without connectivity.

Core gameplay must not require:

- API calls
- a backend
- remote fonts
- remote passage content
- live internet access

Before V1 is considered complete, the app must be tested on the actual iPad in airplane mode.

Required offline test:

```text
open installed app
→ create or continue event
→ start test
→ complete test
→ save result
→ view leaderboard
→ close app
→ reopen app
→ confirm event and score still exist
```

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
- nicknames
- active event
- event duration
- passage-set identifier

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
- explicit nickname input label
- reduced-motion support where animation is used

The contestant's primary interaction method is the physical keyboard.

The operator must still be able to use touch controls.

---

## 22. Visual Design Requirements

The visual design must follow:

```text
docs/DESIGN_SYSTEM.md
```

Core direction:

- playful
- handmade
- pastel
- friendly
- rounded
- slightly retro
- light and airy
- visually appropriate for an event booth
- readable from approximately two feet away

Primary visual hierarchy:

1. blush / white backgrounds
2. mint / aqua
3. lavender
4. soft pink
5. peach
6. charcoal text

Recommended font roles:

```text
Fredoka                display text
Nunito                 general UI
Atkinson Hyperlegible  typing sentence
```

Visual motifs may include:

- organic pastel edge shapes
- loose swirls
- stars / sparkles
- dots
- simple doodles
- rounded rectangles
- keycap-like forms

Avoid:

- dark gamer UI
- black backgrounds
- neon RGB styling
- heavy gradients
- heavy shadows
- sharp corporate layouts
- clutter during the typing screen

The typing screen should remain substantially more restrained than the Ready, Results, and Leaderboard screens.

---

## 23. V1 Acceptance Criteria

V1 is accepted when all of the following are true.

### Event Setup

- operator can select 30 seconds
- operator can select 60 seconds
- operator can start a fresh event
- fresh event starts with an empty leaderboard
- old event data remains stored
- operator can continue an existing event
- continued event retains duration
- continued event retains passage set
- continued event retains scores

### Ready

- Ready screen displays required contest messaging
- Ready screen shows current high score when available
- Ready screen does not show Top 5
- Ready screen has no Start button
- any key transitions to Typing
- the Ready-screen key is not scored

### Typing

- full sentence is visible before timing begins
- first valid typing character starts the timer
- that first typing character is scored
- only one sentence is visible
- sentence stays on one line
- sentence does not clip
- current word is visually highlighted
- caret tracks exact character position
- incorrect characters are visibly distinct
- live WPM displays
- live accuracy displays
- timer displays at bottom center
- 30-second mode ends correctly
- 60-second mode ends correctly
- held-key browser repeat does not generate repeated attempts

### Scoring

- WPM uses correct characters only
- incorrect characters do not inflate WPM
- accuracy uses correct and incorrect attempts
- Backspace itself does not change accuracy
- corrected mistakes retain the original accuracy penalty
- correct characters in partial words count
- errors do not have to be corrected before advancing
- minimum leaderboard accuracy threshold is enforced
- ranking uses displayed WPM, then accuracy, then earlier submission
- prize/Plinko result follows the configured WPM rule

### Passages

- passages are bundled locally
- passages use natural grammatical sentences
- passages use common vocabulary
- passages are similar in difficulty
- all contestants in the same event receive the same sequence
- passage set contains enough text for fast 60-second contestants
- every sentence fits on one line at the final iPad layout
- passage set has a stable version identifier

### Results / Nickname

- final WPM displays
- final accuracy displays
- high-score state displays when applicable
- Top 10 qualification is calculated correctly
- Top 10 contestants can enter nickname
- non-Top-10 contestants are not prompted for nickname
- nickname entry is on the Results screen
- nickname entry is not interrupted by automatic reset

### Leaderboard

- only eligible scores participate in ranking
- Top 5 displays correctly
- ties are deterministic
- high score updates correctly
- Next Player returns to Ready
- automatic reset returns to Ready
- active event scores remain intact after reset

### Persistence / Offline

- scores survive page reload
- scores survive app close/reopen
- active event survives app restart
- app launches without Wi-Fi after installation/caching
- full contestant flow works in airplane mode
- required fonts/assets/passages work offline

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
