```md
# Typing Test Design System

## 1. Brand Direction

The typing test should visually align with **Tiny Keyboard Shop**.

The brand aesthetic is:

- Playful
- Handmade
- Pastel
- Rounded
- Friendly
- Cute without feeling childish
- Slightly retro
- Keyboard-focused
- Retail/event-oriented
- Light and approachable rather than dark or gamer-styled

The interface should feel like an interactive extension of Tiny Keyboard Shop's event flyers and physical booth.

---

## 2. Design Principles

### Prioritize readability

The typing test will be used on a landscape iPad viewed from approximately two feet away.

Important information should be:

- Large
- High contrast
- Easy to scan
- Uncluttered
- Readable without leaning close to the screen

### Keep the typing screen minimal

Decorative branding should be strongest on:

- Ready / Attract
- Results
- Leaderboard
- Event Setup

During active typing, visual decoration should be reduced so it does not compete with the passage.

### Keep the interface playful

Use:

- Rounded shapes
- Soft pastel colors
- Organic blobs
- Stars
- Swirls
- Dots
- Small hand-drawn-style accents

Avoid excessive decoration around important controls or typing content.

### Make competition obvious

The user should quickly understand:

- This is a giant keyboard typing contest
- 50 WPM qualifies for a Plinko drop
- There is a high score to beat
- There is a leaderboard

---

# 3. Color Palette

These colors are approximate visual matches based on Tiny Keyboard Shop's existing graphics.

## Core Colors

### Teal

Primary brand color.

```css
--tiny-teal: #9DDEDA;
```

Use for:

- Primary interactive states
- Selected controls
- Highlights
- Typing caret
- Decorative accents
- Status indicators

### Strong Teal

More saturated teal for buttons or stronger emphasis.

```css
--tiny-teal-strong: #55C8C5;
```

Use for:

- Primary buttons
- Active states
- Important accents

---

### Lavender

Primary secondary brand color.

```css
--tiny-lavender: #A99AD7;
```

Use for:

- Major headings
- Secondary highlights
- Leaderboard emphasis
- Decorative elements

### Light Lavender

```css
--tiny-lavender-light: #D7CFF1;
```

Use for:

- Selected cards
- Background fills
- Secondary surfaces

---

### Pink

```css
--tiny-pink: #F5C2D5;
```

Use for:

- Celebration states
- Decorative accents
- New high-score moments
- Secondary buttons or labels

---

### Cream

Primary background color.

```css
--tiny-cream: #FFF3DE;
```

Use for:

- Main app background
- Large surfaces
- Warm visual contrast against teal and lavender

---

### Soft White

```css
--tiny-white: #FFFDFC;
```

Use for:

- Cards
- Input surfaces
- High-contrast content areas

---

### Charcoal

Primary text color.

```css
--tiny-charcoal: #403738;
```

Use for:

- Headings
- Body text
- Scores
- Important labels

Avoid pure black unless necessary for accessibility.

---

### Muted Gray

```css
--tiny-muted: #8B8582;
```

Use for:

- Secondary text
- Helper text
- Labels
- Inactive states

---

## Optional Accent Colors

These appear in some Tiny Keyboard Shop graphics but should not dominate the core application.

### Coral

```css
--tiny-coral: #E97868;
```

Possible uses:

- Special event accents
- Warning states
- Small decorative details

### Lime

```css
--tiny-lime: #C8D96B;
```

Possible uses:

- Seasonal graphics
- Special event themes

Do not use lime as a default core UI color.

---

# 4. Color Usage Hierarchy

Recommended order of importance:

1. Teal
2. Lavender
3. Pink
4. Cream
5. Sky / light blue accents
6. Coral or lime only when appropriate

The app should not use all colors equally.

A typical screen should use:

- Cream background
- Charcoal text
- Teal primary action
- Lavender or pink secondary accent

---

# 5. Typography

The app should use three typography roles.

## Display Font

### Fredoka

Recommended weights:

- 600
- 700

Use for:

- Main headings
- Scores
- Buttons
- Leaderboard headings
- High-score messages
- Large event text

Examples:

```text
GIANT keyboard typing contest!
NEW HIGH SCORE!
92 WPM
TOP 5
START
```

Fredoka reflects the rounded, chunky, playful type used throughout Tiny Keyboard Shop's event graphics.

---

## UI Font

### Nunito

Recommended weights:

- 400
- 600
- 700

Use for:

- Body copy
- Instructions
- Settings
- Form labels
- Nicknames
- Helper text
- Leaderboard rows

Nunito should handle most functional interface text.

---

## Typing Passage Font

### Atkinson Hyperlegible

Recommended weights:

- 400
- 700

Use only for:

- Typing passages
- Character-level typing feedback

Reason:

The typing passage prioritizes readability and character distinction over decorative branding.

It should clearly distinguish characters such as:

```text
I
l
1

