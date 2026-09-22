# Typing Test

An offline-first typing competition built for event booths using a giant physical keyboard and a landscape iPad.

The app replaces a generic browser typing-test workflow with a purpose-built experience that handles contestant flow, scoring, leaderboard ranking, local persistence, and offline operation without requiring a server connection during an event.

> **Project status:** V1 planning and specification are complete. Implementation is the next phase.

---

## Table of Contents

- [Overview](#overview)
- [Problem](#problem)
- [V1 Goals](#v1-goals)
- [Core Features](#core-features)
- [User Flow](#user-flow)
- [Scoring Rules](#scoring-rules)
- [Passage Rules](#passage-rules)
- [Offline-First Requirements](#offline-first-requirements)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Component and Module Boundaries](#component-and-module-boundaries)
- [Project Structure](#project-structure)
- [Wireframes](#wireframes)
- [Getting Started](#getting-started)
- [Development Scripts](#development-scripts)
- [Testing](#testing)
- [iPad PWA Setup](#ipad-pwa-setup)
- [Deployment](#deployment)
- [Privacy and Data](#privacy-and-data)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [Development Workflow](#development-workflow)
- [License](#license)

---

## Overview

Typing Test is designed for a real event-booth workflow where visitors compete on a giant physical keyboard connected to an iPad.

The current generic workflow requires manual page resets and manual high-score tracking. This project turns that into a complete local-first competition flow:

```text
Event Setup
→ Ready
→ Typing
→ Results / Nickname
→ Leaderboard
→ Next Player
→ Ready
```

The V1 application is designed around:

- fast contestant turnover
- fair and deterministic scoring
- offline reliability
- local event persistence
- a readable landscape-iPad interface
- minimal operator intervention
- a playful pastel visual system without sacrificing usability

---

## Problem

A generic typing website works for basic typing tests, but it is not designed for repeated event-booth use.

The current workflow has several limitations:

- the page must be manually refreshed or reset between contestants
- the high score must be tracked manually
- event Wi-Fi may be unavailable or unreliable
- generic typing sites may depend on a live internet connection
- scoring and prize rules are not integrated into the booth experience
- there is no local event leaderboard
- there is no built-in nickname flow
- there is no persistent event state
- the interface is not optimized for a giant keyboard and landscape iPad

Typing Test is intended to remove those friction points.

---

## V1 Goals

V1 should:

1. run reliably on a landscape iPad
2. support a giant physical keyboard
3. work fully offline after installation/caching
4. support 30-second and 60-second test modes
5. calculate WPM and accuracy consistently
6. prevent incorrect typing from inflating WPM
7. prevent low-accuracy button mashing from entering the leaderboard
8. retain event and score data locally
9. support Top 10 nickname entry
10. display a Top 5 leaderboard
11. reset cleanly for the next contestant
12. preserve historical event data when starting fresh
13. use the same passage sequence for all contestants in an event
14. require no backend connection for V1 booth operation

---

## Core Features

### Event Setup

The operator can:

- select a 30-second or 60-second event
- start a fresh event
- continue the current/most recently active event

Starting fresh:

- creates a new event
- starts with an empty leaderboard
- preserves previous event records and scores

Continuing:

- restores the same event
- restores its original duration
- restores its passage-set version
- restores its saved scores

### Ready / Attract Screen

The Ready screen includes:

- contest messaging
- current high score
- prize threshold messaging
- `PRESS ANY KEY TO START`

It intentionally does **not** include:

- a Start button
- the Top 5 leaderboard
- operator settings

The key used to leave Ready is consumed and does not count as contestant typing input.

### Typing Test

The Typing screen includes:

- one sentence at a time
- one-line passage layout
- current-word highlighting
- exact caret position
- correct / incorrect character feedback
- live WPM
- live accuracy
- remaining time
- Backspace support

The timer begins only when the contestant presses the first valid typing character on the Typing screen.

### Results / Nickname

The Results screen shows:

- final WPM
- final accuracy
- new-high-score state when applicable
- prize qualification when applicable
- Top 10 qualification when applicable

Top 10 contestants can enter a nickname directly on the Results screen.

### Leaderboard

The visible leaderboard shows the event's Top 5.

Each row includes:

- rank
- nickname
- displayed WPM

The leaderboard supports:

- deterministic tie-breaking
- Next Player
- automatic reset to Ready

---

## User Flow

### Operator

```text
Open app
→ choose 30s or 60s
→ Start Fresh or Continue Previous Event
→ Ready
```

### Contestant

```text
Ready
→ press any key
→ Typing screen appears
→ first valid typing key starts timer
→ type until time expires
→ Results
→ nickname if Top 10
→ Leaderboard
→ Next Player / auto-reset
→ Ready
```

No browser refresh is required between contestants.

---

## Scoring Rules

### WPM

WPM is based on correct characters:

```text
WPM = (correctCharacters / 5) / elapsedMinutes
```

Rules:

- five correct characters count as one standard word
- correct letters, spaces, and punctuation count
- incorrect characters do not increase WPM
- partial words still receive credit for correct characters typed before timeout
- final WPM is displayed as a rounded whole number

### Accuracy

Accuracy is based on typing attempts:

```text
Accuracy =
correctAttempts /
(correctAttempts + incorrectAttempts)
× 100
```

Rules:

- correct character attempt → correct attempt
- incorrect character attempt → incorrect attempt
- Backspace itself does not count as a typing attempt
- correcting a mistake does not erase the original incorrect attempt

### Character-Level Scoring

Scoring is character-based rather than whole-word-based.

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

### Errors

Incorrect characters:

- are visually marked
- do not increase WPM
- reduce accuracy
- do not block the contestant from continuing

Contestants are not required to correct errors before advancing.

### Backspace

Backspace:

- removes the most recently entered character in the current sentence
- moves the caret backward
- does not count as a typing attempt
- does not erase the original accuracy penalty
- can restore correct-character credit when the replacement character is correct

Backspace cannot reopen a previously completed sentence.

### Leaderboard Accuracy Threshold

Initial development threshold:

```text
80% accuracy
```

A score below the threshold:

- still receives a Results screen
- still shows WPM and accuracy
- does not enter leaderboard ranking
- does not qualify for Top 10 nickname entry
- cannot appear in the Top 5

The 80% threshold is provisional until it is validated on the physical giant keyboard.

### Ranking

Eligible scores are ranked by:

```text
1. displayed WPM descending
2. accuracy descending
3. earlier submission first
```

### Prize / Plinko Rule

Current booth copy:

```text
Type above 50 WPM for a Plinko drop.
```

Based on that wording:

```text
51 WPM or higher → qualifies
50 WPM           → does not qualify
```

If the business rule changes to `50 WPM or higher`, the copy and implementation should be updated together.

---

## Passage Rules

V1 passages are:

- prewritten
- bundled locally
- deterministic
- natural grammatical sentences
- based on common vocabulary
- similar in difficulty
- simple in punctuation
- designed to fit on one line

Initial sentence target:

```text
approximately 35–50 characters
```

Initial passage-set target:

```text
at least 25–30 curated sentences
at least approximately 1,200–1,500 total characters
```

All contestants within the same event receive the **same ordered sentence sequence**.

The app should not:

- randomize passages per contestant
- fetch passages from an API
- generate passages with AI at runtime
- dynamically shrink the typing font to fit a sentence

Each passage set is versioned:

```text
common-sentences-v1
common-sentences-v2
```

Each event stores the passage-set ID it used.

---

## Offline-First Requirements

Offline operation is a core V1 requirement.

After the app has been installed and successfully cached, the complete booth workflow must work with:

- Wi-Fi disabled
- no cellular connection
- airplane mode enabled

### Required Offline Assets

The app must locally bundle or cache:

- HTML
- CSS
- JavaScript
- typing passages
- fonts
- app icons
- logo
- required images
- decorative UI assets
- web app manifest

### Required Offline Data

IndexedDB must persist:

- event records
- score records
- nicknames
- active-event reference
- event duration
- passage-set ID
- required app settings

A server connection is not required to:

- create an event
- continue an event
- save a score
- save a nickname
- calculate leaderboard ranking
- determine the high score
- reset for the next contestant

The MVP is not considered complete until the full booth flow passes in airplane mode on the actual target iPad.

---

## Tech Stack

| Area | V1 Choice |
|---|---|
| UI | React |
| Language | TypeScript |
| Build tool | Vite |
| App model | Progressive Web App |
| Service worker | Workbox via `vite-plugin-pwa` |
| Local structured storage | IndexedDB |
| IndexedDB helper | `idb` |
| Unit testing | Vitest |
| Component testing | React Testing Library |
| Passages | locally bundled |
| Fonts/assets | locally bundled |
| Deployment | static HTTPS hosting |
| Required backend | none |

### Fonts

Recommended local font packages:

```text
@fontsource/fredoka
@fontsource/nunito
@fontsource/atkinson-hyperlegible
```

Roles:

```text
Fredoka                display / major UI
Nunito                 general interface
Atkinson Hyperlegible  typing text
```

---

## Architecture

V1 is a local-first static application.

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
      persistent data    offline app assets
          │                   │
          ▼                   ▼
   events / scores       HTML / CSS / JS
   settings              fonts / icons
                         passages / assets
```

The two offline systems have separate responsibilities:

```text
IndexedDB
→ structured event and score persistence

Service Worker
→ offline application and asset availability
```

Core V1 gameplay does not require a runtime API.

---

## Data Model

### Event

```ts
interface EventRecord {
  id: string;
  name: string | null;

  durationSeconds: 30 | 60;
  passageSetId: string;

  status: "active" | "archived";

  createdAt: string;
  updatedAt: string;
}
```

### Score

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

  durationSeconds: 30 | 60;

  meetsAccuracyThreshold: boolean;

  createdAt: string;
}
```

### Settings

```ts
interface AppSettings {
  activeEventId: string | null;
  lastSelectedDuration: 30 | 60;
  schemaVersion: number;
}
```

### Passage Set

```ts
interface PassageSet {
  id: string;
  sentences: string[];
}
```

Leaderboard rank, Top 5 status, and Top 10 status are derived rather than permanently stored.

---

## Component and Module Boundaries

V1 follows a small, explicit structure.

```text
Screens
→ user flow

Components
→ focused reusable UI

Services
→ event / score operations

Pure functions
→ typing / scoring / ranking

Data modules
→ bundled passages
```

Primary boundaries:

- `EventSetupScreen`
- `ReadyScreen`
- `TypingScreen`
- `ResultsScreen`
- `NicknameForm`
- `LeaderboardScreen`
- `EventService`
- `ScoreService`
- `typingEngine`
- `scoring`
- `ranking`
- `passages`

The project intentionally avoids over-architecture.

Do not introduce extra service layers or tiny one-purpose components unless the implementation actually benefits from them.

---

## Project Structure

Planned V1 structure:

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
├── styles/
│   ├── tokens.css
│   └── global.css
│
└── main.tsx
```

Documentation:

```text
docs/
├── PRD.md
├── DESIGN_SYSTEM.md
├── TECHNICAL_PLAN.md
├── WIREFRAMES.md
└── wireframes/
    ├── 01-event-setup.png
    ├── 02-ready.png
    ├── 03-typing.png
    ├── 04-results.png
    └── 05-leaderboard.png
```

---

## Wireframes

The five primary V1 screens are documented in `docs/wireframes/`.

### Event Setup

![Event Setup wireframe](docs/wireframes/01-event-setup.png)

### Ready

![Ready wireframe](docs/wireframes/02-ready.png)

### Typing

![Typing wireframe](docs/wireframes/03-typing.png)

### Results / Nickname

![Results wireframe](docs/wireframes/04-results.png)

### Leaderboard

![Leaderboard wireframe](docs/wireframes/05-leaderboard.png)

If the final repository uses different filenames, update these paths accordingly.

---

## Getting Started

> The project is currently in the pre-implementation / initialization phase. The commands below reflect the planned React + TypeScript + Vite setup.

### Prerequisites

Recommended:

- Node.js 20+ LTS
- npm 10+
- Git
- a modern browser for development
- Safari/iPad for final PWA verification

Check local versions:

```bash
node --version
npm --version
git --version
```

### Clone

```bash
git clone git@github.com:heykatie/typing-test.git
cd typing-test
```

### Install Dependencies

After the Vite application has been initialized:

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Vite will print the local development URL.

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Development Scripts

Expected V1 scripts after project initialization:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

The exact scripts in `package.json` are the source of truth once implementation begins.

---

## Testing

Testing is defined in detail in `docs/TECHNICAL_PLAN.md`.

V1 requires:

- scoring unit tests
- typing-engine unit tests
- ranking tests
- event lifecycle tests
- passage validation
- persistence tests
- high-value component tests
- actual iPad layout testing
- actual giant-keyboard testing
- airplane-mode end-to-end testing

### Core Acceptance Checks

V1 must verify that:

- 30-second mode ends correctly
- 60-second mode ends correctly
- Ready-screen start key is not scored
- first valid typing key starts the timer
- incorrect keys do not inflate WPM
- Backspace follows the documented accuracy rules
- partial words receive correct-character credit
- held-key browser repeat events are ignored
- low-accuracy button mashing cannot enter the leaderboard
- Top 5 sorts correctly
- Top 10 nickname behavior is correct
- fresh events preserve old data
- continuing an event retains scores
- saved scores survive reload
- Next Player resets only contestant state
- all contestants receive the same passage sequence
- passages fit on one line
- the full app works in airplane mode

### Run Tests

During implementation:

```bash
npm test
```

One-time test run:

```bash
npm run test:run
```

---

## iPad PWA Setup

Before relying on the app at an event:

1. connect the target iPad to the internet
2. open the deployed HTTPS app in Safari
3. allow the app and required assets to finish loading
4. add the app to the Home Screen
5. launch the installed app once while online
6. confirm fonts, passages, icons, and visual assets load
7. enable airplane mode
8. close and relaunch the installed app
9. complete a full contestant flow
10. close and reopen the app while still offline
11. confirm the event and saved scores remain available

The MVP is not considered event-ready until this succeeds on the actual target iPad.

---

## Deployment

V1 is deployed as a static HTTPS application.

Possible hosts:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages if configured correctly for the Vite/PWA build

Deployment requirements:

- HTTPS
- service-worker support
- stable application URL
- no required application server
- no required runtime API

A newly deployed service worker should not force a reload during an active contestant session.

Updates should be applied on a future launch or while the app is safely idle.

---

## Privacy and Data

V1 stores competition data locally on the event iPad.

Collected contestant data is limited to:

- nickname, when Top 10 eligible
- WPM
- accuracy
- timestamp

V1 does not need to collect:

- email
- phone number
- account credentials
- location
- device identity

Nicknames should always be rendered as plain text.

Historical event data is retained locally even when the operator starts a fresh leaderboard.

---

## Documentation

Project documentation lives in `docs/`.

### Product Requirements

[`docs/PRD.md`](docs/PRD.md)

Defines:

- product behavior
- V1 scope
- user flow
- scoring rules
- passage rules
- offline requirements
- acceptance criteria

### Technical Plan

[`docs/TECHNICAL_PLAN.md`](docs/TECHNICAL_PLAN.md)

Defines:

- technical architecture
- data model
- PWA/offline implementation
- component/module boundaries
- scoring implementation
- persistence
- testing strategy
- implementation order

### Design System

[`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)

Defines:

- colors
- typography
- visual hierarchy
- interaction styling
- decorative motifs
- layout direction

### Wireframes

[`docs/WIREFRAMES.md`](docs/WIREFRAMES.md)

Documents the V1 screen flow and wireframe references.

---

## Roadmap

### V1

- [ ] initialize React + TypeScript + Vite
- [ ] add design tokens and local fonts
- [ ] implement application state flow
- [ ] add local passage set
- [ ] build typing engine
- [ ] implement timer
- [ ] implement WPM and accuracy
- [ ] implement leaderboard eligibility
- [ ] implement IndexedDB persistence
- [ ] implement event setup
- [ ] implement Ready screen
- [ ] implement Results / nickname flow
- [ ] implement Top 5 leaderboard
- [ ] implement Next Player and auto-reset
- [ ] configure PWA / service worker
- [ ] add automated tests
- [ ] apply final wireframe styling
- [ ] test on target iPad
- [ ] test with giant keyboard
- [ ] pass full airplane-mode flow

### Post-V1

Potential future architecture:

```text
React + TypeScript PWA
        │
   IndexedDB
        │
        └── sync when online
                │
                ▼
             Flask API
                │
           SQLAlchemy
                │
           PostgreSQL
```

Potential future features:

- cloud backup
- multiple booth devices
- event-history UI
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
- automated offline/online synchronization
- Docker
- CI/CD
- backend automated tests
- monitoring

The local-first booth workflow should remain functional even after a backend is added.

---

## Development Workflow

Primary branch:

```text
main
```

Use small, meaningful commits.

Examples:

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

Typical workflow:

```bash
git pull
git add .
git commit -m "meaningful message"
git push
```

Avoid force-pushing shared history unless necessary.

### Git-Ignored Private Files

Repository-specific private assets may be excluded through `.gitignore`.

The `.gitignore` file itself should remain committed so repository rules are shared consistently.

---

## License

No license has been selected yet.

Until a license is added, the repository should not imply that the source code or project assets are available for unrestricted reuse.

If the project is made public, add an explicit license only after deciding how the code and any third-party/business branding or assets may be used.

---

## Primary Engineering Principle

> The typing test must continue working reliably at a real event even when the network does not.

Architecture and implementation decisions should favor:

```text
local-first
deterministic
simple
testable
recoverable
```

over unnecessary feature or infrastructure complexity.
