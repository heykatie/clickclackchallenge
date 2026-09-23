# Typing Test — V1 Technical Plan

This file owns implementation: stack, application state, the IndexedDB schema, module boundaries, the service worker, precache, navigation fallback, implementation order, and the automated test map.

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

## 1. Purpose

This document defines the technical implementation plan for V1 of the **Typing Test**.

The product is an offline-first typing competition designed for repeated use at event booths on a **landscape iPad** connected to a giant physical keyboard.

Implementation should follow:

- `docs/prd.md` for product behavior and booth acceptance tests
- `docs/design_system.md` for visual design and contestant-facing strings
- `docs/wireframes.md` for screen layout

V1 priorities:

1. reliable booth operation
2. offline functionality
3. accurate and understandable scoring
4. fair competition
5. fast contestant turnover
6. persistent local event data
7. simple landscape-iPad interaction
8. maintainable React + TypeScript architecture

---

## 2. V1 Technical Scope

### In Scope

V1 uses:

- React
- TypeScript
- Vite
- Progressive Web App (PWA)
- service worker / offline asset caching
- IndexedDB for structured local persistence
- locally bundled typing passages
- locally bundled fonts and required assets
- Vitest for unit tests
- React Testing Library for high-value component tests
- static HTTPS deployment

V1 supports:

- 30-second and 60-second event modes
- fresh event creation
- continuing the current/most recently active event
- Ready / Attract screen
- Typing screen
- Results + name screen
- Leaderboard screen
- live WPM
- live accuracy
- timer
- character-level typing feedback
- Backspace
- Race sentence sequence, the same for every attempt
- Standard word list, with a new draw for each attempt
- minimum leaderboard accuracy
- Top 10 name eligibility
- Top 5 leaderboard display
- Plinko/prize qualification
- manual Next Player reset
- automatic reset after the Leaderboard screen
- local event persistence
- offline operation after installation/caching

### Out of Scope

V1 does not require:

- Flask
- SQLAlchemy
- PostgreSQL
- cloud synchronization
- user accounts
- authentication
- online multiplayer
- cross-device leaderboard sync
- e-commerce
- admin dashboard
- historical-event management UI
- AI-generated passages
- advanced anti-cheat systems
- detailed analytics
- operator score deletion
- multiple-device event management

These may be added after V1.

---

## 3. Architecture Overview

V1 uses a **local-first static web architecture**. The entire booth workflow must work without a required server connection after the app and its required assets have been installed/cached on the iPad.

```text
┌──────────────────────────────────────────┐
│           React + TypeScript UI          │
│                                          │
│ Setup → Ready → Typing → Results         │
│                         → Leaderboard     │
└───────────────────┬──────────────────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
      IndexedDB          Service Worker
      structured data    offline app assets
          │                   │
          ▼                   ▼
   events / scores       HTML / CSS / JS
   app settings          fonts / icons
                         images / passages
```

The two offline systems have separate responsibilities:

```text
IndexedDB
→ preserves structured event, score, and settings data

Service Worker
→ makes the application code and required static assets available offline
```

The complete V1 booth workflow must remain local:

```text
create / continue event
→ start contestant
→ run typing test
→ calculate score
→ save score
→ collect name when eligible
→ derive leaderboard
→ reset for next contestant
```

The application must remain usable when the iPad is:

- disconnected from Wi-Fi
- in airplane mode
- reopened from the Home Screen
- restarted between events

No V1 gameplay action should wait for a network request.

### No Required Server Connection

V1 has no required runtime dependency on:

- Flask
- REST API
- PostgreSQL
- cloud database
- authentication service
- remote passage service

A backend may be added after V1 for synchronization, analytics, event history, or other online features, but it must not replace the local-first booth workflow.

---
## 4. Recommended Stack

### Frontend Framework — React

```text
React
```

React is responsible for:

- screen rendering
- state-driven transitions
- contestant and operator interactions
- live typing feedback
- Results and Leaderboard presentation

### Language — TypeScript

```text
TypeScript
```

TypeScript should define and protect:

- event data
- score data
- app settings
- passage-set definitions
- typing-session state
- reducer actions
- scoring and ranking function contracts

### Build Tool — Vite

```text
Vite
```

Vite provides:

- local development server
- React + TypeScript build pipeline
- optimized production bundles
- straightforward PWA plugin integration

### PWA and local storage

Service worker, precache, navigation fallback, IndexedDB, and local font packages are in PWA and IndexedDB below. Passage rules are in `docs/prd.md`. Visual roles are in `docs/design_system.md`.

### Testing

Use:

```text
Vitest
React Testing Library
```

Optional after core V1:

```text
Playwright
```

### Deployment Model

V1 is deployed as a static HTTPS application.

Suitable hosts include:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages if configured correctly for the build and PWA behavior

No application server is required for V1 booth operation.

---

## 5. PWA and IndexedDB

Offline requirements and what must persist are in `docs/prd.md`. Palette and CSS tokens are in `docs/design_system.md`.

Use `vite-plugin-pwa` and Workbox. Register the generated service worker through the Vite PWA configuration. Precache the Vite build with the Workbox manifest so hashed filenames stay in sync. Configure an SPA navigation fallback to the application entry point so an installed launch still loads the shell offline.

