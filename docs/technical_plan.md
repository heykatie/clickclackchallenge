# Typing Test — V1 Technical Plan

## 1. Purpose

This document describes the technical implementation plan for the V1 **Typing Test**.

The product is an offline-first typing competition designed for repeated use on a **landscape iPad** connected to a giant physical keyboard at event booths.

The implementation must follow:

- `docs/PRD.md`
- `docs/DESIGN_SYSTEM.md`
- Wireframes in `docs/wireframes/`

V1 prioritizes:

1. Reliable booth operation
2. Offline use
3. Accurate scoring
4. Fast contestant turnover
5. Persistent event leaderboards
6. Simple, readable landscape-iPad UX
7. A codebase that demonstrates modern React + TypeScript engineering

---

# 2. V1 Technical Scope

## In Scope

V1 will use:

- React
- TypeScript
- Vite
- Progressive Web App (PWA)
- Service worker / offline asset caching
- IndexedDB for structured local persistence
- Local, bundled typing passages
- Local, bundled fonts and required visual assets
- Vitest for unit tests
- React Testing Library for component behavior where useful
- Static HTTPS deployment

V1 will support:

- 30-second and 60-second event modes
- Fresh event creation
- Continuing the most recently active event
- Ready / Attract state
- Typing state
- Results + nickname state
- Leaderboard state
- Automatic and manual next-player reset
- Offline operation after initial installation/load
- Persistent events and scores across app restarts

## Out of Scope

V1 will not require:

- Flask
- SQLAlchemy
- PostgreSQL
- Cloud leaderboard synchronization
- User accounts
- Authentication
- Online multiplayer
- Cross-device synchronization
- E-commerce
- Admin dashboard
- Historical-event management UI
- AI-generated passages
- Advanced anti-cheat detection
- Detailed analytics

These may be added after the conference.

---

# 3. Architecture Overview

```text
┌─────────────────────────────────────┐
│          React + TypeScript         │
│                                     │
│  Setup → Ready → Typing → Results   │
│                    → Leaderboard    │
└──────────────────┬──────────────────┘
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
   IndexedDB          PWA Service Worker
   local data          cached app shell
          │                 │
          ▼                 ▼
 events / scores      HTML / JS / CSS
 settings             fonts / icons
                      passages / assets
```

The core booth workflow must not depend on a server.

The application should remain functional when the iPad is:

- disconnected from Wi-Fi
- in airplane mode
- reopened from the Home Screen
- restarted between events

---

# 4. Recommended Stack

## Frontend

```text
React
TypeScript
Vite
```

Reasons:

- Fits the existing project skill set
- Strong alignment with current entry-level frontend/full-stack roles
- TypeScript adds useful compile-time safety
- Vite provides a simple build system and integrates well with PWA tooling

## PWA

Recommended package:

```text
vite-plugin-pwa
```

Use Workbox through `vite-plugin-pwa` to cache the application shell and required static assets.

## Local Database

Recommended package:

```text
idb
```

`idb` is a small Promise-based wrapper around IndexedDB.

IndexedDB is preferred over `localStorage` because the project stores structured data:

- multiple events
- multiple scores
- settings
- future historical event data

`localStorage` may be used only for non-critical trivial preferences if needed.

## Fonts

Fonts must be bundled with the app so they work offline.

Recommended packages:

```text
@fontsource/fredoka
@fontsource/nunito
@fontsource/atkinson-hyperlegible
```

Roles:

```text
Fredoka                display / scores / major UI
Nunito                 general UI
Atkinson Hyperlegible  typing passage
```

Do not load fonts from Google Fonts at runtime.

## Testing

```text
Vitest
React Testing Library
```

Optional after the core MVP:

```text
Playwright
```

---

# 5. Application State Model

The UI should be modeled as explicit application states rather than unrelated booleans.

Recommended screen-state type:

```ts
type AppScreen =
  | "setup"
  | "ready"
  | "typing"
  | "results"
  | "leaderboard";
```

The primary flow is:

```text
SETUP
  ↓
READY
  ↓
press any key
  ↓
TYPING SCREEN LOADED
  ↓
first valid typing keystroke
  ↓
TIMER STARTS
  ↓
RESULTS
  ↓
nickname if Top 10 eligible
  ↓
LEADERBOARD
  ↓
Next Player / automatic reset
  ↓
READY
```

The key used to leave the Ready screen must **not** count as the contestant's first typed character.

---

# 6. State Management Strategy

For V1, use React state plus `useReducer`.

A global state library is unnecessary for the initial project size.

Suggested high-level state:

```ts
interface AppState {
  screen: AppScreen;
  activeEvent: EventRecord | null;
  currentTest: TestSession | null;
  latestResult: TestResult | null;
}
```

