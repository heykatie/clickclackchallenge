# Typing Test — V1 Technical Plan

## 1. Purpose

This document defines the technical implementation plan for V1 of the **Typing Test**.

The product is an offline-first typing competition designed for repeated use at event booths on a **landscape iPad** connected to a giant physical keyboard.

Implementation should follow:

- `docs/PRD.md`
- `docs/DESIGN_SYSTEM.md`
- wireframes in `docs/wireframes/`

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
- Results + nickname screen
- Leaderboard screen
- live WPM
- live accuracy
- timer
- character-level typing feedback
- Backspace
- deterministic passage sequence
- minimum leaderboard accuracy
- Top 10 nickname eligibility
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
→ collect nickname when eligible
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

### PWA / Service Worker

Recommended:

```text
vite-plugin-pwa
Workbox
```

`vite-plugin-pwa` should generate/register the service worker and Workbox precache manifest.

### Local Structured Storage — IndexedDB

Use:

```text
IndexedDB
```

Recommended wrapper:

```text
idb
```

IndexedDB stores:

```text
events
scores
settings
```

Use IndexedDB instead of `localStorage` for core application data because:

- events contain multiple related scores
- historical events are retained
- the data is structured
- indexes are useful
- future schema migrations are expected
- future cloud synchronization can build on the same model

### Passages

Typing passages are:

- prewritten
- bundled with the application
- versioned
- deterministic within an event
- available offline
- not fetched from an API

### Fonts and Visual Assets

Fonts, icons, logos, and required images must be bundled locally.

Recommended font packages:

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

Do not depend on Google Fonts or another remote CDN during booth use.

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

## Offline Behavior Implementation Specification

Offline operation is a core V1 architectural requirement.

After the application has been successfully loaded, installed, and cached on the target iPad, the complete booth workflow must function without an active internet connection.

The application must not require a runtime server connection for normal V1 operation.

### Offline Architecture Responsibilities

Offline behavior is split between two local systems:

```text
Service Worker / PWA Cache
→ keeps application code and required static assets available offline

IndexedDB
→ keeps structured event, score, and settings data available offline
```

These systems solve different problems and both are required.

The service worker must make the application itself available offline.

IndexedDB must preserve event and contestant data independently of network connectivity.

### Offline Launch Requirement

After a successful online installation/cache cycle, the installed PWA must launch when:

- Wi-Fi is disabled
- cellular data is unavailable
- airplane mode is enabled
- event Wi-Fi is unstable or unavailable

The app must be able to reach and use all V1 screens offline:

```text
Event Setup
Ready / Attract
Typing
Results / Nickname
Leaderboard
```

The app must not block launch because a server, API, analytics service, or remote asset host is unavailable.

### Offline Contestant Flow

The full contestant workflow must run locally:

```text
open app
→ create or continue event
→ Ready screen
→ press any key
→ Typing screen
→ run timed typing test
→ calculate WPM and accuracy
→ determine leaderboard eligibility
→ determine Plinko qualification
→ enter nickname when eligible
→ save result
→ derive leaderboard
→ show Leaderboard
→ reset for next contestant
```

No step in this flow may require:

- a backend server
- REST API
- cloud database
- authentication service
- remote passage service
- remote font request
- remote asset request

### PWA and Service Worker Strategy

Use:

```text
vite-plugin-pwa
Workbox
```

The service worker should be generated and registered through the Vite PWA configuration.

The service worker is responsible for making the application shell and required static resources available when the network is unavailable.

Required PWA resources include:

- web app manifest
- app icons
- service worker
- application shell
- offline-cached build assets

The installed app should remain usable after Safari or the Home Screen PWA is relaunched without connectivity.

### Required Offline Assets

All resources required for normal V1 booth use must be bundled locally or included in the service-worker cache.

Required assets include:

- HTML
- generated JavaScript bundles
- CSS
- typing passages
- fonts
- logo
- app icons
- required images
- decorative UI assets
- web app manifest
- other files required to render the V1 interface

Do not depend on runtime requests to:

- Google Fonts
- remote CDNs
- external passage APIs
- remote image hosts
- other third-party asset servers

Recommended local font packages:

```text
@fontsource/fredoka
@fontsource/nunito
@fontsource/atkinson-hyperlegible
```

Typing passages should be imported from local application data rather than fetched at runtime.

### Precache Strategy

Use Workbox precaching for the generated application shell and versioned build assets.

Precache resources required for booth operation.

Conceptually:

```text
build output
→ Workbox precache manifest
→ service-worker cache
```

Because Vite generates hashed/versioned production assets, the service worker should use those generated revisions rather than manually versioning files.

Core required assets should be available immediately after a successful installation/cache cycle.

### Navigation Fallback

Because the application is a client-side React app, offline navigation should resolve back to the application entry point where appropriate.

Configure an SPA navigation fallback so launching or reopening the installed application offline still loads the React app shell.

Do not rely on the server to generate individual application screens.

### Runtime Network Requests

Core V1 functionality should make **no required runtime API requests**.