Set the web app manifest `orientation` to `landscape`. That is the installed-app lock. Safari on iPad does not reliably lock a page that is not installed, and Split View can still narrow a landscape window. If the viewport is portrait, or landscape but not the full screen, do not render the five screens. Show “Turn sideways and use the full screen.” from `docs/design_system.md`. Do not reflow the 4:3 layouts into those viewports.

Load fonts with `@fontsource/fredoka`, `@fontsource/nunito`, and `@fontsource/atkinson-hyperlegible`. Import passages from local application data. If passage data is emitted as a separate static asset, precache that asset too.

```text
application code + static assets
→ service-worker precache

structured event, score, and settings data
→ IndexedDB
```

Use `idb` with object stores `events`, `scores`, and `settings`. Do not persist a separate leaderboard record. Do not reload for a service-worker update during Ready-to-Typing, an active test, or name entry. Apply updates on a later launch or while the app is idle.

The airplane-mode acceptance test is in `docs/prd.md`. Installation steps are in the Testing Plan section below.

## 6. Application State Model

Use explicit screen states.

```ts
type AppScreen =
  | "setup"
  | "ready"
  | "typing"
  | "results"
  | "leaderboard";
```

Primary flow:

```text
SETUP
  ↓
READY
  ↓
press any key
  ↓
TYPING SCREEN APPEARS
  ↓
first valid typing key
  ↓
TIMER STARTS
  ↓
RESULTS
  ↓
name if Top 10 eligible
  ↓
LEADERBOARD
  ↓
Next Player / automatic reset
  ↓
READY
```

The key used to leave the Ready screen must not count as the contestant's first typed character.

---

## 7. State Management Strategy

Use React state plus `useReducer`.

A global state-management library is unnecessary for V1.

Suggested app state:

```ts
interface AppState {
  screen: AppScreen;
  activeEvent: EventRecord | null;
  currentTest: TestSession | null;
  latestResult: TestResult | null;
}
```

Suggested reducer actions:

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

State transitions should remain explicit and testable.

---

## 8. Data Model

V1 uses four core data concepts:

- `EventRecord`
- `ScoreRecord`
- `AppSettings`
- `PassageSet`

The model must preserve historical event data, associate every score with the event in which it was earned, and allow the active event to be restored after the app closes or restarts.

### Test Duration

```ts
type TestDuration = 30 | 60;
type TestMode = "words" | "race";
```

### Event Record

Each booth event is stored as its own record.

```ts
interface EventRecord {
  id: string;

  durationSeconds: TestDuration;
  testMode: TestMode;
  passageSetId: string;

  status: "active" | "archived";

  createdAt: string;
  updatedAt: string;
}
```

Field behavior:

`id`

- unique event identifier
- generated with `crypto.randomUUID()`

`durationSeconds`

- the length for the next contestant while this event stays active
- valid values: `30` or `60`
- a later change does not rewrite `durationSeconds` on scores already saved

`testMode`

- `"race"` uses the bundled sentences, in the same order for every attempt
- `"words"` uses a new random draw from `common-words-v1` for each attempt
- the choice for the next contestant while this event stays active
- a later change does not rewrite `testMode` on scores already saved

`passageSetId`

- identifies the text version the next contestant will use
- `common-sentences-v1` for Race
- `common-words-v1` for Standard
- updated with `testMode` so the event record matches the next attempt

`status`

- `"active"` for the current event
- `"archived"` for retained previous events

`createdAt`

- ISO timestamp for event creation
- also provides the event date/time, so a separate date field is unnecessary

`updatedAt`

- ISO timestamp for the event's most recent update

Example:

```ts
const event: EventRecord = {
  id: crypto.randomUUID(),
  durationSeconds: 30,
  testMode: "race",
  passageSetId: "common-sentences-v1",
  status: "active",
  createdAt: "2026-09-22T07:18:00.000Z",
  updatedAt: "2026-09-22T07:18:00.000Z"
};
```

### Score Record

Each completed contestant score belongs to exactly one event.

```ts
interface ScoreRecord {
  id: string;
  eventId: string;

  name: string | null;

  rawWpm: number;
  displayedWpm: number;
  accuracy: number;

  correctCharacters: number;
  correctAttempts: number;
  incorrectAttempts: number;

  durationSeconds: TestDuration;
  testMode: TestMode;
  passageSetId: string;

  createdAt: string;
}
```

Field behavior:

`id`

- unique score identifier
- generated with `crypto.randomUUID()`

`eventId`

- identifies the event this score belongs to

`name`

- name for a Top 10 qualifying score
- null when that contestant leaves through View Leaderboard
- null for scores outside the Top 10
- the score row is still written in both null cases

`rawWpm`

- precise WPM before display rounding
- retained for internal precision and possible future analytics

`displayedWpm`

- rounded WPM shown to contestants
- used for V1 leaderboard ranking

`accuracy`

- final typing accuracy percentage
- the only accuracy fact stored on the score
- the gate compares this value with `MIN_LEADERBOARD_ACCURACY`
- display and WPM tie-breaks use this value rounded to a whole number
- do not store that rounded number separately

`correctCharacters`

- currently credited correct-character count
- used for WPM calculation

`correctAttempts`

- cumulative correct typing attempts
- used for accuracy calculation

`incorrectAttempts`

- cumulative incorrect typing attempts
- used for accuracy calculation
- not erased by Backspace

`durationSeconds`

- snapshot of the test duration when the score was earned
- unchanged when the operator later picks the other length for the same event
- the duration that produced this score's WPM; ranking uses the stored WPM rather than recomputing it from the event's current duration