O
0
```

---

# 6. Type Scale

Initial landscape iPad targets:

## Display

```text
Main headline:        44–56 px
Large score:          72–100 px
Section heading:      28–36 px
```

## UI

```text
Primary button:       22–28 px
Leaderboard names:    20–24 px
Body text:            18–22 px
Helper text:          14–18 px
```

## Typing Test

```text
Typing passage:       30–36 px
Timer:                30–40 px
Live WPM:             24–32 px
High-score target:    20–28 px
```

Exact sizes should be validated on the actual iPad.

---

# 7. Shape Language

Tiny Keyboard Shop graphics frequently use soft, organic shapes.

Use:

- Rounded cards
- Rounded buttons
- Pill labels
- Organic blobs
- Soft circles
- Wavy forms
- Rounded speech-bubble shapes

Recommended border radii:

```text
Small controls:      12–16 px
Buttons:             18–24 px
Cards:               24–32 px
Large panels:        28–36 px
```

Avoid sharp rectangular UI where possible.

---

# 8. Decorative Motifs

Approved visual motifs:

- Stars
- Sparkles
- Hearts
- Swirls
- Dots
- Confetti
- Hand-drawn lines
- Organic pastel blobs
- Small keycap-inspired shapes

Decorative elements should generally stay near:

- Corners
- Edges
- Empty background areas

They should not overlap:

- Typing passages
- Timers
- Score values
- Form controls
- Leaderboard data

---

# 9. Buttons

## Primary Button

Use strong teal.

Example:

```text
START
START EVENT
SAVE SCORE
NEXT PLAYER
```

Style:

- Strong teal background
- Charcoal or high-contrast text
- Rounded corners
- Large touch target
- Fredoka Bold

Minimum touch target:

```text
44 × 44 px
```

Prefer approximately:

```text
56+ px height
```

for major booth actions.

---

## Secondary Button

Use:

- Soft white or lavender-light background
- Charcoal text
- Teal or lavender border

Examples:

```text
Continue Event
Back
```

---

# 10. Cards and Surfaces

Cards should generally use:

```css
background: #FFFDFC;
border: 1–2px solid soft neutral or brand color;
border-radius: 24–32px;
```

Avoid heavy drop shadows.

If depth is needed, use:

- subtle borders
- slight tonal contrast
- layered pastel backgrounds

rather than strong shadows.

---

# 11. Ready / Attract Screen Style

This screen can be highly branded and playful.

Primary content hierarchy:

```text
Tiny Keyboard Shop

GIANT keyboard typing contest!

Type above 50 WPM for a Plinko drop.

Current High Score
92 WPM

START

Top 5
```

Visual emphasis:

1. Contest name
2. 50 WPM prize threshold
3. Current high score
4. Start button
5. Top 5 leaderboard

Use:

- Fredoka
- Teal
- Lavender
- Pink accents
- Organic edge decorations

---

# 12. Typing Screen Style

This should be the most visually restrained screen.

Display:

- High score to beat
- Timer
- Typing passage
- Live WPM

Avoid:

- Large decorative illustrations
- Full leaderboard
- Multiple buttons
- Strong background patterns
- Distracting animation

Recommended structure:

```text
HIGH SCORE TO BEAT: 92 WPM

              0:24

The little dog ran across the yard and
came back when someone called.

             73 WPM
```

---

# 13. Typing Feedback Colors

### Upcoming text

Use muted gray.

```css
color: #8B8582;
```

### Correct text

Use charcoal.

```css
color: #403738;
```

### Active caret

Use strong teal.

```css
color: #55C8C5;
```

### Incorrect characters

Use coral or a stronger accessible error color.

Suggested starting point:

```css
color: #D95D5D;
```

Errors must remain clearly distinguishable for accessibility.

---

# 14. Results Screen Style

Results should feel rewarding and celebratory.

Primary hierarchy:

```text
92 WPM

96% ACCURACY

NEW HIGH SCORE!
```

or:

```text
84 WPM

97% ACCURACY

Nice typing!
```

Use stronger decorative elements here:

- Stars
- Confetti
- Pink/lavender accents
- Small animated keycaps
- Sparkles

Do not let animation prevent nickname entry.

---

# 15. Nickname Entry

Nickname entry appears on the results screen for contestants who qualify for the Top 10.

Style:

- Large input
- Nunito
- High contrast
- Large touch target
- Clear Save Score button

Example:

```text
You made the Top 10!