Use a reducer so transitions are explicit:

```text
START_NEW_EVENT
CONTINUE_EVENT
ENTER_READY
ENTER_TYPING
START_TIMER
FINISH_TEST
SAVE_RESULT
SHOW_LEADERBOARD
RESET_FOR_NEXT_PLAYER
```

This makes the booth flow easier to reason about and test.

---

# 7. Data Model

## Event

```ts
type TestDuration = 30 | 60;

interface EventRecord {
  id: string;
  createdAt: string;
  updatedAt: string;

  durationSeconds: TestDuration;

  passageSetId: string;

  status: "active" | "archived";
}
```

### Event Rules

Starting fresh:

```text
Create new EventRecord
→ mark previous event archived if appropriate
→ set new event as active
→ leaderboard starts empty
```

Continuing previous:

```text
Load the most recently active event
→ restore all existing scores
→ restore that event's duration
→ restore its passage set
```

For fairness, continuing an existing event should **retain that event's test duration**.

If the operator wants to change between 30s and 60s, they should start a fresh event.

---

## Score

```ts
interface ScoreRecord {
  id: string;
  eventId: string;

  nickname: string | null;

  wpm: number;
  accuracy: number;

  correctCharacters: number;
  attemptedCharacters: number;

  durationSeconds: number;

  leaderboardEligible: boolean;

  createdAt: string;
}
```

All valid completed test results may be stored.

Only contestants who qualify for the current Top 10 are prompted for a nickname.

Scores outside the Top 10 may remain stored with:

```ts
nickname: null
```

They do not appear on the visible Top 5 leaderboard.

---

## Settings

```ts
interface AppSettings {
  activeEventId: string | null;
  lastEventId: string | null;
}
```

This can be stored as a singleton IndexedDB record.

---

# 8. IndexedDB Structure

Recommended database:

```text
typing-test-db
```

Object stores:

```text
events
scores
settings
```

## `events`

Key:

```text
id
```

Useful index:

```text
createdAt
status
```

## `scores`

Key:

```text
id
```

Indexes:

```text
eventId
createdAt
```

Leaderboard sorting can be performed in application code because event score counts will be small.

## `settings`

Key:

```text
key
```

Example:

```text
activeEventId
lastEventId
```

---

# 9. Passage Architecture

Typing content must be local and deterministic.

Recommended structure:

```ts
interface PassageSet {
  id: string;
  sentences: string[];
}
```

Example:

```ts
const passageSet: PassageSet = {
  id: "common-sentences-v1",
  sentences: [
    "The little dog ran across the yard today.",
    "We went down the road to see our old friend.",
    "The sun came out as we walked back home."
  ]
};
```

## Passage Requirements

Sentences should:

- use natural grammar
- use primarily common words
- avoid unusual punctuation
- avoid difficult or obscure vocabulary
- be similar in difficulty
- fit on one visual line
- remain completely inside the safe content width
- not require dynamic font shrinking
- be bundled with the application

Initial character target:

```text
approximately 35–50 characters
```

The exact limit should be validated using:

- the final Atkinson Hyperlegible font
- the final font size
- the actual target iPad

---

# 10. Competitive Fairness

All contestants within the same event should receive the **same ordered sentence sequence**.

Example:

```text
Contestant A
sentence 1 → sentence 2 → sentence 3 ...

Contestant B
sentence 1 → sentence 2 → sentence 3 ...
```

This avoids giving one contestant an easier random word/sentence sequence than another.

A future version may use multiple difficulty-balanced passage sets, but V1 should favor deterministic fairness.

---

# 11. Typing Engine

Create the typing logic as a pure, testable module separate from the visual components.

Suggested module:

```text
src/features/typing/typingEngine.ts
```

Track:

```ts
interface TestSession {
  sentenceIndex: number;
  expectedSentence: string;

  typedCharacters: string[];

  startedAt: number | null;
  elapsedMs: number;

  correctCharacters: number;
  attemptedCharacters: number;

  isFinished: boolean;
}
```

---

# 12. Starting the Test

## Ready Screen

The Ready screen listens for a keyboard event.

```text
PRESS ANY KEY TO START
```

On that event:

```text
prevent contestant input from being scored
→ transition to typing screen
→ render sentence
→ wait for a valid typing key
```

Do not start the timer yet.

## Typing Screen

The first valid character input:

```text
starts timer
+
becomes the first scored character
```

Ignore keys that should not count as typing input, including:

- Shift by itself
- Control
- Option / Alt
- Command / Meta
- Caps Lock
- function keys
- arrow keys
- Escape

Backspace is handled as an editing action.

---

## Scoring Implementation