`testMode`

- snapshot of Standard (`"words"`) or Race (`"race"`) when the score was earned
- unchanged when the operator later picks the other mode for the same event

`passageSetId`

- snapshot of the text version that produced this score
- `common-words-v1` or `common-sentences-v1`
- ranking does not reload that text to recompute WPM

`createdAt`

- ISO submission timestamp
- final tie-breaker when displayed WPM and displayed accuracy are equal

Example:

```ts
const score: ScoreRecord = {
  id: crypto.randomUUID(),
  eventId: "event-id",
  name: "Alex",

  rawWpm: 91.6,
  displayedWpm: 92,
  accuracy: 96.4,

  correctCharacters: 229,
  correctAttempts: 241,
  incorrectAttempts: 9,

  durationSeconds: 30,
  testMode: "race",
  passageSetId: "common-sentences-v1",

  createdAt: "2026-09-22T07:43:12.000Z"
};
```

`96.4` is the stored percentage. It displays as 96%, and that 96 is what breaks a displayed-WPM tie. A stored `96.2` ties with it on accuracy.

### Derived Ranking Data

Do not permanently store:

```ts
rank: number;
isTop5: boolean;
isTop10: boolean;
meetsAccuracyThreshold: boolean;
```

Rank and Top 5 / Top 10 change whenever a new score is added. `meetsAccuracyThreshold` goes stale if `MIN_LEADERBOARD_ACCURACY` changes after giant-keyboard testing. Do not store that boolean.

At rank time, a score is eligible when `accuracy >= MIN_LEADERBOARD_ACCURACY` and `displayedWpm > 0`. Keep the numeric `accuracy` field. The threshold value is the provisional gate in `docs/prd.md` (Minimum Leaderboard Accuracy). A displayed 0 WPM stays off the board. Ranking order is in `docs/prd.md`.

### App Settings

```ts
interface AppSettings {
  activeEventId: string | null;
  lastSelectedDuration: TestDuration;
  schemaVersion: number;
}
```

`activeEventId`

- identifies the event currently being used
- allows Continue to restore it after reopening

`lastSelectedDuration`

- convenience preference for Event Setup
- does not override an existing event's saved duration

`schemaVersion`

- supports future IndexedDB migrations

Example:

```ts
const settings: AppSettings = {
  activeEventId: "event-id",
  lastSelectedDuration: 30,
  schemaVersion: 2
};
```

When continuing an existing event, `event.durationSeconds` and `event.testMode` are the length and text for the next contestant. The operator may change either without archiving the event. Earlier scores keep the duration, mode, passage set, and WPM stored when each score was saved. Ranking uses that stored WPM.

Start fresh is required only when the operator wants a new empty leaderboard.

### Passage Set

```ts
interface PassageSet {
  id: string;
  sentences: string[];
}
```

Example:

```ts
const commonSentencesV1: PassageSet = {
  id: "common-sentences-v1",
  sentences: [
    "The little dog ran across the yard today.",
    "We went down the road to see our old friend.",
    "The sun came out as we walked back home."
  ]
};
```

Passages are bundled with the application rather than downloaded at runtime.

The event stores `testMode` and `passageSetId` for the next contestant. Each score stores the mode and passage-set identifier from the attempt that earned it.

### Data Relationships

```text
PassageSet
    ▲
    │ passageSetId
    │
EventRecord
    │
    │ eventId
    ▼
ScoreRecord
ScoreRecord
ScoreRecord
```

Settings point to the active event:

```text
AppSettings
    │
    │ activeEventId
    ▼
EventRecord
```

Rules:

- one event may have many scores
- one score belongs to exactly one event
- the active event references the passage-set version for its current game mode
- each score references the passage-set version from the attempt that earned it
- settings reference the currently active event

### Fresh Event Behavior

Choosing **Start Fresh** creates a new event without deleting previous event data.

```text
existing active event
→ status = "archived"

create new EventRecord
→ status = "active"
→ store selected duration
→ store current passageSetId

AppSettings.activeEventId
→ new event ID
```

The new event begins with zero scores, so its leaderboard is empty.

Previous events and their scores remain stored.

> A fresh leaderboard means creating a new event, not deleting old scores.

### Continue Event Behavior

Choosing **Continue Previous Event** restores the valid active event.

Restore:

- event ID
- the event's current duration, which the operator can change for the next contestant
- passage-set ID
- saved scores, each still carrying the duration and WPM from the attempt that earned it
- derived current high score
- derived leaderboard

Changing the duration keeps this event. It does not create a new one and does not rewrite earlier scores.

If no valid active event exists, Continue should be unavailable.

### IDs and Timestamps

Generate IDs with:

```ts
crypto.randomUUID()
```

Generate persisted timestamps with:

```ts
new Date().toISOString()
```

Do not derive IDs from:

- name
- score
- array index
- timestamp alone

---
## 9. IndexedDB Structure

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

### `events`

```text
keyPath: id
indexes:
  createdAt
  status
```

### `scores`

```text
keyPath: id
indexes:
  eventId
  createdAt
```

### `settings`

Use a singleton settings record containing the `AppSettings` values.

A separate `leaderboards` object store is not needed.

Leaderboard state should always be derived from the current event's saved scores.

Historical events and their scores must remain stored when Start Fresh creates a new active event.