Nickname
[________________]

[ SAVE SCORE ]
```

---

# 16. Leaderboard Style

Visible leaderboard displays the Top 5.

Recommended structure:

```text
TOP 5

1   Alex          92 WPM
2   Mia           86 WPM
3   Sam           81 WPM
4   KeycapCat     78 WPM
5   ClickClack    74 WPM
```

The #1 score may use:

- Lavender highlight
- Teal outline
- Small star or trophy marker

Avoid using five different colors for five ranks.

The leaderboard should remain easy to scan.

---

# 17. Event Setup Style

Operator controls should remain simpler than contestant-facing screens.

Primary elements:

- Test length
  - 30 seconds
  - 60 seconds
- Leaderboard mode
  - Start fresh
  - Continue previous event
- Start Event

Use brand styling, but prioritize clarity over decoration.

Operator settings should never appear during contestant gameplay.

---

# 18. Motion and Animation

Animation should be limited and purposeful.

Good uses:

- New high-score celebration
- Subtle button feedback
- Small sparkle motion
- Score reveal
- Leaderboard rank transition

Avoid:

- Continuous background animation
- Moving text during typing
- Excessive bounce effects
- Anything that makes the passage harder to read

Respect:

```css
prefers-reduced-motion
```

---

# 19. Accessibility

The app should prioritize usability in a noisy event environment.

Requirements:

- High contrast text
- Large typography
- Large controls
- Visible focus states
- No information communicated only by color
- Clear error feedback
- Readable from approximately two feet away
- Landscape iPad first

Typing feedback should remain understandable without relying solely on:

- red
- green
- animation

---

# 20. Layout Target

Primary device:

```text
Landscape iPad
4:3 aspect ratio
```

Design should prioritize:

- horizontal space
- centered primary interaction
- large text
- minimal scrolling

The main contestant workflow should ideally fit within a single screen per state.

---

# 21. Brand Voice

Copy should feel:

- Friendly
- Casual
- Playful
- Short
- Slightly quirky
- Easy to understand immediately

Examples:

```text
GIANT keyboard typing contest!

Type above 50 WPM for a Plinko drop.

Ready to type?

Nice typing!

NEW HIGH SCORE!

You made the Top 10!

Next player
```

Avoid:

- Formal corporate language
- Technical jargon
- Long instructions
- Overly childish copy

---

# 22. Visual Hierarchy

Each screen should have one obvious primary purpose.

## Event Setup

```text
Choose settings → Start Event
```

## Ready

```text
Understand challenge → Start
```

## Typing

```text
Read → Type
```

## Results

```text
Understand score → Enter nickname if eligible
```

## Leaderboard

```text
See rankings → Next Player
```

---

# 23. Things to Avoid

Do not use:

- Dark gamer interfaces
- RGB/neon styling
- Black backgrounds
- Sharp/angular typography
- Corporate dashboard aesthetics
- Heavy gradients
- Excessive shadows
- Tiny UI text
- Dense menus
- Overly complicated settings
- Decorative elements inside the typing passage
- Multiple competing primary buttons

---

# 24. CSS Design Tokens

Recommended starting variables:

```css
:root {
  --tiny-teal: #9DDEDA;
  --tiny-teal-strong: #55C8C5;

  --tiny-lavender: #A99AD7;
  --tiny-lavender-light: #D7CFF1;

  --tiny-pink: #F5C2D5;

  --tiny-cream: #FFF3DE;
  --tiny-white: #FFFDFC;

  --tiny-charcoal: #403738;
  --tiny-muted: #8B8582;

  --tiny-coral: #E97868;
  --tiny-lime: #C8D96B;

  --tiny-error: #D95D5D;
}
```

---

# 25. Typography Tokens

```css
:root {
  --font-display: "Fredoka", sans-serif;
  --font-ui: "Nunito", sans-serif;
  --font-typing: "Atkinson Hyperlegible", sans-serif;
}
```

---

# 26. Brand Reference Summary

The design direction is based on recurring visual patterns in Tiny Keyboard Shop materials:

- Aqua / teal
- Lavender
- Pink
- Cream backgrounds
- Rounded chunky typography
- Friendly sans-serif body text
- Organic pastel shapes
- Swirls
- Dots
- Stars
- Handmade illustrations
- Playful event-focused layouts

The typing test should feel recognizably connected to Tiny Keyboard Shop while remaining more functional and restrained than a promotional poster.