Therefore, V1 does not require a runtime API caching strategy for gameplay.

If optional network functionality is introduced later, it must fail non-blockingly and must not interfere with the local booth flow.

### IndexedDB Offline Persistence

Use IndexedDB for structured local application data.

Recommended wrapper:

```text
idb
```

Required object stores:

```text
events
scores
settings
```

The following data must be writable while offline:

- event records
- score records
- nicknames
- active-event reference
- event duration
- passage-set identifier
- app settings required to restore or continue an event

A network connection must not be required to:

- create an event
- archive a previous event
- continue an event
- save a score
- save a nickname
- calculate the current high score
- calculate Top 10 eligibility
- generate the Top 5 leaderboard
- reset for the next contestant

### Offline Leaderboard Behavior

Do not persist a separate leaderboard record.

The leaderboard should be derived from the active event's locally stored scores.

Offline leaderboard flow:

```text
load active event scores from IndexedDB
→ filter scores meeting minimum accuracy
→ sort using ranking rules
→ derive Top 10
→ derive Top 5
→ derive current high score
```

This computation must work without connectivity.

### Fresh Event While Offline

The operator must be able to start a fresh event without internet access.

Expected local behavior:

```text
existing active event
→ archive locally

new event
→ create in IndexedDB
→ selected duration saved
→ passageSetId saved
→ status = active

settings.activeEventId
→ update locally
```

Previous event records and scores must remain stored.

### Continue Event While Offline

The operator must be able to continue the active event without internet access.

Restore from IndexedDB:

- event ID
- duration
- passage-set ID
- saved scores
- derived high score
- derived leaderboard

If no valid active event exists, Continue should be unavailable.

### Connection Loss During Active Use

If connectivity disappears while the app is already running, the active booth workflow must continue normally.

The app should not interrupt the contestant because of:

- Wi-Fi loss
- network timeout
- DNS failure
- poor event connectivity
- loss of internet access after launch

V1 should not display blocking network errors for functionality that is designed to be local.

### Persistence Across App Restarts

Completed event and score data must survive:

- React screen transitions
- browser/page refresh
- Home Screen app close/reopen
- temporary network loss
- normal iPad restart

The following data must remain available:

```text
events
scores
nicknames
activeEventId
durationSeconds
passageSetId
required app settings
```

The leaderboard should be reconstructed from persisted scores after relaunch.

A partially completed contestant session does not need to be restored after an unexpected app close.

If the app closes during a test:

```text
reopen app
→ restore active event
→ return to Ready
```

Previously completed scores must remain intact.

### Offline Readiness

The app should not be considered event-ready merely because it opened successfully while online.

Offline readiness requires the application shell and all required V1 assets to be available from the local cache.

If an offline-readiness indicator is implemented, it should represent actual readiness rather than being decorative.

Do not display an affirmative offline-ready state until required caching has completed successfully.

### Service Worker Update Behavior

A new deployed version may become available when the device regains connectivity.

Do not force an update or reload during:

- Ready-to-Typing transition
- active typing session
- Results nickname entry
- any other contestant-critical state

Prefer applying updates:

- on a future application launch, or
- while the application is safely idle

The current cached version should remain usable if the device is offline.

### iPad Installation Procedure

Before relying on the app at an event:

```text
1. Connect the target iPad to the internet.
2. Open the deployed HTTPS application in Safari.
3. Allow the application to finish loading.
4. Allow required PWA assets to finish caching.
5. Add the application to the Home Screen.
6. Launch the installed app while still online.
7. Confirm Event Setup loads correctly.
8. Confirm fonts, passages, icons, and required visual assets render correctly.
```

Installation alone is not sufficient.

Offline operation must be verified separately.

### Airplane Mode Acceptance Test

Offline support is not complete until the app passes a full end-to-end test on the actual target iPad.

Required test:

```text
1. Connect the iPad to the internet.
2. Open the deployed application.
3. Allow all required assets to finish loading/caching.
4. Add the app to the Home Screen if necessary.
5. Launch the installed app once while online.
6. Enable airplane mode.
7. Close and relaunch the installed app.
8. Create a fresh event or continue an existing event.
9. Reach the Ready screen.
10. Start the test using the physical keyboard.
11. Complete the full timed typing test.
12. Confirm WPM and accuracy are calculated.
13. Confirm leaderboard eligibility is calculated.
14. Enter and save a nickname when applicable.
15. Confirm the Top 5 leaderboard updates.
16. Use Next Player or allow automatic reset.
17. Confirm the app returns to Ready.
18. Close the app while airplane mode remains enabled.
19. Reopen the app.
20. Confirm the active event still exists.
21. Confirm previously saved scores still exist.
22. Confirm the high score and leaderboard are reconstructed correctly.
```

The MVP must not be considered complete until this test succeeds.

### Offline Technical Acceptance Criteria

The offline implementation is complete only when:

- the installed PWA launches without internet access
- all required V1 screens render offline
- locally bundled passages load offline
- required fonts load offline
- icons, logo, and required visual assets load offline
- Event Setup works offline
- a fresh event can be created offline
- the active event can be continued offline
- the Ready screen works offline
- the Typing screen works offline
- timer and scoring work offline
- nickname entry works offline
- event and score data can be written to IndexedDB offline
- the current high score can be derived offline
- Top 10 qualification can be derived offline
- the Top 5 leaderboard can be derived offline
- Next Player works offline
- automatic reset works offline
- saved data survives app close/reopen
- saved data survives normal iPad restart
- loss of connectivity during an active session does not interrupt gameplay
- no required V1 runtime request depends on a backend server
- the complete contestant flow passes in airplane mode on the target iPad

---

## 5. Application State Model

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
nickname if Top 10 eligible
  ↓
LEADERBOARD
  ↓
Next Player / automatic reset
  ↓
READY
```

The key used to leave the Ready screen must not count as the contestant's first typed character.

---

## 6. State Management Strategy

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

## 7. Data Model

V1 uses four core data concepts:

- `EventRecord`
- `ScoreRecord`
- `AppSettings`
- `PassageSet`

The model must preserve historical event data, associate every score with the event in which it was earned, and allow the active event to be restored after the app closes or restarts.

### Test Duration

```ts
type TestDuration = 30 | 60;
```

### Event Record

Each booth event is stored as its own record.

```ts
interface EventRecord {
  id: string;

  name: string | null;

  durationSeconds: TestDuration;
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

`name`

- optional human-readable event label
- not required from the operator in V1
- may remain `null`
- supports future event-history features without changing the model

`durationSeconds`

- fixed event duration
- valid values: `30` or `60`
- remains the source of truth when continuing the event

`passageSetId`

- identifies the passage-set version used by the event
- example: `common-sentences-v1`

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
  name: null,
  durationSeconds: 30,
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

  nickname: string | null;

  rawWpm: number;
  displayedWpm: number;
  accuracy: number;

  correctCharacters: number;
  correctAttempts: number;
  incorrectAttempts: number;

  durationSeconds: TestDuration;

  meetsAccuracyThreshold: boolean;

  createdAt: string;
}
```

Field behavior:

`id`

- unique score identifier
- generated with `crypto.randomUUID()`

`eventId`

- identifies the event this score belongs to

`nickname`

- nickname for a Top 10 qualifying score
- may remain `null` for scores outside the Top 10

`rawWpm`

- precise WPM before display rounding
- retained for internal precision and possible future analytics

`displayedWpm`

- rounded WPM shown to contestants
- used for V1 leaderboard ranking

`accuracy`

- final typing accuracy percentage

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

`meetsAccuracyThreshold`

- indicates whether the score passed the configured minimum leaderboard accuracy threshold
- does not imply Top 10 or Top 5 status

`createdAt`

- ISO submission timestamp
- final tie-breaker when displayed WPM and accuracy are equal

Example:

```ts
const score: ScoreRecord = {
  id: crypto.randomUUID(),
  eventId: "event-id",
  nickname: "Alex",

  rawWpm: 91.6,
  displayedWpm: 92,
  accuracy: 96.4,

  correctCharacters: 229,
  correctAttempts: 241,
  incorrectAttempts: 9,

  durationSeconds: 30,

  meetsAccuracyThreshold: true,

  createdAt: "2026-09-22T07:43:12.000Z"
};
```

### Derived Ranking Data

Do not permanently store:

```ts
rank: number;
isTop5: boolean;
isTop10: boolean;
```

These values can become stale whenever a new score is added.

Derive them from current event scores:

```text
load event scores
→ filter scores that meet minimum accuracy
→ sort using leaderboard rules
→ assign rank
→ derive Top 10
→ derive Top 5
```

Ranking order:

```text
1. displayedWpm descending
2. accuracy descending
3. createdAt ascending
```

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
  schemaVersion: 1
};
```

When continuing an existing event, `event.durationSeconds` remains the source of truth.

Changing the duration requires starting a fresh event.

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

Each event stores only its `passageSetId`.

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
- one event references one passage-set version
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
- event duration
- passage-set ID
- saved scores
- derived current high score
- derived leaderboard

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

- nickname
- score
- array index
- timestamp alone

---
## 8. IndexedDB Structure

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
## 9. Passage Architecture

All typing content must be prewritten, local, deterministic, and bundled with the application.

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

### Passage Source Rules

V1 must not depend on:

- API-generated passages
- AI-generated passages
- internet-loaded passages
- runtime-generated sentence content

### Sentence Style Rules

Sentences should:

- use natural grammatical English
- use common everyday vocabulary
- avoid obscure words
- avoid highly technical vocabulary
- avoid unnecessary proper nouns
- avoid numbers in V1
- use simple punctuation
- use normal capitalization
- be easy to scan quickly

Random disconnected word lists should not be used.

### Difficulty Consistency

Sentences should be reasonably similar in difficulty.

Control difficulty through:

- similar sentence length
- common vocabulary
- similar average word length
- simple punctuation
- normal capitalization
- avoiding unusually long or rare words

