# Typing Test — V1 Product Requirements Document

## 1. Overview

The typing test is an offline-first, landscape-iPad typing competition designed for repeated use at event booths.

It replaces the current generic browser typing test and manual whiteboard score tracking with a dedicated experience that automatically calculates scores, manages an event leaderboard, and resets cleanly for each new contestant.

Visual design must follow the design system documented in:

`docs/DESIGN_SYSTEM.md`

---

## 2. Problem

Event booth typing competitions currently rely on a generic browser typing test that does not manage contestants or scores.

The booth operator must manually track high scores, refresh or reset the page between contestants, and may have to rely on unreliable event Wi-Fi.

The typing test should replace that workflow with an offline-capable competition experience designed specifically for repeated booth use.

---

## 3. Users

### Booth Visitor

A contestant using the typing test at an event.

They should be able to:

- See the current high score
- Understand that typing above 50 WPM earns a Plinko drop
- Start the experience using the giant keyboard
- Type a natural sentence
- See their WPM and accuracy
- Enter a nickname if they qualify for the Top 10
- View the Top 5 leaderboard after the test

### Booth Operator

The person running the booth.

They should be able to:

- Select a 30- or 60-second test
- Start a new event with a fresh leaderboard
- Resume the most recently active event and its scores
- Run contestants continuously without refreshing the browser
- Use the typing test without Wi-Fi

---

## 4. Current Workflow / Pain Points

- Uses a generic browser-based typing test
- High score is manually written on a whiteboard
- Page must be refreshed or manually reset between contestants
- No integrated leaderboard
- No persistent event scores
- Event Wi-Fi may be unavailable or unreliable
- Existing test is not optimized for repeated booth use
- Existing test does not match the desired experience or branding

---

## 5. Goals

- Make the typing competition fast and easy to operate
- Automatically calculate and save contestant scores
- Maintain a persistent event leaderboard
- Display the Top 5 scores after each test
- Allow Top 10 contestants to enter a nickname
- Reset automatically for the next contestant
- Allow manual Next Player progression when needed
- Work fully offline during events
- Provide a readable landscape-iPad experience
- Prevent button mashing from producing artificially high scores
- Keep the contestant flow simple enough to use with a giant physical keyboard

---

## 6. V1 Scope

### In Scope

- Landscape iPad interface
- Operator-selectable 30- or 60-second tests
- Fresh or continued event leaderboard
- Ready / attract screen with:
  - "GIANT keyboard typing contest!"
  - "Type above 50 WPM for a Plinko drop."
  - Current high score
  - "Press any key to start"
- Typing screen with:
  - One centered sentence at a time
  - Entire sentence visible on one line
  - Timer begins on first valid typing keystroke
  - Current word visually highlighted
  - Visible caret within the current word
  - Live WPM
  - Live accuracy
  - Timer at the bottom
- Correct-WPM scoring
- Accuracy calculation
- Anti-button-mashing eligibility protection
- Top 10 nickname eligibility
- Top 5 visible leaderboard
- Results and nickname entry on the same screen
- Next Player reset
- Automatic reset
- Offline-capable PWA
- Persistent local event and score storage

### Out of Scope

- User accounts
- Authentication
- Cloud synchronization
- Backend API
- PostgreSQL
- Storefront or e-commerce
- Multiple devices sharing one leaderboard
- Historical-event management UI
- Detailed analytics
- Advanced anti-cheat
- AI-generated passages
- Online multiplayer

---

## 7. User Flow

### Event Setup

1. Operator opens the typing test.
2. Operator selects:
   - 30 seconds
   - 60 seconds
3. Operator selects:
   - Start fresh leaderboard
   - Continue most recently active event
4. Operator starts the event.

### Contestant Flow

1. Ready / attract screen displays:
   - branding
   - "GIANT keyboard typing contest!"
   - "Type above 50 WPM for a Plinko drop."
   - Current high score
   - "Press any key to start"
2. Contestant presses any key.
3. Typing screen appears with the full sentence visible.
4. Timer has not started yet.
5. Contestant presses the first valid typing key.
6. Timer begins.
7. Contestant types until time expires.
8. Results screen displays:
   - WPM
   - Accuracy
   - Ranking status
9. If contestant qualifies for the current Top 10:
   - Nickname input appears on the same results screen
   - Contestant may enter any nickname
   - Score is saved
10. Top 5 leaderboard appears.
11. App returns to the Ready screen through:
   - Next Player, or
   - Automatic reset after a short delay
12. Next contestant begins without refreshing the page.

