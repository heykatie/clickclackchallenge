# Typing Test Design System

This file owns the visual system and required contestant-facing strings: palette, type scale, CSS tokens, motifs, and component styling.

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

This document defines the V1 visual system for an offline typing contest played on a giant physical keyboard and displayed on a landscape iPad. Screen layout and the PNG inventory live in `docs/wireframes.md`. Product behavior lives in `docs/prd.md`. Example names and scores are illustrative, not default event data. Details explicitly marked **Proposed** remain design suggestions.

## 1. Brand direction

The interface should feel like a playful event flyer translated into a readable, functional experience.

Core qualities:

- Light, airy, and pastel.
- Friendly, rounded, and slightly handmade.
- Playful without feeling childish.
- Keyboard-focused and suitable for a busy event booth.
- Flat and uncluttered, with one clear purpose per screen.

Ready, Results, and Leaderboard can carry the strongest decorative personality. Event Setup should emphasize clear choices. Typing should be the quietest screen.

### Logo and visible naming

- A small logo-only keycap badge is allowed.
- Retain the established brand-inspired visual style without adding a replacement wordmark.
- Use a clean logo asset with no embedded shop-name text. Do not reproduce the missing-glyph boxes in `01-setup.png`, `02-ready.png`, and `04-results.png` on the keycap badge, Start Event, Press Any Key, Top 10, or Save Score. The real strings are in Brand voice and in section 7.
- The internal `--tiny-*` token prefix may remain; it is not visible interface branding.
- On Typing, omit the badge or keep it small enough that it does not compete with the passage.

## 2. Device and layout

| Requirement | Direction |
| --- | --- |
| Primary device | Landscape iPad |
| Design aspect ratio | 4:3 |
| Viewing distance | Approximately two feet |
| Screen composition | One main purpose and clear central focal point |
| Scrolling | Keep each contestant screen within one viewport |
| Content placement | Generous safe margins; no clipped text, rows, or actions |
| Export sizing | PNG pixels are not CSS layout dimensions |
| Orientation | Landscape full screen only |

The five screens are landscape 4:3 only. Portrait and Split View must not show them. Show “Turn sideways and use the full screen.” The manifest lock and that gate are in `docs/technical_plan.md`.

Respect the actual device's safe areas and browser/app viewport. Validate the final layout on the target iPad, including name entry with the physical keyboard connected.

Do not rely on shrinking important text to make a crowded screen fit. Reduce content and decoration first.

## 3. Color palette

These are the latest documented design values. They are approximate visual matches to the brand references, not verified official brand colors. Use the tokens below for implementation rather than sampling slightly different colors from generated PNGs.

| Color | Token | Hex | Primary use |
| --- | --- | --- | --- |
| Blush | `--tiny-blush` | `#FBEDEF` | Main background |
| Soft white | `--tiny-white` | `#FFFDFC` | Panels, inputs, ordinary leaderboard rows |
| Mint | `--tiny-mint` | `#9DDED8` | Accent surfaces, rank badges, decorative forms |
| Strong mint | `--tiny-mint-strong` | `#6CCFC7` | Primary controls, caret, focus accents |
| Deep mint | `--tiny-mint-deep` | `#24756E` | Ready “PRESS ANY KEY TO START” |
| Lavender | `--tiny-lavender` | `#AA9AD4` | Borders, current-word emphasis, selected-state accents |
| Light lavender | `--tiny-lavender-light` | `#D9D0ED` | First-place row, soft highlights, prompt panels |
| Deep lavender | `--tiny-lavender-deep` | `#6B5A9A` | Ready high-score name |
| Soft pink | `--tiny-pink` | `#F4C1D4` | Decoration and celebration |
| Peach | `--tiny-peach` | `#F5CFC0` | Warm decorative accents |
| Charcoal | `--tiny-charcoal` | `#403738` | Essential text, scores, button labels |
| Muted gray | `--tiny-muted` | `#8C8788` | Secondary text outside the passage, and only where contrast is sufficient |
| Error red | `--tiny-error` | `#D95D5D` | Incorrect characters and validation feedback |

### Color hierarchy

1. Blush and soft white establish the main surfaces.
2. Mint provides the main interactive accent.
3. Lavender provides secondary emphasis and first-place styling.
4. Pink and peach support decoration and celebration.
5. Charcoal keeps essential content readable.