Initial sentence target:

```text
approximately 35–50 characters
```

This includes spaces and punctuation.

The exact visual limit must be validated using:

- the final Atkinson Hyperlegible font
- the final typing font size
- the actual target iPad

### Passage Length

The passage set must contain enough content for fast typists in a 60-second test.

Initial V1 target:

```text
at least 25–30 curated sentences
at least approximately 1,200–1,500 total characters
```

Both 30-second and 60-second modes use the same sequence.

The 30-second test simply stops earlier.

### Passage Set Versioning

Each passage set must have a stable identifier.

Example:

```text
common-sentences-v1
```

If passages change later, create a new version instead of silently replacing the existing set.

Example:

```text
common-sentences-v2
```

Each event stores its `passageSetId`.

---

## 10. Competitive Fairness

All contestants within the same event receive the same ordered sentence sequence.

Example:

```text
Contestant A:
Sentence 1 → Sentence 2 → Sentence 3 → ...

Contestant B:
Sentence 1 → Sentence 2 → Sentence 3 → ...
```

Do not randomly shuffle sentences per contestant in V1.

This keeps the text difficulty consistent across competitors and makes scores more directly comparable.

---

## 11. Typing Engine

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

## 12. Starting the Test

### Ready Screen

The Ready screen listens for keyboard input.

```text
PRESS ANY KEY TO START
```

On the first key event:

```text
consume the Ready-screen key event
→ transition to Typing
→ render the first sentence
→ wait for a valid typing key
```

Do not start the timer on the Ready-screen key.

The Ready-screen key must not propagate into the Typing-screen input handler.

### Typing Screen

The first valid typing character:

```text
starts the timer
+
counts as the first typing attempt
```

Keys that should not count as typing attempts include:

- Shift by itself
- Control
- Option / Alt
- Command / Meta
- Caps Lock
- Tab
- Escape
- arrow keys
- function keys

Backspace is handled separately.

---

## 13. Scoring Implementation

### 13.1 WPM Calculation

WPM is based on correct characters:

```text
WPM = (correctCharacters / 5) / elapsedMinutes
```

Rules:

- five correct characters equal one standard word
- correct letters, spaces, and punctuation count
- incorrect characters do not contribute to WPM
- correct characters in a partial word still count
- live WPM uses actual elapsed time
- final WPM uses the configured test duration

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

For final display:

```ts
const displayedWpm = Math.round(rawWpm);
```

Store `rawWpm` for internal precision.

Use `displayedWpm` for visible V1 leaderboard ranking so tie-breaking remains understandable to contestants.

### 13.2 Accuracy Calculation

Accuracy is based on typing attempts:

```text
Accuracy =
correctAttempts /
(correctAttempts + incorrectAttempts)
× 100
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

Rules:

- correct printable character → `correctAttempts + 1`
- incorrect printable character → `incorrectAttempts + 1`
- Backspace does not count as an attempt
- correcting an error does not erase the original incorrect attempt

Example:

```text
Expected: cat