---
Passage rules and same-sequence fairness are in `docs/prd.md` (Passage Rules). The `PassageSet` shape is in the data model above.

## 10. Typing Engine

Create typing logic as a pure, testable module separate from visual components.

Suggested module:

```text
src/features/typing/typingEngine.ts
```

### Typed Character Model

```ts
interface TypedCharacter {
  expected: string;
  typed: string;
  isCorrect: boolean;
}
```

### Test Session Model

```ts
interface TestSession {
  sentenceIndex: number;
  characterIndex: number;

  expectedSentence: string;
  typedCharacters: TypedCharacter[];

  correctCharacters: number;
  correctAttempts: number;
  incorrectAttempts: number;

  startedAt: number | null;
  endsAt: number | null;

  isFinished: boolean;
}
```

Important distinction:

```text
typedCharacters
```

represents the current editable state of the displayed sentence.

```text
correctAttempts
incorrectAttempts
```

represent cumulative attempt history and are not undone by Backspace.

---

Ready behavior is in `docs/prd.md`. Ready strings are in `docs/design_system.md`. The first scored attempt is the first printable character, including space and punctuation. The non-typing keys excluded from that attempt are Shift, Control, Option/Alt, Command/Meta, Caps Lock, Tab, Escape, arrow keys, and function keys. Backspace does not start the timer. It is handled separately once typing has started. Escape during Typing returns to Ready and discards the attempt. Escape does not leave Ready.

Scoring, name, Plinko, high-score, and reset rules are in `docs/prd.md`. Visual states and CSS tokens are in `docs/design_system.md`. Screen layout is in `docs/wireframes.md`.

## 11. Component and Module Boundaries

V1 should use a small, explicit structure with clear responsibilities.

The goal is to keep the code easy to understand and test without creating unnecessary abstractions.

Use the following rule:

```text
Screens
→ control user flow

Components
→ focused reusable UI

Services
→ event and score operations / persistence coordination

Pure functions
→ typing, scoring, and ranking logic

Data modules
→ bundled passages
```

Do not split the app into additional layers unless the implementation actually needs them.

---

### EventSetupScreen

Suggested file:

```text
src/screens/EventSetupScreen.tsx
```

Responsibility:

- operator setup before contestants begin

Handles:

- 30-second / 60-second selection
- Start Fresh
- Continue Previous Event
- displaying whether a previous event is available
- calling `EventService` to create or restore an event
- transitioning to `ReadyScreen`

It should not:

- calculate scores
- rank leaderboard entries
- contain IndexedDB implementation details
- handle typing-test input
- render contestant results

Conceptual flow:

```text
select duration
→ Start Fresh or Continue
→ EventService
→ active event available
→ ReadyScreen
```

---

### ReadyScreen

Suggested file:

```text
src/screens/ReadyScreen.tsx
```

Responsibility:

- attract / ready state between contestants

Displays the Ready strings from `docs/design_system.md`. When there is no eligible score, show “Be the first high score!”

Handles:

```text
contestant keypress
→ consume Ready-screen key
→ transition to TypingScreen
```

The key used to leave the Ready screen follows the start rule in `docs/prd.md`.

Listen for that key with a `keydown` listener on `window`, and focus the page when Ready is shown. An installed iPad PWA in Safari often does not deliver keys unless the page has focus, so a listener on the prompt element alone can miss the giant keyboard.

It should not:

- display the Top 5 leaderboard
- save scores
- create or archive events
- contain scoring logic

---

### TypingScreen

Suggested file:

```text
src/screens/TypingScreen.tsx
```

Responsibility:

- run the active typing test

Handles:

- current sentence display
- typed-character state
- current character position
- current-word highlighting
- caret position
- correct / incorrect character feedback
- Backspace
- sentence progression
- first-valid-key timer start
- live WPM
- live accuracy
- remaining time
- timeout
- transition to Results

The screen should use pure typing/scoring functions rather than embedding all logic directly inside JSX.

It should not:

- persist final scores directly
- decide Top 10 name eligibility by itself
- render the final leaderboard
- create or archive events

Conceptual flow:

```text
sentence visible
→ first valid typing key
→ timer starts
→ typing engine processes input
→ scoring functions update live metrics
→ timer expires
→ TestResult created
→ ResultsScreen
```

---

### ResultsScreen

Suggested file:

```text
src/screens/ResultsScreen.tsx
```

Responsibility:

- present the completed contestant result
- coordinate the post-test save flow

Displays:

- final displayed WPM
- final accuracy
- new-high-score state when applicable
- Plinko qualification when applicable
- Top 10 qualification when applicable

If the contestant is Top 10 eligible, render:

```text
NameForm
```

The Results screen should coordinate score saving through `ScoreService`.

Conceptual flow:

```text
receive TestResult
→ determine result messaging
→ if Top 10, show NameForm
→ one exit writes one score row:
    Save Score, with the name
    or View Leaderboard, with name null
→ LeaderboardScreen
```

Both Results exits write one score row. View Leaderboard does that with a null name, as in `docs/prd.md` §15.

Name entry remains part of the Results screen.

Do not add a separate app-level `"name"` screen state.

It should not:

- contain IndexedDB implementation details
- contain typing-engine logic
- permanently store leaderboard rank

---

### NameForm

Suggested file:

```text
src/components/NameForm.tsx
```

Responsibility:

- collect and validate a qualifying contestant's name