Use fewer colors during Typing. Do not assign a different bright color to every leaderboard rank. Cream, sky blue, coral, and lime are not part of the current core palette.

### Contrast and functional use

- Use charcoal for important reading, headlines, scores, and labels on pastel controls.
- Do not copy lavender display type from the wireframe PNGs. Where that type is too faint, keep lavender in a border or tinted surface and use charcoal for the text.
- Do not assume a pastel foreground is readable simply because it belongs to the palette.
- Check error text and focus indicators against their actual backgrounds. Do not use muted gray for passage text. `#8C8788` is about 3.11:1, which meets large-text AA at 32–36 px and is still weak at the two-foot distance in section 2.
- Where an accent foreground is too faint, keep the accent in a border or tinted background and use darker text.
- Pair errors with an underline or another non-color indicator. Pair selection with a radio/check indicator, and current-player emphasis with a “YOU” label.

## 4. Typography

Use three primary font families. Required font files must be packaged or cached locally so the app does not depend on a font CDN during events.

| Role | Family | Weights | Use |
| --- | --- | --- | --- |
| Display | Fredoka | 600, 700 | Headlines, large scores, primary actions, leaderboard headings |
| Interface | Nunito | 400, 600, 700 | Instructions, labels, settings, names, helper copy |
| Typing passage | Atkinson Hyperlegible | 400, 700 | Sentences and character-level feedback |

The passage prioritizes clear character recognition, including `I`, `l`, `1`, `O`, and `0`. Do not substitute a decorative display face for passage text. Do not add a fourth primary handwritten font in V1.

### Initial type scale

These are starting CSS layout sizes. Validate readability and fit on the actual iPad.

| Element | Size |
| --- | --- |
| Main headline | 44–64 px |
| Large result WPM | 72–100 px |
| Section heading | 28–40 px |
| Primary action text | 24–34 px |
| Primary labels and leaderboard names | 20–24 px |
| Body copy | 18–22 px |
| Helper copy | 14–18 px; enlarge when needed for distance reading |
| Typing sentence | 32–36 px |
| Typing timer | 36–48 px |
| Live WPM and accuracy | 22–30 px |
| High-score target during Typing | 18–24 px |

Keep the passage font size consistent between sentences and contestants on the same screen size. A narrower window may use one smaller size for every line, as in the Typing section. Names, scores, required instructions, and the reset message must remain easy to read without leaning toward the screen.

## 5. Shapes, spacing, and surfaces

Use rounded rectangles, pill labels, circles, organic blobs, arcs, and loose hand-drawn forms.

| Element | Corner radius |
| --- | --- |
| Small controls | 12–16 px |
| Buttons | 18–26 px |
| Cards | 24–32 px |
| Large panels | 28–36 px |

Group related information with whitespace, soft surfaces, and fine borders. Avoid surrounding every small piece of content with its own card.

- Panels and inputs generally use soft white.
- Primary controls use strong mint with charcoal text.
- Use mint or light lavender for emphasis without obscuring text.
- Keep consistent row heights, column alignment, and padding within repeated components.
- Prefer flat fills. Avoid heavy shadows, strong gradients, glass effects, glossy effects, and floating dashboard-style cards.
- A very subtle shadow is acceptable only when it improves separation; it is not the main source of visual hierarchy.

## 6. Decorative motifs

Allowed motifs include organic pastel blobs, swirls, arcs, dots, stars, sparkles, hearts, confetti, and simple keycap-inspired forms.

Place them near corners, edges, or empty background areas. Never overlap passages, scores, timers, inputs, leaderboard rows, or actions. Decoration may be cropped by the screen edge; essential content may not.

During Typing, remove or greatly reduce decoration. On Results, use small celebration details that leave the score and name field clear.

## 7. Controls and reusable components

### Primary actions

Use Fredoka 600–700, a strong mint fill, charcoal text, and rounded corners.

Confirmed action labels:

- “START EVENT”
- “SAVE SCORE”
- “NEXT PLAYER”

Touch targets must be at least 44 × 44 px. Prefer a height of 56 px or more for major actions. Provide visible keyboard focus and clear pressed, disabled, and saving states where relevant. Prevent repeated submission from creating duplicate results.