---

## 8. User Stories

- As an operator, I want to choose a 30- or 60-second test before an event.
- As an operator, I want to start with a fresh leaderboard or continue the most recently active event.
- As a visitor, I want to immediately understand that this is a giant keyboard typing contest.
- As a visitor, I want to know that typing above 50 WPM earns a Plinko drop.
- As a visitor, I want to see the current high score before starting.
- As a visitor, I want to press any keyboard key to enter the typing screen.
- As a visitor, I want the full sentence visible before my timer begins.
- As a visitor, I want my first valid typing keystroke to start the timer.
- As a visitor, I want to type natural sentences made primarily from common words.
- As a visitor, I want the current word and caret to be easy to identify.
- As a visitor, I want to see my WPM and accuracy after the test.
- As a visitor who places in the Top 10, I want to enter a nickname.
- As a visitor, I want to see the Top 5 leaderboard after my test.
- As an operator, I want the next contestant to begin without refreshing the browser.
- As an operator, I want scores and settings to remain available after restarting the app.
- As an operator, I want the typing test to work without internet access.

---

## 9. V1 Features

### Event Setup

- 30-second test option
- 60-second test option
- Start fresh leaderboard
- Continue most recently active event
- Persist selected event settings

### Ready / Attract Screen

Display:

- branding
- "GIANT keyboard typing contest!"
- "Type above 50 WPM for a Plinko drop."
- Current high score
- Current high-score nickname
- Selected test duration
- "Press any key to start"

Do not display:

- Top 5 leaderboard
- Start button
- Operator settings

Pressing any key should transition to the typing screen.

The initial key used to leave the Ready screen must not count as typing input.

### Typing Test

- Landscape iPad layout
- Full sentence visible before timing begins
- One sentence displayed at a time
- Sentence centered horizontally
- Sentence must fit entirely within a safe-width area
- Equal visual space should remain between:
  - sentence start and left screen edge
  - sentence end and right screen edge
- Timer begins on first valid typing keystroke
- Natural sentences using primarily common words
- Current word highlighted
- Caret visibly positioned at the current character
- Completed text visually distinct from upcoming text
- Incorrect characters clearly indicated
- Live countdown timer
- Live WPM
- Live accuracy
- Timer positioned at the bottom center
- Incorrect input does not inflate WPM
- Test automatically ends when selected duration expires

### Passage Rules

Passages should:

- Use natural grammatical sentences
- Use primarily common words
- Fit on one line at the target iPad font size
- Be short enough to remain fully visible
- Use similar difficulty across contestants
- Avoid unusually difficult punctuation or vocabulary
- Be bundled locally with the application

Initial target:

- Approximately 35–50 characters per displayed sentence
- Exact limits should be validated on the actual iPad

When a sentence is completed, the next full sentence replaces it.

### Results

Display:

- WPM prominently
- Accuracy
- New high-score status when applicable
- Top-10 qualification status

If the contestant qualifies for the Top 10:

- Show nickname field on the same screen
- Allow any nickname
- Allow score submission

### Leaderboard

- Store all valid scores for the active event
- Top 10 determines nickname eligibility
- Only Top 5 displayed on the visible leaderboard
- Rankings based primarily on WPM
- Leaderboard updates automatically after score submission
- Current contestant ranking may be highlighted
- Previous event data remains stored

### Next Player

Support:

- Next Player control
- Automatic reset after leaderboard display

Reset contestant-specific state:

- Current sentence
- Typed input
- Current WPM
- Current accuracy
- Timer
- Results
- Nickname input

Preserve:

- Active event
- Test duration
- Scores
- Current high score
- Leaderboard

Return to the Ready screen without reloading the browser.

---

## Scoring Rules

### WPM

WPM is calculated using correctly typed characters:

`WPM = (correctCharacters / 5) / elapsedMinutes`

- Five correct characters count as one standard word.
- Correct letters, spaces, and punctuation count toward WPM.
- Incorrect characters do not increase WPM.
- If time expires in the middle of a word, all correct characters typed before the timer ends still count.

### Accuracy

Accuracy is calculated from typing attempts:

`Accuracy = correctAttempts / (correctAttempts + incorrectAttempts) × 100`

- Correct typing attempts increase the correct-attempt count.
- Incorrect typing attempts increase the incorrect-attempt count.
- Backspace does not count as a typing attempt.
- Correcting a mistake does not erase the original incorrect attempt from the accuracy calculation.

### Leaderboard Eligibility

A completed score must meet a minimum accuracy requirement to qualify for the leaderboard.