### WPM Calculation

WPM is calculated from correctly typed characters:

`WPM = (correctCharacters / 5) / elapsedMinutes`

Implementation notes:

- Five correct characters equal one standard word.
- Correct letters, spaces, and punctuation all count as correct characters.
- Incorrect characters do not contribute to WPM.
- Correct characters in a partially completed word still count if the timer expires before the word is finished.
- WPM should be calculated from elapsed time while the test is running.
- Final WPM should use the configured test duration.

Example:

```ts
function calculateWpm(
  correctCharacters: number,
  elapsedSeconds: number
): number {
  if (elapsedSeconds <= 0) return 0;

  const elapsedMinutes = elapsedSeconds / 60;

  return (correctCharacters / 5) / elapsedMinutes;
}
```

For final display, round consistently:

```ts
const displayedWpm = Math.round(rawWpm);
```

Prefer storing the unrounded value internally and rounding only for display and leaderboard comparison rules.

---

### Accuracy Calculation

Accuracy is based on typing attempts:

`Accuracy = correctAttempts / (correctAttempts + incorrectAttempts) × 100`

Track attempts separately from the current visible text.

Recommended session counters:

```ts
interface TypingMetrics {
  correctAttempts: number;
  incorrectAttempts: number;
  correctCharacters: number;
}
```

Example implementation:

```ts
function calculateAccuracy(
  correctAttempts: number,
  incorrectAttempts: number
): number {
  const totalAttempts = correctAttempts + incorrectAttempts;

  if (totalAttempts === 0) return 100;

  return (correctAttempts / totalAttempts) * 100;
}
```

Backspace does not count as a typing attempt.

If a contestant types an incorrect character, presses Backspace, and then types the correct character:

```text
incorrect keypress → incorrectAttempts + 1
Backspace          → no accuracy change
correct keypress   → correctAttempts + 1
```

The original incorrect attempt remains part of the accuracy calculation.

---

### Minimum Leaderboard Accuracy

Leaderboard eligibility requires a configurable minimum accuracy.

Initial development constant:

```ts
export const MIN_LEADERBOARD_ACCURACY = 80;
```

Eligibility check:

```ts
function isLeaderboardEligible(accuracy: number): boolean {
  return accuracy >= MIN_LEADERBOARD_ACCURACY;
}
```

The `80%` value is provisional and must be validated using the physical giant keyboard before being treated as final.

A contestant below the threshold:

- still receives a Results screen
- still sees WPM and accuracy
- does not qualify for leaderboard ranking
- is not prompted for a leaderboard nickname

Do not bury the threshold directly inside ranking logic. Keep it as an explicit configuration constant so it can be changed after hardware testing.

---

### Ranking and Tie Behavior

Only leaderboard-eligible scores participate in ranking.

Sort scores using:

1. WPM descending
2. Accuracy descending
3. Submission time ascending

Recommended comparator:

```ts
function compareScores(a: ScoreRecord, b: ScoreRecord): number {
  if (b.wpm !== a.wpm) {
    return b.wpm - a.wpm;
  }

  if (b.accuracy !== a.accuracy) {
    return b.accuracy - a.accuracy;
  }

  return (
    new Date(a.createdAt).getTime() -
    new Date(b.createdAt).getTime()
  );
}
```

Use the stored raw WPM value for comparison if raw values are persisted.

Do not sort only by the rounded display value if two raw scores could display the same integer.

Example:

```text
92.49 WPM
92.10 WPM
```

Both may display as:

```text
92 WPM
```

but the higher raw WPM should rank first.

---

### Character-Level Scoring

Scoring operates at the individual-character level.

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

This produces:

```text
4 correct characters
1 incorrect attempt
```

Do not invalidate the entire word because one character is wrong.

This rule applies to:

- letters
- spaces
- punctuation
- characters in partially completed words

---

### Partial Words

If the timer expires while the contestant is in the middle of a word, all correctly typed characters before the timer expires remain valid.

Example:

```text
Expected: keyboard
Typed before timeout: keybo
```

If all five characters are correct:

```text
correctCharacters += 5
```

Do not require a completed word boundary for WPM credit.

The timer cutoff should be based on the actual test end timestamp, not whether the current word is complete.

---

### Error Advancement

Incorrect characters do not block progression.

On an incorrect printable character:

```text
1. record an incorrect attempt
2. store the typed character at the current position
3. visually mark the position as incorrect
4. advance the caret one character
```

The contestant may either:

- continue typing, or
- press Backspace to return and correct the mistake

Do not force contestants to correct errors before advancing.

This behavior is intentional because the physical giant keyboard is more error-prone than a standard keyboard.

---

### Backspace Behavior