Handles:

- text input
- trimming leading/trailing whitespace
- rejecting empty values
- maximum-length validation
- submit action

Recommended V1 limit:

```ts
export const MAX_NAME_LENGTH = 20;
```

Suggested props:

```ts
interface NameFormProps {
  onSubmit: (name: string) => void;
}
```

The component should receive submission behavior through props.

It should not:

- access IndexedDB directly
- calculate leaderboard rank
- decide whether the contestant is Top 10
- calculate WPM or accuracy

The parent `ResultsScreen` determines whether `NameForm` should be shown.

Focusing this field can open the iPad software keyboard. SAVE SCORE must stay visible. If the keyboard covers it, keep the field and button in the upper half, as in `docs/wireframes.md` §7. Do not add a keyboard library.

---

### LeaderboardScreen

Suggested file:

```text
src/screens/LeaderboardScreen.tsx
```

Responsibility:

- present the active event's visible leaderboard
- control transition to the next contestant

Displays:

- Top 5
- rank
- name
- displayed WPM
- optional emphasis for rank #1
- optional highlight for the newest contestant
- Next Player action
- automatic-reset status/countdown if shown

Handles:

```text
NEXT PLAYER
→ ReadyScreen
```

and:

```text
auto-reset timeout
→ ReadyScreen
```

The screen should receive or request ranked score data derived from the active event.

It should not:

- store leaderboard position permanently
- calculate raw typing metrics
- create new events
- mutate prior scores except through an explicit service call

---

### EventService

Suggested file:

```text
src/services/EventService.ts
```

`EventService` is not a React component.

Responsibility:

- coordinate event lifecycle operations

Suggested responsibilities:

```text
create fresh event
archive previous active event
load active event
continue active event
update activeEventId
```

Suggested API:

```ts
createEvent(
  durationSeconds: TestDuration,
  testMode: TestMode
): Promise<EventRecord>;

getActiveEvent(): Promise<EventRecord | null>;

continueEvent(): Promise<EventRecord | null>;
```

Starting fresh should perform:

```text
load existing active event
→ archive it if present
→ create new EventRecord
→ set status = active
→ update settings.activeEventId
→ preserve old event and score data
```

`EventService` should coordinate with the local persistence layer rather than embedding UI behavior.

It should not:

- render UI
- calculate WPM
- rank scores
- generate passages

---

### ScoreService

Suggested file:

```text
src/services/ScoreService.ts
```

`ScoreService` is not a React component.

Responsibility:

- coordinate score persistence and score retrieval

Suggested responsibilities:

```text
save completed score
update name
load scores for an event
```

Suggested API:

```ts
saveScore(score: ScoreRecord): Promise<void>;

getScoresForEvent(
  eventId: string
): Promise<ScoreRecord[]>;

updateScoreName(
  scoreId: string,
  name: string
): Promise<void>;
```

`ScoreService` may call local repository/database functions.

It should not:

- render UI
- calculate typing input state
- permanently store leaderboard rank
- generate passages

Leaderboard sorting should remain a pure helper rather than becoming a large additional service.

---

### Typing Engine

Suggested file:

```text
src/features/typing/typingEngine.ts
```

Responsibility:

- pure typing-state transitions

Handles:

- expected character comparison
- character insertion
- Backspace behavior
- caret / character index movement
- sentence completion
- transition to the next sentence
- current editable sentence state

The typing engine should not:

- render React UI
- save to IndexedDB
- control app navigation
- rank leaderboard scores

Keeping this logic pure makes it easier to unit test.

---

### Scoring Module

Suggested file:

```text
src/features/typing/scoring.ts
```

Responsibility:

- pure score calculations

Contains functions such as:

```ts
calculateWpm(
  correctCharacters: number,
  elapsedSeconds: number
): number;

calculateAccuracy(
  correctAttempts: number,
  incorrectAttempts: number
): number | null;

meetsLeaderboardAccuracy(
  accuracy: number
): boolean;
```

`meetsLeaderboardAccuracy` is `accuracy >= MIN_LEADERBOARD_ACCURACY`. `MIN_LEADERBOARD_ACCURACY` is the provisional gate in `docs/prd.md` (Minimum Leaderboard Accuracy). Do not persist the boolean result.

Return `null` when `correctAttempts + incorrectAttempts` is 0. Do not return 100 for that case. The live UI follows `docs/prd.md`: hide accuracy or show `—%`, and do not display 100 before the contestant has made an attempt.

It should not:

- persist scores
- render UI
- manage event state
- process IndexedDB directly

---

### Ranking Module

Suggested file:

```text
src/features/leaderboard/ranking.ts
```

Responsibility:

- derive leaderboard order from saved scores

Handles:

```text
keep scores where accuracy >= MIN_LEADERBOARD_ACCURACY and displayedWpm > 0
→ sort by displayed WPM
→ break ties by displayed accuracy, rounded to a whole number
→ break remaining ties by earlier createdAt
→ derive rank
→ derive Top 10
→ derive Top 5
```

Suggested ranking order:

```text
1. displayedWpm descending
2. displayed accuracy descending, rounded to a whole number
3. createdAt ascending
```

Do not sort the accuracy tie on the stored tenths. Do not store a second accuracy field. The gate still uses the stored percentage, so 79.99 stays below `MIN_LEADERBOARD_ACCURACY` even though it displays as 80. Ranking order is in `docs/prd.md`.