Initial V1 threshold:

`80% accuracy`

This threshold is provisional and should be validated on the physical giant keyboard before the event.

A contestant may still see their final WPM and accuracy if they fall below the threshold, but their score will not qualify for leaderboard ranking.

### Ranking and Ties

Leaderboard scores are ranked using:

1. Higher WPM
2. Higher accuracy
3. Earlier submitted score

Accuracy is used as a tie-breaker and does not otherwise determine leaderboard position.

### Incorrect Characters

Incorrect characters:

- are visually marked as errors
- do not contribute to WPM
- count against accuracy
- do not prevent the contestant from continuing to type

Contestants are not required to correct errors before advancing.

### Backspace

Backspace is allowed.

When a contestant presses Backspace:

- the caret moves back one typed character
- the previous typed character is removed from the current text
- Backspace itself does not affect WPM or accuracy
- the contestant may type the correct character and receive correct-character credit for that position
- any original incorrect typing attempt still counts against accuracy

### Partial Words

Contestants receive credit for correct characters even when the timer expires before the current word is completed.

Example:

If the expected word is `keyboard` and the contestant correctly types `keybo` before time expires, those five correct characters still count toward WPM.

### Character-Level Scoring

Scoring is based on individual characters rather than requiring an entire word to be correct.

Example:

Expected:

`house`

Typed:

`housr`

Scoring:

- `h` — correct
- `o` — correct
- `u` — correct
- `s` — correct
- `r` — incorrect

The contestant receives credit for four correct characters rather than losing credit for the entire word.

---

## 11. Event Behavior

### Fresh Leaderboard

Starting fresh creates a new event with no active scores.

Previous event data should remain stored rather than being permanently deleted.

### Continue Previous Leaderboard

Continue resumes the most recently active event with:

- Existing scores
- Existing leaderboard
- Existing event data

---

## 12. Non-Goals for V1

- User accounts
- Authentication
- Online multiplayer
- Cloud leaderboard synchronization
- Backend API
- PostgreSQL database
- Storefront or e-commerce
- Detailed typing analytics
- Manual deletion of individual scores
- Manual Clear Leaderboard button
- Multiple typing difficulty modes
- Contestant-selectable test duration
- AI-generated passages
- Complex anti-cheat detection
- Historical-event management UI
- Multiple-device synchronization

---

## 13. Acceptance Criteria

V1 is complete when:

- Operator can choose 30 or 60 seconds
- Operator can start a fresh event
- Operator can resume the most recently active event
- Ready screen displays the current high score
- Ready screen displays:
  - "GIANT keyboard typing contest!"
  - "Type above 50 WPM for a Plinko drop."
  - "Press any key to start"
- Ready screen does not display the leaderboard
- Pressing any key opens the typing screen
- The initial Ready-screen keypress does not count toward the test
- Full typing sentence is visible before timing begins
- Sentence is centered horizontally
- Sentence remains completely on-screen
- Left and right sentence margins are visually balanced
- Only one sentence is shown at a time
- Current word is visibly highlighted
- Caret is visible at the current character position
- Timer starts on the first valid typing keystroke
- Timer ends at the selected duration
- Timer is displayed at the bottom
- WPM is calculated correctly
- Accuracy is calculated correctly
- Incorrect typing cannot artificially produce a competitive WPM
- Valid scores are saved locally
- Top-10 contestants can enter any nickname
- Nickname entry appears on the results screen
- Top 5 scores display in correct ranking order
- New high score updates automatically
- Next Player resets contestant state without refreshing the browser
- Automatic reset returns the app to the Ready screen
- Event settings survive an app/browser restart
- Scores survive an app/browser restart
- Previous event data is not destroyed when starting a fresh event
- Core functionality works with the iPad in airplane mode
- Visual implementation follows `docs/DESIGN_SYSTEM.md`

---

## 14. Offline Requirement

The typing test must remain fully functional without Wi-Fi after it has been loaded and installed on the iPad beforehand.

The PWA must cache all assets required for gameplay, including:

- HTML
- CSS
- JavaScript
- Fonts
- Icons and required interface images
- Typing passages

Local device storage must contain:

- Event information
- Active event
- Test duration
- Contestant scores
- Nicknames
- Leaderboard data

Internet access must not be required to:

- Start an event
- Resume an event
- Enter the Ready screen
- Start a typing test
- Calculate a score
- Save a score
- Update the leaderboard
- Reset for the next contestant

The completed V1 should be tested in airplane mode on the target iPad before event use.