Backspace is allowed during the active test.

Backspace should:

```text
1. remove the most recently entered character
2. move the caret backward one position
3. update the current visual correctness state
4. allow the contestant to re-enter that character
```

Backspace itself:

- does not increase `correctAttempts`
- does not increase `incorrectAttempts`
- does not contribute to WPM
- does not erase a previously recorded incorrect attempt from accuracy

If the removed character was currently contributing to `correctCharacters`, remove that current correct-character credit until the contestant types the position correctly again.

Example:

```text
Expected: dog
Typed:    dig
```

After typing `i`:

```text
incorrectAttempts += 1
```

After Backspace:

```text
incorrectAttempts remains unchanged
```

After typing `o` correctly:

```text
correctAttempts += 1
correctCharacters += 1
```

This preserves the history of the mistake while allowing corrected text to receive valid WPM credit.

---

### Recommended Typing Session Model

The typing engine should distinguish between:

1. current editable text state
2. cumulative attempt history

Recommended structure:

```ts
interface TypedCharacter {
  expected: string;
  typed: string;
  isCorrect: boolean;
}

interface TestSession {
  sentenceIndex: number;
  characterIndex: number;

  typedCharacters: TypedCharacter[];

  correctCharacters: number;
  correctAttempts: number;
  incorrectAttempts: number;

  startedAt: number | null;
  endsAt: number | null;

  isFinished: boolean;
}
```

The important distinction is:

```text
typedCharacters
```

represents the contestant's current editable position, while:

```text
correctAttempts
incorrectAttempts
```

represent cumulative typing history and are not undone by Backspace.

---

### Valid Typing Input

Only printable typing characters should count as attempts.

Examples that may count:

```text
letters
numbers
space
punctuation
```

Keys that should not count as typing attempts include:

```text
Shift
Control
Alt / Option
Meta / Command
Caps Lock
Tab
Escape
Arrow keys
function keys
```

Backspace is handled separately as an editing command.

The first valid typing character on the Typing screen:

```text
starts the timer
+
counts as the first typing attempt
```

The key used to transition from the Ready screen to the Typing screen must not count.

---

### Timer Cutoff

Input should stop contributing to the result once the configured test duration has elapsed.

Before processing a typing event, verify that the current timestamp is before the test end time.

Conceptually:

```ts
if (performance.now() >= endsAt) {
  finishTest();
  return;
}
```

This prevents a late keypress from being counted after timeout because of UI rendering delay.

---

### Final Score Calculation

At test completion:

```ts
const accuracy = calculateAccuracy(
  session.correctAttempts,
  session.incorrectAttempts
);

const rawWpm = calculateWpm(
  session.correctCharacters,
  durationSeconds
);

const leaderboardEligible =
  accuracy >= MIN_LEADERBOARD_ACCURACY;
```

Recommended result shape:

```ts
interface TestResult {
  rawWpm: number;
  displayedWpm: number;
  accuracy: number;

  correctCharacters: number;
  correctAttempts: number;
  incorrectAttempts: number;

  leaderboardEligible: boolean;
}
```

---

### Required Scoring Tests

At minimum, add unit tests for:

```text
perfect typing produces expected WPM
incorrect characters do not increase WPM
incorrect attempts lower accuracy
Backspace itself does not affect accuracy
correcting an error does not erase the original accuracy penalty
correcting an error restores correct-character WPM credit
partial words count toward WPM
incorrect characters do not block further typing
80% accuracy qualifies during development
79.99% accuracy does not qualify
higher WPM ranks first
accuracy breaks WPM ties
earlier submission breaks remaining ties
late input after timeout is ignored
Ready-screen start key is not scored
first valid Typing-screen key starts timer and is scored
```

# 13. Character Handling

Each typed character is compared against the expected character at the current cursor position.

Store the typed character and whether it matches.

Incorrect characters must not increase the correct-character count.

Recommended behavior:

```text
correct key
→ advance cursor
→ mark correct

incorrect key
→ advance cursor
→ mark incorrect

Backspace
→ remove previous typed character
→ move cursor backward
→ recalculate affected metrics
```

This permits normal typing behavior while preventing incorrect keystrokes from increasing WPM.

---

# 14. Current Word and Caret

The typing sentence has four visual states.

## Completed Text

```text
charcoal
```

Token:

```css
--tiny-charcoal
```

## Current Word

The entire active word is:

```text
lavender
```

Token:

```css
--tiny-lavender
```

## Caret

The caret is:

```text
strong mint
```

Token:

```css
--tiny-mint-strong
```

It must appear at the contestant's exact character position within the current word.

Example:

```text
acr│oss
```

## Upcoming Text

Upcoming text is:

```text
muted gray
```

Token:

```css
--tiny-muted
```

## Incorrect Character

Incorrect text uses:

```css
--tiny-error
```

and should include a secondary indicator such as underline or background tint so error state is not communicated by color alone.

---

# 15. Sentence Transition

Only one sentence is visible at a time.

When the contestant completes the current sentence:

```text
sentence completed
→ increment sentenceIndex
→ load next full sentence
→ keep timer running
→ continue scoring
```

Do not:

- wrap to a second line
- append the next sentence to the same line
- dynamically shrink the font

The new sentence replaces the completed sentence.

---

# 16. Timer

The event duration is:

```ts
30 | 60
```

Timer start:

```text
first valid typing keystroke
```

Timer end:

```text
selected duration reached
```

Use timestamps rather than relying only on decrementing `setInterval`.

Recommended approach:

```ts
performance.now()
```

or equivalent monotonic timing.

UI updates may use `requestAnimationFrame` or a short interval, but elapsed time must be calculated from the timestamps.

This prevents timer drift.

---

# 17. WPM Calculation

Use **correct characters**, not total keystrokes.

Formula:

```text
WPM = (correctCharacters / 5) / elapsedMinutes
```

For final score:

```text
elapsedMinutes = eventDurationSeconds / 60
```

Example:

```text
200 correct characters
5 characters per word
1 minute

200 / 5 / 1 = 40 WPM
```

Round the displayed WPM consistently.

Recommended:

```ts
Math.round(wpm)
```

Store either the raw value and display the rounded value, or store the rounded value consistently throughout the product.

Prefer storing raw calculated WPM plus displaying a rounded integer if future analytics are expected.

---

# 18. Accuracy Calculation

Recommended formula:

```text
accuracy =
  correctCharacters / attemptedCharacters * 100
```

If:

```text
attemptedCharacters === 0
```

then accuracy should display:

```text
100%
```

or remain unshown until the first typed character.

Never display:

```text
NaN
Infinity
```

---

# 19. Button-Mashing Protection

Incorrect characters do not contribute to WPM.

In addition, leaderboard qualification requires a minimum accuracy threshold.

Do **not** hard-code the final product threshold before testing on the physical giant keyboard.

Implementation should expose a configuration constant:

```ts
MIN_LEADERBOARD_ACCURACY
```

An initial test value may be used during development, but the final value should be selected after real hardware testing.

Example behavior:

```text
105 WPM
42% accuracy

→ result may be shown
→ score is not leaderboard eligible
```

Accuracy does not otherwise determine normal ranking.

---

# 20. Ranking Logic

Leaderboard order:

```text
1. WPM descending
2. Accuracy descending
3. createdAt ascending
```

Example:

```text
Alex   92 WPM   98%
Mia    92 WPM   96%

Alex ranks above Mia.
```

Implement ranking as a pure function:

```text
src/features/leaderboard/ranking.ts
```

This function should be unit tested.

---

# 21. Top 10 Nickname Eligibility

After a valid test completes:

1. Temporarily include the result in the event score set.
2. Rank all eligible scores.
3. Determine whether the contestant is within the Top 10.

If:

```text
rank <= 10
```

show nickname entry.

Otherwise:

```text
nickname entry is omitted
```

The visible leaderboard still shows only:

```text
Top 5
```

---

# 22. Nickname Handling

Nickname input rules:

- any nickname allowed
- trim leading/trailing whitespace
- prevent empty nickname submissions
- enforce a reasonable maximum length for layout safety

Recommended V1 maximum:

```text
20 characters
```

Render nicknames as plain text.

React's normal text rendering should be used so nickname content is escaped rather than inserted as HTML.

Do not use:

```text
dangerouslySetInnerHTML
```

for contestant-provided nicknames.

---

# 23. Results Screen

The Results screen displays:

- WPM
- accuracy
- new-high-score status when applicable
- Top 10 qualification status

If Top 10 eligible:

```text
show nickname field
+
Save Score
```

Nickname entry remains on the Results screen rather than becoming a separate app state.

Do not start automatic next-player reset while a contestant is entering a nickname.

---

# 24. High Score Detection

Current event high score:

```text
highest leaderboard-eligible WPM
```

If scores are tied, apply the standard ranking rules.

Ready screen behavior:

```text
if event has a score:
  display high score + nickname

if event has no score:
  display an empty-state message
```

Recommended empty-state copy:

```text
Be the first high score!
```

Exact copy may be adjusted during UI polish.

---

# 25. Leaderboard Screen

Display:

```text
Top 5
```

Each row contains:

- rank
- nickname
- WPM

Optional:

- visually highlight the newest contestant if they appear in the Top 5
- visually emphasize rank #1