This should be a pure module.

Do not create a separate persistent leaderboard model or leaderboard database store.

---

### Passages Module

Suggested file:

```text
src/data/passages.ts
```

This is a local data module, not a React component or service.

Responsibility:

- provide prewritten bundled typing passages
- provide a stable passage-set ID
- preserve deterministic sentence order

Example:

```ts
export const commonSentencesV1: PassageSet = {
  id: "common-sentences-v1",
  sentences: [
    "The little dog ran across the yard today.",
    "We went down the road to see our old friend.",
    "The sun came out as we walked back home."
  ]
};
```

Race sentences live in `src/data/passages.ts`. The Standard word list lives in `src/data/commonWords.ts`. `src/data/wordLines.ts` builds one attempt's lines from that list.

The modules should not:

- fetch passages or words from an API
- write new Race sentences at runtime
- shuffle Race sentences per contestant
- contain UI logic

---

### Local Persistence Layer

The component boundaries above still require a small persistence layer for IndexedDB.

Suggested files:

```text
src/db/
├── database.ts
├── eventRepository.ts
├── scoreRepository.ts
└── settingsRepository.ts
```

Responsibilities:

`database.ts`

- initialize/open IndexedDB
- define schema/object stores/indexes
- handle schema version upgrades

`eventRepository.ts`

- low-level event reads/writes

`scoreRepository.ts`

- low-level score reads/writes

`settingsRepository.ts`

- low-level settings reads/writes

Services coordinate business operations across repositories.

Screens/components should not contain raw IndexedDB calls.

---

## 12. Recommended V1 Structure

First build:

- the five screens: Event Setup, Ready, Typing, Results, and Leaderboard
- one pure typing and scoring module
- one ranking helper
- one persistence module for events, scores, and settings
- passages bundled in the app

Do not add libraries beyond Vite, React, the PWA plugin, IndexedDB, the local font packages, and Vitest. Do not create a separate service or repository until that one persistence module is no longer enough. Section 14 already rules out extra services.

The tree below is a later split, not the first build:

```text
src/
├── screens/
│   ├── EventSetupScreen.tsx
│   ├── ReadyScreen.tsx
│   ├── TypingScreen.tsx
│   ├── ResultsScreen.tsx
│   └── LeaderboardScreen.tsx
│
├── components/
│   └── NameForm.tsx
│
├── services/
│   ├── EventService.ts
│   └── ScoreService.ts
│
├── features/
│   ├── typing/
│   │   ├── typingEngine.ts
│   │   ├── scoring.ts
│   │   └── typingTypes.ts
│   │
│   └── leaderboard/
│       └── ranking.ts
│
├── db/
│   ├── database.ts
│   ├── eventRepository.ts
│   ├── scoreRepository.ts
│   └── settingsRepository.ts
│
├── data/
│   ├── passages.ts
│   ├── commonWords.ts
│   └── wordLines.ts
│
├── app/
│   ├── App.tsx
│   ├── appReducer.ts
│   └── appTypes.ts
│
├── styles/
│   ├── tokens.css
│   └── global.css
│
└── main.tsx
```

Additional small shared files may be added when implementation requires them, but they should not be created merely to match an abstract architecture.

---

## 13. Boundary Rules

Use these rules when deciding where code belongs:

```text
Screen changes the user flow
→ screen

Reusable focused UI
→ component

Event or score business operation
→ service

IndexedDB read/write
→ repository / db layer

Typing state transformation
→ typingEngine

WPM / accuracy calculation
→ scoring

Leaderboard ordering
→ ranking

Static sentence content
→ passages
```

Avoid mixing these responsibilities.

Examples:

```text
TypingScreen should not call IndexedDB directly.

NameForm should not calculate Top 10 eligibility.

ScoreService should not render leaderboard rows.

EventService should not calculate WPM.

ranking.ts should not save scores.

passages.ts should not shuffle Race sentences per contestant.
wordLines.ts builds a new Standard draw for each attempt from the bundled word list.
```

---

## 14. Avoid Over-Architecture

Do not add extra layers unless a concrete implementation need appears.

V1 does not need separate abstractions such as:

```text
LeaderboardService
PassageService
TimerService
NavigationService
StorageManager
GameManager
ContestantRepository
HighScoreService
```

unless actual code complexity later justifies them.

Likewise, do not automatically split every visual element into its own React component.

Avoid creating files such as:

```text
WpmDisplay.tsx
AccuracyDisplay.tsx
TimerLabel.tsx
SentenceWord.tsx
Character.tsx
RankNumber.tsx
```

unless reuse, readability, testing, or complexity makes the extraction useful.

The V1 architecture should remain:

```text
small
explicit
testable
easy to trace
```

rather than maximizing the number of files or abstractions.

---

## 15. Error Handling

### IndexedDB Failure

If IndexedDB cannot initialize:

- show a clear operator-facing error
- do not silently run a non-persistent competition
- explain that scores cannot be reliably saved

### Corrupt or Missing Active Event

If `activeEventId` points to a missing event:

```text
clear invalid activeEventId
→ return to Event Setup
```

### No Previous Event

If no previous event can be continued:

- disable Continue Previous Event

### Offline Asset Failure

If required assets are not cached:

- surface the issue before event use where practical
- do not falsely imply offline readiness

If an "Offline ready" indicator exists, it must reflect real cache and service-worker readiness. Chips in the wireframe PNGs are decoration and are not that indicator.