### Ready prompt

“PRESS ANY KEY TO START” is a prominent keyboard invitation, not a Start button. It may sit on a light lavender or mint panel with large charcoal display text.

### Option groups

Use labeled, mutually exclusive choices for test duration and leaderboard mode. A selected option needs a visible radio/check indicator as well as its mint or lavender treatment. Do not make color the only selection cue.

### Name field

Use a large soft-white field with a persistent “Name” label, Nunito text, and a clear focus indicator. Keep the field and Save Score action visible while editing. Support the physical keyboard and reachable keyboard/touch controls.

### Score panel

Make WPM the strongest element, with the unit explicit. Keep name and supporting labels subordinate. Use illustration values only in design examples; never populate a new event with sample contestants.

### Leaderboard rows

Use aligned rank, name, and WPM columns. Names are left-aligned; WPM values are right-aligned. Keep row heights consistent and use subtle separators. Honor the name maximum in `docs/prd.md` so a name does not push the WPM value off-screen. When the visible name still does not fit, truncate it with an ellipsis. The stored name stays the full saved value. A score with no name shows a dash in the name column. Do not invent a guest name.

## 8. Typing feedback

| State | Visual treatment |
| --- | --- |
| Completed text | Charcoal, in the bold passage weight, on each correct character already typed, including characters before an error in the same word |
| Current word | Charcoal text on a light-lavender surface across the active word |
| Caret | Strong mint at the exact current character position inside the active word |
| Upcoming words | Charcoal, in the regular passage weight. Not muted gray. |
| Incorrect characters | Error red plus underline or another non-color cue |

The active word uses a light-lavender surface and charcoal text. Do not paint it in lavender type. `--tiny-lavender` (`#AA9AD4`) is about 2.23:1 on blush and 2.50:1 on white, so it fails WCAG AA even for large text. Lavender stays a surface, border, or selected-state accent. The Ready high-score name is the exception and uses `--tiny-lavender-deep` instead. Apply the same treatment across the passage set.

Incorrect-character feedback takes precedence over the ordinary word treatment. Correct characters already typed stay charcoal even when they sit inside the active word. The caret must remain clearly visible against both the passage background and the active-word treatment.

Example caret position:

```text
acr│oss
```

The caret is inside `across`, after `acr`. It is not a character the contestant should type. Character colors, highlighting, and caret placement must not change the centered line's width or cause it to jump.

## 9. Event Setup

**Purpose:** configure the event before contestant play.

Display three option groups and one main action:

| Group | Choices |
| --- | --- |
| Test length | 30 seconds; 60 seconds |
| Game mode | Standard; Famous Lines; Story. Story fixes Test length at 60 seconds. |
| Leaderboard | Start fresh; Continue previous event |
| Primary action | START EVENT |

Use a blush or soft-white background, rounded option controls, clear selection indicators, and sparse edge decoration. An optional logo-only badge may sit in a corner.

Fresh-event and continue-event behavior, including saved duration and game mode, is defined in `docs/prd.md`. When no event exists, Start Fresh, 30 seconds, and Famous Lines are selected, and Continue is unavailable. When an event exists, Continue is selected and the duration and game mode controls show the stored choices. Standard and Famous Lines keep both lengths selectable. Story keeps Test length visible and fixed at 60 seconds. Switching back to Standard or Famous Lines restores the length selected for those modes. Those choices apply to the next contestant. They keep the event and its leaderboard.

The operator can move through these choices with the arrow keys. Show “Arrow keys move. Enter selects.” The cursor starts on START EVENT and uses a charcoal outline, separate from the filled radio. Keyboard behavior is in `docs/prd.md` §9.

**No previous event:** disable Continue and show “No previous event yet.” The “Offline-ready” chip in the Setup PNG is decoration. Do not copy it. If an indicator is shown, it must reflect real cache and service-worker readiness, as in `docs/prd.md`.

## 10. Ready / Attract

**Purpose:** explain the challenge, show the current high score, and invite the next player to use the keyboard.

Ready strings are listed in Brand voice below. The score and name in layout examples are sample content. When there is no eligible score, show “Be the first high score!” When the high score has no name, show a dash instead of a name.

Visual order:

1. Contest headline.
2. Plinko message on a clear mint-accented surface.
3. Current high-score WPM and name. The WPM stays charcoal. A saved name uses deep lavender, `--tiny-lavender-deep` (`#6B5A9A`), about 5.83:1 on white. A missing name stays a charcoal dash.
4. Large keyboard invitation, in deep mint, `--tiny-mint-deep` (`#24756E`), about 4.80:1 on blush.

After 2 minutes of idle, replace this screen with the all-time roll from `docs/prd.md`. Keep a small “HIGH SCORES” label. Roll rank, name, and WPM upward in a loop. Names use deep lavender. Rank 1 keeps the light lavender row. A missing name stays a charcoal dash. Respect reduced motion by showing the list still.

A small logo-only badge and organic edge motifs are appropriate. Optional helper copy is in Brand voice.

Start behavior, including the opening keypress and the “above 50 WPM” comparison, is in `docs/prd.md`. Do not show the Top 5, a Start button, or operator controls on this screen. A long-press on the logo badge opens Event Setup from Ready, Typing, Results, and the Leaderboard, as specified in `docs/prd.md` §9.

## 11. Typing

**Purpose:** keep the reading target stable and readable while showing essential progress.

| Position | Content |
| --- | --- |
| Top | Small current high-score target |
| Center | One complete sentence on one line |
| Bottom left | Live WPM |
| Bottom center | Countdown timer |
| Bottom right | Live accuracy |

The countdown unit sits on the number, as in `24s`. `TIME` is only the label. Do not show a bare number.

### Sentence layout

- Center the entire sentence as one text block, horizontally and near the vertical center.
- Keep equal visual space between the sentence ends and the left/right screen edges.
- Start with approximately 10% horizontal safe margins. Validate the actual text width on the target iPad.
- Famous Lines uses short famous quotes, about 30–50 characters, so each one fits on one line.
- Measured fit matters more than character count: every sentence must fit completely at the selected font size.
- Do not wrap, crop, or horizontally scroll the passage. Do not shrink one line relative to another. On a window narrower than the landscape iPad, every line uses the same smaller size so the widest line still fits.
- When a sentence is complete, replace it with the next full sentence at the same focal point. Continue the existing timer.

### Screen states

| State | Behavior |
| --- | --- |
| Waiting | Full sentence visible; selected duration remaining; timer stopped |
| Running | First valid typing keystroke starts timing; live WPM and accuracy update |
| Time expired | Stop test input, finalize the result, and open Results |

Incorrect keystrokes must not increase WPM. Starting-key and correction rules are in `docs/prd.md`.

Use the feedback treatments in section 8. Keep the passage dominant. Do not show a leaderboard, large logo, dense instructions, decorative panels, or continuously animated elements.

## 12. Results + Name

**Purpose:** present the final result and collect a name from contestants through 20th place on the same screen. The Top 10 cheer stops at 10th.

Required hierarchy:

1. Headline.
2. Large final WPM.
3. Accuracy.
4. Plinko line when displayed WPM is above 50.
5. Place line for Top 5 or Top 10, except rank 1.
6. Name field and Save Score action for eligible contestants.

Example eligible result:

```text
Nice typing!

84 WPM
97% ACCURACY

You win a Plinko drop!
You made the Top 10!

Name
[ Morgan________________ ]

[ SAVE SCORE ]
```

Use “NEW HIGH SCORE!” as the only headline for rank 1. Add “You win a Plinko drop!” when that score is above 50 WPM, and do not add “You made the Top 5!” Use “Nice typing!” with “You made the Top 5!” for places 2 through 5, and with “You made the Top 10!” for sixth through tenth. Use “Nice typing!” with “You win a Plinko drop!” when displayed WPM is above 50. A Top 5 or Top 10 score above 50 shows the place line and the Plinko line together. Use “Casper, is that you?” when displayed WPM is 0, with no place line and no Plinko line. Use “Thanks for playing!” when the attempt is outside the Top 10 and displayed WPM is 1 through 50. Use “You win a Plinko drop!” only when the contestant qualifies; omit it otherwise. That rule is in `docs/prd.md` §13. “Nice typing!”, “Thanks for playing!”, “Casper, is that you?”, and “NEW HIGH SCORE!” stay charcoal. “You win a Plinko drop!” uses the same mint pill as Ready, with charcoal text. “You made the Top 5!” and “You made the Top 10!” use a light lavender pill, with charcoal text. Do not use the pale purple headline in `04-results.png`. Lavender, mint, and small pink/peach celebration motifs may support the result without competing with the form. `04-results.png` omits the Plinko line. Do not copy that omission.