Do not expose:

- raw character counts
- internal IDs
- event database metadata

---

# 26. Next Player and Automatic Reset

Leaderboard screen supports:

```text
NEXT PLAYER
```

Selecting it immediately transitions to:

```text
ready
```

Also support automatic reset.

Recommended initial constant:

```ts
LEADERBOARD_AUTO_RESET_MS = 10_000;
```

This is a configuration value and can be adjusted after booth testing.

Automatic reset should begin only after the Leaderboard screen is shown.

Reset:

- typed text
- sentence position
- timer state
- current WPM
- accuracy
- current result
- nickname input

Preserve:

- active event
- event duration
- passage set
- saved scores
- high score
- leaderboard

---

# 27. Ready / Attract Screen

The Ready screen displays:

```text
GIANT keyboard typing contest!

Type above 50 WPM for a Plinko drop.

CURRENT HIGH SCORE
92 WPM
Alex

PRESS ANY KEY TO START
```

Do not display:

- Top 5 leaderboard
- Start button
- operator settings

The screen should listen for keyboard interaction only while this state is active.

---

# 28. Typing Screen Layout

The typing screen is intentionally minimal.

## Top

Display only lightweight context such as:

```text
logo
high score
```

Do not show the shop name if the final wireframe/design removes it.

## Center

Display:

```text
one complete sentence
```

Requirements:

- horizontally centered
- visually centered as a single unit
- one line
- no clipping
- equal safe space on left and right
- Atkinson Hyperlegible
- current word lavender
- caret strong mint

## Bottom Left

```text
live WPM
```

## Bottom Center

```text
timer
```

## Bottom Right

```text
accuracy
```

The timer must remain at the bottom center.

---

# 29. Design Implementation

All UI must follow:

```text
docs/DESIGN_SYSTEM.md
```

Core design tokens:

```css
:root {
  --tiny-blush: #FBEDEF;
  --tiny-white: #FFFDFC;

  --tiny-mint: #9DDED8;
  --tiny-mint-strong: #6CCFC7;

  --tiny-lavender: #AA9AD4;
  --tiny-lavender-light: #D9D0ED;

  --tiny-pink: #F4C1D4;
  --tiny-peach: #F5CFC0;

  --tiny-charcoal: #403738;
  --tiny-muted: #8C8788;

  --tiny-error: #D95D5D;
}
```

Typography:

```css
--font-display: "Fredoka", sans-serif;
--font-ui: "Nunito", sans-serif;
--font-typing: "Atkinson Hyperlegible", sans-serif;
```

The UI should use:

- flat pastel surfaces
- organic edge shapes
- rounded forms
- minimal shadows
- generous whitespace
- sparse decorative motifs

Do not implement the interface as a generic dashboard with pastel colors.

---

# 30. Suggested Component Structure

```text
src/
├── app/
│   ├── App.tsx
│   ├── appReducer.ts
│   └── appTypes.ts
│
├── screens/
│   ├── EventSetupScreen.tsx
│   ├── ReadyScreen.tsx
│   ├── TypingScreen.tsx
│   ├── ResultsScreen.tsx
│   └── LeaderboardScreen.tsx
│
├── components/
│   ├── Logo.tsx
│   ├── HighScore.tsx
│   ├── Timer.tsx
│   ├── LiveStats.tsx
│   ├── NicknameInput.tsx
│   ├── Leaderboard.tsx
│   └── DecorativeShapes.tsx
│
├── features/
│   ├── typing/
│   │   ├── typingEngine.ts
│   │   ├── scoring.ts
│   │   ├── typingTypes.ts
│   │   └── typingEngine.test.ts
│   │
│   ├── leaderboard/
│   │   ├── ranking.ts
│   │   └── ranking.test.ts
│   │
│   └── events/
│       ├── eventService.ts
│       └── eventTypes.ts
│
├── db/
│   ├── database.ts
│   ├── eventRepository.ts
│   ├── scoreRepository.ts
│   └── settingsRepository.ts
│
├── data/
│   └── passages.ts
│
├── hooks/
│   ├── useTypingTest.ts
│   └── useAutoReset.ts
│
├── styles/
│   ├── tokens.css
│   └── global.css
│
├── types/
│   └── index.ts
│
├── main.tsx
└── vite-env.d.ts
```

Keep abstractions small during V1.

Do not create modules that do not yet serve a concrete requirement.

---

# 31. PWA Strategy

The typing test must be installable on the iPad and usable without connectivity.

Recommended configuration:

```text
vite-plugin-pwa
+
Workbox-generated service worker
```

Cache:

- generated HTML
- JavaScript bundles
- CSS
- local fonts
- logo
- icons
- required images
- passage data