---

## 16. Accessibility

Requirements:

- semantic buttons and inputs
- visible keyboard focus
- readable contrast
- large type
- large touch targets for operator controls
- no essential information communicated only through color
- incorrect-character state includes a non-color indicator
- name input has an explicit label
- reduced-motion support where animation exists
- `aria-live` may be used for result announcements

The physical keyboard is the primary contestant input.

The operator must still be able to use touch controls.

---

## 17. Performance

The app should feel immediate.

Targets:

- no network dependency during gameplay
- no remote font loads
- minimal JavaScript bundle
- no heavy animation libraries in V1
- responsive key handling
- no blocking IndexedDB work in the typing hot path
- avoid unnecessary rerenders on every timer tick

Prefer CSS transitions for simple visual feedback.

Scoring calculations should remain pure, lightweight functions.

---

## 18. Privacy and Security

V1 stores contestant data locally on the event iPad.

Collected data is limited to:

- name, if Top 10
- WPM
- accuracy
- timestamp

Do not collect:

- email
- phone
- account credentials
- location
- device identity

Name content must render as plain text and never as HTML.

A profanity/moderation system is not required for V1 unless requested later.

---

## 19. Testing Plan

Vitest covers the unit and persistence cases. React Testing Library covers the component cases. Playwright is optional after the core booth loop works.

Booth acceptance tests live in `docs/prd.md`. This section lists the automated cases and hardware checks.

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
zero-attempt accuracy calculation returns null
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
a printable character, including space or punctuation, can be that key
Shift and the other excluded non-typing keys do not start the timer
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
one space between sentences is ignored and the next letter still scores
a second space between sentences is an incorrect character
a leading space on the first sentence is an incorrect character
sentence completion preserves cumulative score counters
Backspace cannot reopen the previous committed sentence
passage order remains deterministic
```

---

### Unit Tests — Ranking

Required cases:

```text
higher displayed WPM ranks first
displayed accuracy, rounded to a whole number, breaks displayed-WPM ties
two scores that round to the same accuracy are not ordered by hidden tenths
earlier createdAt breaks remaining ties
scores below minimum accuracy are excluded
eligibility uses accuracy >= MIN_LEADERBOARD_ACCURACY, displayedWpm > 0, and ignores a stored meetsAccuracyThreshold flag
rank is derived rather than stored
Top 10 selection is correct
Top 5 selection is correct
high score is the first eligible ranked score
```

---

### Unit Tests — Results

Required cases:

```text
rank 1 headline is NEW HIGH SCORE! with no Top 5 line
rank 1 above 50 WPM adds You win a Plinko drop!
rank 1 at 1 through 50 WPM is NEW HIGH SCORE! only
places 2 through 5 use Nice typing! and You made the Top 5!
sixth through tenth use Nice typing! and You made the Top 10!
a Top 5 or Top 10 score above 50 shows the place line and the Plinko line
an unplaced score above 50 uses Nice typing! and the Plinko line only
an unplaced score at 1 through 50 WPM is Thanks for playing! only
a displayed 0 WPM result is Casper, is that you? and does not place
the first eligible score is the high score and a Top 10
accuracy below 80, including 79.99, hides name entry
a tie keeps the earlier score as the high score
sixth place is Top 10 and not Top 5
ten scores already ahead hide name entry
preview placement does not change the WPM stored on earlier scores
a name is trimmed and kept up to 20 characters
an empty name and a name past 20 characters are rejected
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
duration persists when continuing without a change
changing duration while continuing keeps the same event and its scores
changing game mode while continuing keeps the same event and its scores
each score keeps the duration, mode, passage set, and WPM from the attempt that earned it
ranking uses stored WPM when scores in one event have different durations or modes
an event saved before game modes is read as Race without changing its WPM
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
word list has a stable ID and 200 lowercase words
Standard lines fit on one line and change with a new random sequence
the same random sequence rebuilds the same Standard lines
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
name persists after update
fresh event does not delete archived events
fresh event does not delete old scores
leaderboard can be reconstructed from persisted scores
data survives page reload
submitting Save Score twice for the same result inserts one score row
View Leaderboard with no name inserts one score row with name null
```

---

### Component Tests

Use React Testing Library for high-value UI behavior rather than testing every visual detail.

Required cases:

```text
EventSetup disables Continue when no event exists
EventSetup can select 30-second mode
EventSetup can select 60-second mode
while Continue is selected, choosing the other duration updates the next contestant and keeps the event's scores
Ready screen responds to a key press through a window-level keydown listener
after 2 idle minutes, Ready shows a rolling all-time list of at most 50 scores that meet the accuracy gate and display at least 1 WPM
Escape, any other key, or a tap on that list returns to Ready and does not start the test
Ready-screen key is not passed into Typing as contestant input
Typing screen renders the full sentence before timer starts
Typing screen waits for first valid typing character before timer starts
if that key is not pressed within 5 seconds, Typing returns to Ready and saves no score
Escape during Typing returns to Ready and saves no score
long-press on the logo while Typing is waiting opens Event Setup and saves no score
after the timer starts, that long-press opens Event Setup and saves no score
long-press on the logo from Results opens Event Setup and does not write the unsaved result
Typing screen displays live WPM
Typing screen displays live accuracy
Typing screen displays remaining time
Top 10 result shows NameForm
non-Top-10 result does not show NameForm
non-Top-10 View Leaderboard opens the Top 5
name validation rejects empty values
View Leaderboard with an empty name writes one score row with a null name and opens the Top 5
Next Player returns to Ready
auto reset begins only on Leaderboard
leaderboard auto reset does not run while name entry is active
an empty Results name opens the leaderboard after 15 seconds, with the countdown visible for the last 5
Leaderboard renders no more than five rows
```

Do not over-test static decorative styling through component tests.

---

### Manual Layout Tests

Required on the actual target landscape iPad:

```text
Event Setup fits without clipping
portrait and Split View show the landscape full-screen instruction instead of the five screens
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
Results / Name layout fits
iPad software keyboard does not cover SAVE SCORE; if it does, the field and button stay in the upper half
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
10. Save a qualifying name.
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