c          → correctAttempts + 1
x          → incorrectAttempts + 1
Backspace  → no accuracy change
a          → correctAttempts + 1
t          → correctAttempts + 1
```

Final accuracy:

```text
3 / 4 = 75%
```

Before the contestant begins typing, the UI should show `—%` or hide accuracy rather than displaying `100%`.

### 13.3 Minimum Leaderboard Accuracy

Leaderboard participation requires a configurable minimum accuracy threshold.

Initial development constant:

```ts
export const MIN_LEADERBOARD_ACCURACY = 80;
```

Eligibility check:

```ts
function meetsLeaderboardAccuracy(accuracy: number): boolean {
  return accuracy >= MIN_LEADERBOARD_ACCURACY;
}
```

The `80%` threshold is provisional and must be validated on the physical giant keyboard before being treated as final.

A contestant below the threshold:

- still sees their Results screen
- still sees WPM
- still sees accuracy
- does not participate in leaderboard ranking
- is not prompted for a leaderboard nickname

Keep the threshold as an explicit configuration constant.

### 13.4 Ranking and Tie Behavior

Only scores meeting the minimum accuracy threshold participate in leaderboard ranking.

Rank by:

1. `displayedWpm` descending
2. accuracy descending
3. submission time ascending

Recommended comparator:

```ts
function compareScores(a: ScoreRecord, b: ScoreRecord): number {
  if (b.displayedWpm !== a.displayedWpm) {
    return b.displayedWpm - a.displayedWpm;
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

Example:

```text
Alex   92 WPM   98%
Mia    92 WPM   96%
```

Alex ranks above Mia.

If WPM and accuracy are both tied, the earlier submitted score remains higher.

### 13.5 Character-Level Scoring

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
4 correct attempts
1 incorrect attempt
```

Do not invalidate the entire word because one character is wrong.

Character-level scoring applies to:

- letters
- spaces
- punctuation
- partial words

### 13.6 Partial Words

If time expires in the middle of a word, all correct characters entered before timeout remain valid.

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

### 13.7 Error Advancement

Incorrect characters do not block progression.

On an incorrect printable character:

```text
1. record an incorrect attempt
2. store the typed character at the current position
3. visually mark that position as incorrect
4. advance the caret one character
```

The contestant may:

- continue typing, or
- press Backspace to correct the mistake

Do not force correction before advancing.

### 13.8 Backspace Behavior

Backspace is allowed during an active test.

Backspace should:

```text
1. remove the most recently entered character in the current sentence
2. move the caret backward one position
3. update visible correctness state
4. allow the contestant to re-enter that position
```

Backspace itself:

- does not increase `correctAttempts`
- does not increase `incorrectAttempts`
- does not contribute to WPM
- does not erase a previously recorded incorrect attempt from accuracy

If the removed character currently contributes to `correctCharacters`, remove that current correct-character credit until the position is correctly entered again.

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

Backspace applies only to the currently displayed sentence.

Once a sentence is completed and replaced by the next sentence, the previous sentence is committed and cannot be edited.

### 13.9 Sentence Completion

A sentence is complete when the contestant has entered a character for every expected position, regardless of whether every character is correct.

At completion:

```text
commit sentence
→ preserve cumulative scoring metrics
→ increment sentenceIndex
→ load next full sentence
→ reset current-sentence typedCharacters
→ reset characterIndex
→ keep timer running
```

Because errors do not block advancement, an incorrect final character still completes the sentence.

### 13.10 Valid Typing Input

Only printable characters count as typing attempts.

Examples:

```text
letters
numbers
space
punctuation
```

Keys that do not count:

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

Backspace is handled separately.

### 13.11 Repeated Key Events

Each physical keypress should count as one attempt.

Browser-generated repeated `keydown` events caused by holding a key should be ignored.

```ts
if (event.repeat) return;
```

Repeated letters in normal words still work because separate physical presses generate separate non-repeat events.

### 13.12 Timer Cutoff

Input must stop contributing to the result once the configured duration has elapsed.

Before processing a typing event, confirm the current timestamp is before the test end time.

Conceptually:

```ts
if (performance.now() >= endsAt) {
  finishTest();
  return;
}
```

This prevents late key events from being counted after timeout.

### 13.13 Final Score Calculation

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

const displayedWpm = Math.round(rawWpm);

const meetsAccuracyThreshold =
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

  meetsAccuracyThreshold: boolean;
}
```

---

## 14. Prize / Plinko Qualification

The Ready screen currently says:

```text
Type above 50 WPM for a Plinko drop.
```

Prize qualification and leaderboard qualification are separate rules.

Initial implementation:

```ts
export const PLINKO_WPM_THRESHOLD = 50;
```

Based on the current wording **"above 50 WPM"**, qualification is:

```ts
const qualifiesForPlinko =
  displayedWpm > PLINKO_WPM_THRESHOLD;
```

Therefore:

```text
51 WPM or higher → qualifies
50 WPM           → does not qualify
```

If the intended business rule is actually **50 WPM or higher**, update both the implementation and UI copy together.

The leaderboard accuracy threshold does not automatically control Plinko qualification unless that becomes an explicit future requirement.

---

## 15. Current Word and Caret

The typing sentence has several visual states.

### Completed Correct Text

Use:

```text
charcoal
```

Token:

```css
--tiny-charcoal
```

### Current Word

Use:

```text
lavender
```

Token:

```css
--tiny-lavender
```

### Caret

Use:

```text
strong mint
```

Token:

```css
--tiny-mint-strong
```

The caret must appear at the exact typed character position.

Example:

```text
acr│oss
```

### Upcoming Text

Use:

```text
muted gray
```

Token:

```css
--tiny-muted
```

### Incorrect Character

Use:

```css
--tiny-error
```

Also include a non-color indicator such as underline or background tint.

---

## 16. Sentence Transition

Only one sentence is visible at a time.

When the contestant reaches the end of the current sentence:

```text
sentence commits
→ sentenceIndex increments
→ next full sentence replaces it
→ timer continues
→ cumulative scoring continues
```

Do not:

- wrap the sentence to a second line
- append the next sentence to the same line
- dynamically shrink the font
- allow Backspace into a committed sentence

---

## 17. Timer

Event duration:

```ts
30 | 60
```

Timer starts on:

```text
first valid typing character on the Typing screen
```

Timer ends when:

```text
selected duration has elapsed
```

Use monotonic timestamps rather than relying only on decrementing `setInterval`.

Recommended:

```ts
const startedAt = performance.now();
const endsAt = startedAt + durationSeconds * 1000;
```

UI updates may use `requestAnimationFrame` or a short interval, but elapsed time should always be derived from timestamps.

---

## 18. Top 10 Nickname Eligibility

After a test completes:

1. confirm the score meets the minimum accuracy threshold
2. temporarily include it in the event's eligible scores
3. rank all eligible scores
4. determine the contestant's rank

If:

```text
rank <= 10
```

show nickname entry.

Otherwise:

```text
nickname entry is omitted
```

Only the Top 5 are displayed on the Leaderboard screen.

Top 10 and Top 5 status are derived values and should not be permanently stored.

---

## 19. Nickname Handling

Nickname rules:

- any nickname is allowed
- trim leading/trailing whitespace
- reject empty values
- enforce a maximum length for layout safety
- render as plain text, never HTML

Recommended maximum:

```text
20 characters
```

Do not use:

```text
dangerouslySetInnerHTML
```

for contestant-provided nickname content.

---

## 20. Results Screen

The Results screen displays:

- final WPM
- final accuracy
- new-high-score state when applicable
- Plinko qualification when applicable
- Top 10 qualification when applicable

If Top 10 eligible:

```text
show nickname field
+
Save Score
```

Nickname entry remains on the same Results screen.

Automatic next-player reset must not run while nickname entry is in progress.

After saving or continuing from Results, show the Leaderboard screen.

---

## 21. High Score Detection

The current high score is the rank #1 leaderboard-eligible score using the standard ranking rules.

Ready screen behavior:

```text
if event has an eligible score:
  display high score + nickname

if event has no eligible score:
  display empty state
```

Example:

```text
Be the first high score!
```

---

## 22. Leaderboard Screen

Display:

```text
Top 5
```

Each row contains:

- rank
- nickname
- displayed WPM

Optional presentation:

- emphasize rank #1
- highlight the newest contestant if they appear in the Top 5

Do not expose:

- raw character counts
- internal IDs
- database metadata

---

## 23. Next Player and Automatic Reset

The Leaderboard screen includes:

```text
NEXT PLAYER
```

Selecting it returns immediately to:

```text
ready
```

Also support automatic reset.

Initial configurable value:

```ts
export const LEADERBOARD_AUTO_RESET_MS = 10_000;
```

Automatic reset begins only after the Leaderboard screen appears.

Reset contestant-specific state:

- typed text
- sentence position
- timer state
- live WPM
- live accuracy
- current result
- nickname input

Preserve event state:

- active event
- duration
- passage set
- saved scores
- high score
- leaderboard

---

## 24. Ready / Attract Screen

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

The screen listens for contestant keyboard input only while in the Ready state.

---

## 25. Typing Screen Layout

The Typing screen is intentionally minimal.

### Top

Display lightweight context such as:

```text
logo
high score
```

Do not show the shop name if the final design remains unbranded.

### Center

Display:

```text
one complete sentence
```

Requirements:

- horizontally centered
- visually centered as one text block
- one line
- no clipping
- balanced safe space left and right
- Atkinson Hyperlegible
- current word lavender
- caret strong mint
- incorrect characters visually distinct

### Bottom Left

```text
live WPM
```

### Bottom Center

```text
remaining time
```

### Bottom Right

```text
accuracy
```

---

## 26. Design Implementation

All UI should follow:

```text
docs/DESIGN_SYSTEM.md
```

Core tokens:

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

Visual direction:

- blush / white backgrounds
- mint as strongest interactive accent
- lavender as secondary emphasis
- soft pink and peach as supporting decoration
- flat pastel surfaces
- rounded forms
- organic edge shapes
- minimal shadows
- generous whitespace
- sparse decorative motifs

Avoid:

- dark gamer UI
- neon RGB styling
- heavy gradients
- heavy shadows
- sharp corporate layouts
- clutter during typing

---

## Component and Module Boundaries

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

Displays:

- contest messaging
- Plinko threshold message
- current high score
- logo / allowed decorative branding
- `PRESS ANY KEY TO START`

Handles:

```text
contestant keypress
→ consume Ready-screen key
→ transition to TypingScreen
```

The key used to leave the Ready screen must not:

- start the timer
- count as a typing attempt
- affect WPM
- affect accuracy

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
- decide Top 10 nickname eligibility by itself
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
NicknameForm
```

The Results screen should coordinate score saving through `ScoreService`.

Conceptual flow:

```text
receive TestResult
→ determine result messaging
→ if Top 10, show NicknameForm
→ save score / nickname
→ LeaderboardScreen
```

Nickname entry remains part of the Results screen.

Do not add a separate app-level `"nickname"` screen state.

It should not:

- contain IndexedDB implementation details
- contain typing-engine logic
- permanently store leaderboard rank

---

### NicknameForm

Suggested file:

```text
src/components/NicknameForm.tsx
```

Responsibility:

- collect and validate a qualifying contestant's nickname

Handles:

- text input
- trimming leading/trailing whitespace
- rejecting empty values
- maximum-length validation
- submit action

Recommended V1 limit:

```ts
export const MAX_NICKNAME_LENGTH = 20;
```

Suggested props:

```ts
interface NicknameFormProps {
  onSubmit: (nickname: string) => void;
}
```

The component should receive submission behavior through props.

It should not:

- access IndexedDB directly
- calculate leaderboard rank
- decide whether the contestant is Top 10
- calculate WPM or accuracy

The parent `ResultsScreen` determines whether `NicknameForm` should be shown.

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
- nickname
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
  passageSetId: string
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
update nickname
load scores for an event
```

Suggested API:

```ts
saveScore(score: ScoreRecord): Promise<void>;

getScoresForEvent(
  eventId: string
): Promise<ScoreRecord[]>;

updateScoreNickname(
  scoreId: string,
  nickname: string
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
): number;

meetsLeaderboardAccuracy(
  accuracy: number
): boolean;
```

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
filter minimum-accuracy scores
→ sort by displayed WPM
→ break ties by accuracy
→ break remaining ties by earlier createdAt
→ derive rank
→ derive Top 10
→ derive Top 5
```

Suggested ranking order:

```text
1. displayedWpm descending
2. accuracy descending
3. createdAt ascending
```

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

The module should not:

- fetch passages from an API
- generate passages at runtime
- shuffle sentences per contestant
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

## Recommended V1 Structure

Use this as the initial structure:

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
│   └── NicknameForm.tsx
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
│   └── passages.ts
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

## Boundary Rules

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

NicknameForm should not calculate Top 10 eligibility.

ScoreService should not render leaderboard rows.

EventService should not calculate WPM.

ranking.ts should not save scores.

passages.ts should not shuffle content per contestant.
```

---

## Avoid Over-Architecture

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

## 28. PWA Strategy

The typing test must be installable on the iPad and usable without connectivity after the required application assets have been cached.

Recommended implementation:

```text
Vite
+
vite-plugin-pwa
+
Workbox-generated service worker
```

The PWA must include:

- web app manifest
- installable app icons
- service worker
- offline-cached application shell
- locally bundled fonts
- locally bundled passages
- locally bundled required images/assets

Core gameplay must not make runtime network requests.

Expected lifecycle:

```text
open app while online
→ service worker installs and caches required assets
→ add app to iPad Home Screen
→ launch installed app
→ disconnect network
→ complete full booth flow locally
```

### Service Worker Updates

A newly deployed version may be discovered/downloaded when connectivity returns.

Do not force a service-worker update or page reload during an active contestant session.

Prefer applying a new version:

- on a future app launch, or
- while the app is safely idle

The typing session must never be interrupted by an update.

---
## 29. iPad Installation and Offline Verification

Before an event, while online:

```text
1. Open the deployed HTTPS URL in Safari.
2. Allow the app to load fully.
3. Add it to the Home Screen.
4. Launch the installed PWA.
5. Confirm event setup and assets load.
6. Enable airplane mode.
7. Relaunch the app.
8. Run a complete test.
9. Save a score.
10. Close and reopen the app.
11. Confirm the event and score still exist.
```

Do not consider offline support complete until this succeeds on the target iPad.

---

## 30. Offline Caching Strategy

Use **Workbox precaching** for all resources required to run V1 offline.

Precache:

- generated HTML / app entry point
- JavaScript bundles
- CSS
- bundled font files
- app icons
- logo
- required decorative images
- any static assets not already embedded in the build

Passages imported into the application bundle are naturally included with the versioned application code. If passage data is emitted as a separate static asset, it must also be precached.

For Vite's hashed/versioned build assets, rely on the Workbox precache manifest generated through `vite-plugin-pwa`. A separate runtime cache is not required for core V1 assets.

For SPA navigation, configure an offline navigation fallback to the application's entry point where needed so reopening the installed app loads the React application even without connectivity.

V1 has no required runtime API, so no API caching strategy is needed.

The offline data split is:

```text
application code + static assets
→ service-worker precache

structured event + score + settings data
→ IndexedDB
```

When a new deployment becomes available, cached build assets may update when connectivity returns, but the app must not reload during an active typing session.

If an offline-readiness indicator is shown, it should represent actual service-worker/cache readiness where practical rather than being decorative only.

---
## 31. Persistence Requirements

The following must survive:

```text
browser refresh
Home Screen app close/reopen
temporary network loss
normal iPad restart
```

Persist:

- events
- scores
- nicknames
- active event
- event duration
- passage-set identifier
- settings

Leaderboard state should be derived from persisted scores rather than stored separately.

Do not persist transient contestant typing state after completion/reset.

If the app closes during an active test, reopening may safely return to the Ready screen rather than restoring a partial test.

---

## 32. Error Handling

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

If an "Offline ready" indicator exists, it should reflect actual readiness rather than decoration.

---

## 33. Accessibility

Requirements:

- semantic buttons and inputs
- visible keyboard focus
- readable contrast
- large type
- large touch targets for operator controls
- no essential information communicated only through color
- incorrect-character state includes a non-color indicator
- nickname input has an explicit label
- reduced-motion support where animation exists
- `aria-live` may be used for result announcements

The physical keyboard is the primary contestant input.

The operator must still be able to use touch controls.

---

## 34. Performance

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

## 35. Privacy and Security

V1 stores contestant data locally on the event iPad.

Collected data is limited to:

- nickname, if Top 10
- WPM
- accuracy
- timestamp

Do not collect:

- email
- phone
- account credentials
- location
- device identity

Nickname content must render as plain text and never as HTML.

A profanity/moderation system is not required for V1 unless requested later.

---

## 36. Testing Plan

### Unit Tests — Scoring

Required tests:

```text
perfect typing produces expected WPM
30-second final WPM is correct
60-second final WPM is correct
incorrect characters do not increase WPM
incorrect attempts lower accuracy
Backspace itself does not affect accuracy
correcting an error does not erase the original accuracy penalty
correcting a removed character restores correct-character WPM credit
partial words count toward WPM
incorrect characters do not block further typing
80% accuracy meets the development threshold
79.99% accuracy does not meet the development threshold
late input after timeout is ignored
held-key repeat events are ignored
Ready-screen start key is not scored
first valid Typing-screen key starts timer and is scored
```

### Unit Tests — Ranking

Required tests:

```text
higher displayed WPM ranks first
accuracy breaks displayed-WPM ties
earlier submission breaks remaining ties
scores below minimum accuracy are excluded
Top 10 qualification is correct
Top 5 selection is correct
```

### Unit Tests — Events

Required tests:

```text
fresh event has no scores
starting fresh preserves old event data
starting fresh archives the previous active event
continue restores active event
continue restores existing scores
duration persists when continuing
passage set persists when continuing
```

### Unit Tests — Passages

Required tests:

```text
passage set has a stable ID
passage set is not empty
all sentences are strings
all sentences meet the configured one-line character target during content validation
passage set contains enough total characters for a fast 60-second test
```

The final one-line fit must also be validated visually on the target iPad because character count alone cannot guarantee rendered width.

### Component Tests

High-value component behavior:

```text
Ready screen responds to a key press
Ready-screen key is not scored
Typing waits for first valid typing key before timer starts
Top 10 result shows nickname input
non-Top-10 result omits nickname input
Next Player returns to Ready
auto reset starts only on Leaderboard
nickname entry is not interrupted by auto reset
```

### Manual Hardware Tests

Required before event deployment:

```text
landscape layout on target iPad
actual giant keyboard input
30-second mode
60-second mode
fast typing
slow typing
incorrect typing
Backspace
mistake correction
button mashing
held key
partial word at timeout
sentence transition
Top 10 qualification
Top 5 ranking
nickname entry
Plinko threshold
auto reset
Next Player
app restart
airplane mode
PWA relaunch
score persistence after restart
one-line passage fit
```

---

## 37. Deployment

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

## 38. Environment Configuration

V1 should not require secrets because there is no backend/API.

No `.env` values should be required for normal booth operation.

If deployment tooling later introduces environment variables, commit only:

```text
.env.example
```

and keep actual secret files ignored.

---

## 39. Git Workflow

Primary branch:

```text
main
```

For the V1 MVP, avoid unnecessary branching complexity.

Typical workflow:

```bash
git pull
git add .
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
Add results and nickname entry
Add offline PWA support
Add scoring and ranking tests
Apply final wireframe styling
```

Do not force-push shared history unless necessary.

---

## 40. V1 Implementation Order

Build the working booth loop before visual polish.

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

### Phase 5 — IndexedDB and Event Persistence

Implement:

```text
events
scores
settings
fresh event
continue event
```

### Phase 6 — Results

Implement:

```text
WPM
accuracy
high-score detection
Top 10 qualification
nickname entry
Plinko result
```

### Phase 7 — Leaderboard

Implement:

```text
ranking
Top 5 display
rank #1 emphasis
Next Player
auto reset
```

### Phase 8 — Ready Screen

Implement:

```text
contest messaging
current high score
Press Any Key to Start
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
DESIGN_SYSTEM.md
wireframes
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

## 41. Definition of Done for V1

V1 is technically complete when:

- React + TypeScript app builds successfully
- operator can create a fresh event
- operator can continue the active event
- fresh event preserves historical data
- 30-second and 60-second modes work
- Ready screen starts from any key
- Ready-screen key is not scored
- first valid Typing-screen key starts the timer
- held-key repeat events are ignored
- sentence remains one line and fully visible
- current word is highlighted
- caret follows the exact character position
- incorrect characters are visually identifiable
- WPM is correct
- accuracy is correct
- partial words are counted correctly
- Backspace follows the defined scoring rules
- errors do not need to be corrected before advancing
- minimum leaderboard accuracy is enforced
- Top 10 contestants can enter a nickname
- Top 5 displays correctly
- tie behavior is deterministic
- high score updates correctly
- Plinko qualification follows the configured rule
- passage order is consistent across contestants in the same event
- passage set contains enough text for fast 60-second typists
- passage-set ID is retained with the event
- Next Player resets contestant state
- automatic reset works
- event and scores survive restart
- required application assets are available offline
- app launches and functions in airplane mode
- full contestant flow succeeds without a required server connection
- app matches the documented design system
- core scoring, ranking, passage, and event tests pass

---

## 42. Post-V1 Full-Stack Roadmap

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

## 43. Post-V1 Enhancements

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

## 44. Primary Engineering Principle

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