Core booth behavior must not use remote requests.

---

# 32. iPad Installation Flow

Before the event, while online:

```text
1. Open deployed HTTPS URL in Safari
2. Allow the application to load fully
3. Add to Home Screen
4. Launch installed web app
5. Confirm event data loads
6. Enable airplane mode
7. Relaunch app
8. Run a complete test
```

Do not consider offline support complete until this test succeeds on the target iPad.

---

# 33. Offline Caching Strategy

For the application shell and versioned build assets:

```text
Cache First
```

Because these resources are generated/versioned by Vite.

For V1 there should be no runtime API dependency.

After a new deployment, the service worker should be able to update the cached application when the iPad next has connectivity.

Avoid aggressive update behavior while an active contestant is typing.

A newly available app version should be applied:

- on next launch, or
- when the app is safely idle

rather than interrupting an active test.

---

# 34. Persistence Requirements

The following must survive:

```text
browser refresh
Home Screen app close/reopen
temporary loss of connectivity
normal iPad restart
```

Persist:

- events
- scores
- nicknames
- active event
- event duration
- leaderboard state derivable from scores

Do not persist transient contestant typing state after a completed/reset session.

If the app closes during an active test, returning to the app may safely return to the Ready screen rather than attempting to restore a partially completed test.

---

# 35. Error Handling

## IndexedDB Failure

If IndexedDB cannot initialize:

- show a clear operator-facing error
- do not silently run a non-persistent competition
- explain that scores may not be saved

## Corrupt or Missing Event

If `activeEventId` points to a missing event:

```text
clear invalid reference
→ return to Event Setup
```

## No Previous Event

If operator selects Continue but no prior event exists:

- disable Continue, or
- show a clear message and keep Start fresh available

Prefer disabling Continue when no previous event exists.

## PWA Offline Asset Failure

If required assets are not cached:

- fail visibly before the event
- do not allow the operator to assume offline readiness

An "Offline ready" indicator should reflect actual application readiness where practical rather than being decorative only.

---

# 36. Accessibility

Requirements:

- semantic buttons and inputs
- visible keyboard focus
- high contrast
- large type
- large touch targets
- no essential information communicated only with color
- `aria-live` for important dynamic result announcements where useful
- nickname field has an explicit label
- errors include more than color
- reduced-motion support

The physical keyboard is the primary contestant interaction method.

The operator must still be able to use touch controls on the iPad.

---

# 37. Performance

The application should feel immediate.

Targets:

- no network dependency during gameplay
- no remote font loads
- minimal JavaScript bundle
- no heavy animation libraries for V1
- no unnecessary rerenders on every timer tick
- typing input handling should remain responsive

Prefer CSS transitions for simple visual feedback.

---

# 38. Privacy and Security

V1 stores data locally on the event iPad.

Collected contestant data is limited to:

- nickname, if Top 10
- typing score
- accuracy
- timestamp

Do not collect:

- email
- phone
- account credentials
- location
- device identity

Nickname content should always be rendered as text and never interpreted as HTML.

Because nicknames are publicly displayed, limit length to preserve layout.

A profanity/moderation system is not required for V1 unless requested by the operator.

---

# 39. Testing Plan

## Unit Tests

### Scoring

Test:

```text
correct WPM calculation
wrong characters do not increase WPM
accuracy calculation
zero-character case
30-second calculation
60-second calculation
backspace metric correction
```

### Ranking

Test:

```text
higher WPM wins
accuracy breaks WPM tie
earlier submission breaks remaining tie
Top 10 qualification
Top 5 display selection
```

### Events

Test:

```text
fresh event has no scores
continue restores previous event
duration persists with continued event
starting fresh does not delete historical event data
```

---

## Component Tests

High-value component behavior:

```text
Ready screen responds to key press
Ready key is not scored
first typing key starts timer
Top 10 result shows nickname field
non-Top-10 result omits nickname field
Next Player returns to Ready
```

---

## Manual Hardware Tests

Required before event deployment:

```text
landscape layout on target iPad
actual giant keyboard input
30-second mode
60-second mode
fast typing
slow typing
incorrect typing
backspace
button mashing
Top 10 qualification
Top 5 ranking
nickname entry
auto reset
Next Player
app restart
airplane mode
PWA relaunch
```

---

# 40. Deployment

V1 is a static frontend application.

Requirements:

- HTTPS
- stable URL
- service-worker support
- no server dependency for booth use

Suitable hosts include:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages if configured correctly for the PWA routing/build

Deployment choice should prioritize simplicity and reliable HTTPS.

---

# 41. Environment Configuration

Avoid secrets in V1 because there is no backend/API.