Name eligibility, validation, saving, and both Results exits are defined in `docs/prd.md` §15. When the name is still empty or blocked, show “Opening the leaderboard in {n}s” only for the last 5 seconds of the 15-second wait, then leave through View Leaderboard. Hide that countdown once the name is allowed. A blocked name also shows “Pick a different name.” Do not invent a different length limit in the field styling. Do not show an unusable name field when the result is not eligible. View Leaderboard is the leave action when name entry is omitted, and it is also the way to leave without a name when entry is shown. That exit still writes one score row with a null name. The label is “VIEW LEADERBOARD” from Brand voice. If the iPad software keyboard covers SAVE SCORE, keep the field and that button in the upper half, as in `docs/wireframes.md` §7.

## 13. Top 5 Leaderboard

**Purpose:** show the event's five highest qualifying scores and prepare for the next contestant.

Example structure, matching the latest leaderboard wireframe:

```text
TOP 5
Leaderboard

1   Alex                 92 WPM
2   Jamie                88 WPM
3   Morgan  [YOU]        84 WPM
4   Riley                78 WPM
5   Casey                73 WPM

[ NEXT PLAYER → ]

Returning to ready screen in 5s
```

### Layout and emphasis

- Place a small logo-only badge near the upper-left safe margin. Long-press behavior is in `docs/prd.md` §9.
- Center the “TOP 5” pill and “Leaderboard” heading.
- Use one wide soft-white rounded panel with five consistent row positions.
- Make rank 1 the strongest ranking emphasis: light-lavender row surface, mint rank badge/accent, and clear charcoal text. A small crown or star is optional.
- Keep the other rows quiet and easy to scan.
- Optionally highlight the current player's visible row with a subtle mint tint or outline and a “YOU” pill. Match the current result, not just its name.
- If the current player is first, combine both treatments in that row. If they are outside the Top 5, do not add a sixth row.
- Place a large mint NEXT PLAYER button below the panel, with the automatic-return message beneath it.
- Keep peripheral motifs sparse and separate from the rows and button.

### Empty and partial boards

Show actual event data rather than filling missing places with sample contestants.

**Proposed treatment:** preserve five row positions, use dashes for unoccupied places, and show “No scores yet” when the board is empty. Do not style an empty placeholder as a winning score.

### Automatic return

- Start the return countdown when the leaderboard appears.
- The countdown duration and what reset preserves are defined in `docs/prd.md`. Show “Returning to ready screen in {n}s” only for the last 5 seconds, in small type. Do not leave the number static.
- NEXT PLAYER returns immediately to Ready. Escape does the same. Countdown completion performs the same reset.
- Cancel the outgoing countdown when leaving the screen.

## 14. Motion

Motion should be brief and purposeful: button feedback, a result reveal, a new-high-score celebration, or a restrained leaderboard transition.

- Do not animate the passage position or use moving backgrounds during Typing.
- Do not let celebrations obscure scores, delay controls, or interfere with name entry.
- Respect `prefers-reduced-motion`; essential feedback must remain understandable without animation.
- A visible timer and reset message provide information independently of decorative motion.

## 15. Accessibility and readability

- Validate important content from approximately two feet away on the target iPad.
- Check real foreground/background combinations rather than treating palette membership as proof of sufficient contrast.
- Use large touch targets, visible keyboard focus, and persistent input labels.
- Give selected options, errors, and the current-player row non-color identifiers.
- Keep the active word and caret recognizable throughout the passage.
- Do not hide essential instructions in small, pale helper text.
- Keep the name field and action usable with the physical keyboard connected.
- Keep SAVE SCORE visible when the iPad software keyboard is open. The upper-half placement is in `docs/wireframes.md` §7.
- Keep controls and state changes understandable without animation or sound.
- Ensure long names, larger text, and empty states do not obscure scores or primary actions.

## 16. Offline assets

Package the fonts and images in this design system locally. The offline booth requirement and score persistence are in `docs/prd.md`. Precache is in `docs/technical_plan.md`.

## 17. Brand voice