## 20. Deployment

V1 is a static frontend application.

Requirements:

- HTTPS
- stable URL
- service-worker support
- no server dependency for booth operation

Suitable hosts include:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages if configured correctly for the build and PWA behavior

Deployment should prioritize simplicity and reliable HTTPS.

---

## 21. Environment Configuration

V1 should not require secrets because there is no backend/API.

No `.env` values should be required for normal booth operation.

If deployment tooling later introduces environment variables, commit only:

```text
.env.example
```

and keep actual secret files ignored.

---

## 22. Git Workflow

Primary branch:

```text
main
```

For the V1 MVP, avoid unnecessary branching complexity.

Typical workflow:

```bash
git pull
git add docs/prd.md docs/technical_plan.md
git commit -m "meaningful message"
git push
```

Example commits:

```text
Initialize React TypeScript app
Add design tokens and local fonts
Add app screen state flow
Add curated typing passages
Implement typing engine
Add timer and scoring
Add leaderboard ranking
Add IndexedDB persistence
Add event setup flow
Add results and name entry
Add offline PWA support
Add scoring and ranking tests
Apply final wireframe styling
```

Do not force-push shared history unless necessary.

---

## 23. V1 Implementation Order

Build the working booth loop before visual polish. The typing engine comes first. Then Event Setup, Ready, Results, and the Leaderboard, in that order. Ready comes before Results and the Leaderboard so the loop can be walked: Event Setup, Ready, Typing, Results, Leaderboard. The first build is the five screens, one pure typing and scoring module, a ranking helper, one persistence module, and bundled passages, as in section 12. Later phases add behavior inside those modules. Do not add a library to start a phase.

### Phase 1 — Project Foundation

Implement:

```text
React + TypeScript + Vite
design tokens
local fonts
basic screen-state reducer
```

### Phase 2 — Passage Data

Implement:

```text
curated local sentence set
deterministic ordering
stable passage-set ID
enough text for 60-second fast typists
```

### Phase 3 — Typing Engine

Implement:

```text
sentence display
keypress handling
repeat-event protection
caret
current word
correct / incorrect tracking
Backspace
sentence commit and transition
```

### Phase 4 — Timer and Scoring

Implement:

```text
first-key timer start
30 / 60 second duration
live WPM
accuracy
partial-word handling
minimum accuracy threshold
test completion
Plinko qualification
```

Add unit tests before continuing.

### Phase 5 — IndexedDB and Event Setup

Implement:

```text
events
scores
settings
fresh event
continue event
duration change for the next contestant
game mode change for the next contestant
Event Setup screen
Start Event
```

### Phase 6 — Ready Screen

Implement:

```text
contest messaging
current high score
Press Any Key to Start
```

### Phase 7 — Results

Implement:

```text
WPM
accuracy
high-score detection
Top 10 qualification
name entry
Plinko result
```

### Phase 8 — Leaderboard

Implement:

```text
ranking
Top 5 display
rank #1 emphasis
Next Player
auto reset
```

### Phase 9 — PWA

Implement:

```text
manifest
icons
service worker
offline asset caching
Home Screen installation
```

### Phase 10 — Final Styling

Apply:

```text
docs/design_system.md
docs/wireframes.md
landscape-iPad spacing
organic pastel graphics
```

### Phase 11 — Hardware and Offline Testing

Test on:

```text
target iPad
giant keyboard
airplane mode
```

Fix reliability issues before optional polish.

---

## 24. Definition of Done for V1

V1 is technically complete when:

- the React + TypeScript app builds successfully
- the implementation matches `docs/prd.md`, `docs/design_system.md`, and `docs/wireframes.md`
- the acceptance tests in `docs/prd.md` and the Testing Plan in this document pass, including the airplane-mode test on the target iPad

---

## 25. Post-V1 Full-Stack Roadmap

After V1, the project can evolve into a full-stack application without replacing the offline-first booth architecture.

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

### Potential API

```http
POST /api/events
GET  /api/events/:id

POST /api/events/:id/scores
GET  /api/events/:id/scores

POST /api/sync
```

### Future Sync Requirements

The local database remains the source used during live booth operation.

When connectivity becomes available:

```text
local unsynced data
→ send to API
→ server persists
→ mark local records synced
```

Gameplay must never wait for synchronization.

---

## 26. Post-V1 Enhancements

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
- alternate balanced passage sets
- admin controls
- automated offline/online sync
- Docker
- CI/CD
- backend automated tests
- monitoring

These should be added only after the core booth workflow is proven reliable.

---

## 27. Primary Engineering Principle

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