No `.env` values should be required for normal booth operation.

If deployment tooling introduces environment variables, commit only:

```text
.env.example
```

and keep actual secret files ignored.

---

# 42. Git Workflow

Primary branch:

```text
main
```

For a one-day MVP, avoid unnecessary branching complexity.

Recommended workflow:

```bash
git pull
git add .
git commit -m "meaningful message"
git push
```

Use small, meaningful commits such as:

```text
Initialize React TypeScript app

Add event setup flow

Implement typing engine and timer

Add WPM and accuracy scoring

Add IndexedDB event persistence

Add leaderboard ranking

Add offline PWA support

Apply typing test design system

Add scoring and ranking tests
```

Do not force-push shared history unless absolutely necessary.

---

# 43. One-Day MVP Implementation Order

The goal is a working booth loop before visual polish.

## Phase 1 — Project Foundation

```text
React + TypeScript + Vite
basic styles
design tokens
font packages
screen-state reducer
```

## Phase 2 — Typing Engine

Implement:

```text
sentence display
keypress handling
caret
current word
correct / incorrect character tracking
backspace
sentence transition
```

## Phase 3 — Timer and Scoring

Implement:

```text
first-key timer start
30 / 60 second duration
live WPM
accuracy
test completion
```

Add unit tests before continuing.

## Phase 4 — Event Setup

Implement:

```text
30 / 60 selection
fresh event
continue previous event
```

## Phase 5 — IndexedDB

Persist:

```text
events
scores
settings
```

## Phase 6 — Results

Implement:

```text
WPM
accuracy
high-score detection
Top 10 qualification
nickname entry
```

## Phase 7 — Leaderboard

Implement:

```text
ranking
Top 5 display
current/high-score emphasis
Next Player
auto reset
```

## Phase 8 — Ready Screen

Implement:

```text
contest messaging
current high score
Press Any Key to Start
```

## Phase 9 — PWA

Implement:

```text
manifest
icons
service worker
offline asset caching
Home Screen installation
```

## Phase 10 — Brand Styling

Apply:

```text
DESIGN_SYSTEM.md
wireframes
responsive landscape-iPad spacing
organic pastel graphics
```

## Phase 11 — Hardware and Offline Testing

Test on:

```text
target iPad
giant keyboard
airplane mode
```

Fix reliability issues before adding optional polish.

---

# 44. Definition of Done for V1

V1 is technically complete when:

- React + TypeScript app builds successfully
- operator can create a fresh event
- operator can continue the previous event
- 30s and 60s modes work
- Ready screen starts from any key
- Ready-screen key is not scored
- first typing key starts timer
- sentence remains one line and fully visible
- current word is highlighted
- caret follows exact character position
- WPM is correct
- accuracy is correct
- button mashing cannot create a valid competitive score
- Top 10 users can enter nickname
- Top 5 displays correctly
- high score updates correctly
- Next Player resets the contestant session
- auto reset works
- event and scores survive restart
- app launches and functions in airplane mode
- app matches the documented design system
- core scoring/ranking tests pass

---

# 45. Post-V1 Full-Stack Roadmap

After the conference, the project can evolve into a full-stack application without replacing the offline architecture.

Recommended backend:

```text
Python
Flask
SQLAlchemy
PostgreSQL
REST API
```

Future architecture:

```text
             React + TypeScript PWA
                      │
             ┌────────┴─────────┐
             │                  │
             ▼                  ▼
         IndexedDB          Flask API
         offline data           │
             │              SQLAlchemy
             │                  │
             └── sync ─────► PostgreSQL
                  when online
```

## Potential API

```http
POST /api/events
GET  /api/events/:id

POST /api/events/:id/scores
GET  /api/events/:id/scores

POST /api/sync
```

## Future Sync Requirements

The local database remains the source used during live booth operation.

When connectivity becomes available:

```text
local unsynced data
→ send to API
→ server persists
→ mark local records synced
```

Gameplay should not wait for synchronization.

---

# 46. Post-V1 Enhancements

Possible future work:

- cloud backup
- multiple booth devices
- owner event history
- event naming
- score moderation
- operator score deletion
- cloud leaderboard
- QR-code spectator leaderboard
- analytics
- storefront integration
- event-specific themes
- balanced alternate passage sets
- admin controls
- automated offline/online sync
- Docker
- CI/CD
- backend automated tests
- monitoring

These should be added only after the core booth workflow is proven reliable.

---

# 47. Primary Engineering Principle

The central technical requirement is:

> The typing test must continue working reliably at a real event even when the network does not.

Architecture decisions should therefore favor:

```text
local-first
deterministic
simple
testable
recoverable
```

over unnecessary infrastructure or feature complexity.