Use short, friendly, casual copy that is immediately understandable at an event.

Confirmed examples:

```text
GIANT keyboard typing contest!
Type above 50 WPM for a Plinko drop.
CURRENT HIGH SCORE
Be the first high score!
Arrow keys move. Enter selects.
PRESS ANY KEY TO START
Your timer starts when you begin typing.
Turn sideways and use the full screen.
Nice typing!
Thanks for playing!
Casper, is that you?
NEW HIGH SCORE!
You win a Plinko drop!
You made the Top 5!
You made the Top 10!
SAVE SCORE
VIEW LEADERBOARD
Opening the leaderboard in 5s
Pick a different name.
TOP 5
NEXT PLAYER
```

Keep wording consistent across screens. Avoid corporate language, technical jargon, long instructions, and overly childish copy. Do not add shop-name text to the interface.

## 18. CSS design tokens

```css
:root {
  /* Surfaces */
  --tiny-blush: #FBEDEF;
  --tiny-white: #FFFDFC;

  /* Primary accents */
  --tiny-mint: #9DDED8;
  --tiny-mint-strong: #6CCFC7;
  --tiny-mint-deep: #24756E;

  /* Secondary accents */
  --tiny-lavender: #AA9AD4;
  --tiny-lavender-light: #D9D0ED;
  --tiny-lavender-deep: #6B5A9A;

  /* Decorative accents */
  --tiny-pink: #F4C1D4;
  --tiny-peach: #F5CFC0;

  /* Text and feedback */
  --tiny-charcoal: #403738;
  --tiny-muted: #8C8788;
  --tiny-error: #D95D5D;

  /* Typography */
  --font-display: "Fredoka", sans-serif;
  --font-ui: "Nunito", sans-serif;
  --font-typing: "Atkinson Hyperlegible", sans-serif;
}
```

The table in section 3 and this token block must remain synchronized. Font declarations require actual locally available font files; fallback fonts alone do not establish the intended typography.

## 19. Design review checklist

This checklist records what to verify; it does not claim the implementation has already passed review.

- [ ] All screens use the current palette and the three defined font roles.
- [ ] Visible branding is limited to the optional logo-only badge.
- [ ] Each contestant screen fits a landscape 4:3 viewport and is readable at approximately two feet. Portrait and Split View show the landscape full-screen instruction instead.
- [ ] Event Setup contains the duration, game mode, and leaderboard choices plus Start Event.
- [ ] Ready shows the contest message, current high score and name, and keyboard invitation.
- [ ] Ready contains no Start button, Top 5, or operator controls.
- [ ] The opening keypress is consumed; the full sentence appears before timing begins.
- [ ] Typing shows one complete centered line with balanced margins and a consistent font size.
- [ ] Current word, caret, completed text, upcoming text, and errors remain distinguishable.
- [ ] WPM, timer, and accuracy occupy the bottom-left, bottom-center, and bottom-right positions.
- [ ] Results show the headline, WPM, accuracy, “You win a Plinko drop!” when displayed WPM is above 50, and the place line for Top 5 or Top 10 except rank 1.
- [ ] Name entry through 20th place stays on Results. An empty or blocked name shows the leaderboard countdown for the last 5 seconds, then leaves. A blocked name shows “Pick a different name.” The leaderboard's return-to-ready countdown does not run during name entry.
- [ ] Leaderboard shows only the Top 5, emphasizes rank 1, and optionally identifies the current result.
- [ ] NEXT PLAYER and the visible countdown return to Ready while preserving event data.
- [ ] Empty states contain no fabricated scores or contestants.
- [ ] Essential text has sufficient contrast, focus is visible, and state is not conveyed by color alone.
- [ ] Required fonts, images, icons, and passages are available offline.

## 20. Settled product decisions

These choices are settled. Product behavior is in `docs/prd.md`.

- The first printable character starts the timer. Space and punctuation count. The excluded non-typing keys are in `docs/prd.md` §11.
- A long name is truncated with an ellipsis in the row. The stored name is unchanged.
- When no event exists, Event Setup selects Start Fresh, 30 seconds, and Famous Lines, and Continue is unavailable. When an event exists, Continue is selected and the duration and game mode show the stored choices.
- A ranked score with no name shows a dash. Do not invent a guest name.
