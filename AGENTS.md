# Typing Test — Agent Instructions

## Project Overview

This repository contains a **typing test** for an in-person retail event.

Always refer to the product as the **"typing test."**

Do not call it:
- typing kiosk game
- typing game
- kiosk game

unless the user explicitly changes the terminology.

The experience is intended to feel polished, playful, lightweight, and appropriate for an in-person retail/event setting.

---

## Source of Truth

Before implementing or substantially modifying a feature, inspect the repository instead of assuming how the application works.

Use the following sources in this priority order:

1. The user's current request.
2. Existing working application behavior and architecture.
3. The document that owns the topic:

| Topic | Owner |
| --- | --- |
| Scoring, accuracy gate, ranking, name rules, continue-event duration, game mode, reset timing, what must persist, offline must-work | `docs/prd.md` |
| Palette, type scale, CSS tokens, motifs, component styling, required contestant-facing strings | `docs/design_system.md` |
| Screen layout and the five PNG wireframes | `docs/wireframes.md` |
| Stack, application state, IndexedDB schema, module boundaries, service worker, precache, navigation fallback, implementation order | `docs/technical_plan.md` |
| Booth acceptance tests and the pre-event checklist | `docs/prd.md` |
| Automated test map and hardware check lists | `docs/technical_plan.md` |

4. Existing components, styles, utilities, and patterns.
5. This `AGENTS.md`.

If two documents disagree, follow the owner in the table. The user's most recent explicit instruction still takes priority over every document.

Do not invent requirements when the answer can be determined from existing project files.

---

## Before Editing Code

Before making changes:

1. Inspect the relevant files.
2. Determine how the existing implementation works.
3. Identify reusable components, utilities, styles, and state.
4. Check related screens for consistency.
5. Keep the requested change as scoped as reasonably possible.

Do not immediately rewrite a component or architecture simply because another implementation would also work.

Prefer modifying the existing system over replacing it.

---

## Architecture

Preserve the repository's existing architecture unless the user explicitly asks for an architectural change.

Determine technologies from the repository itself, including:

- `package.json`
- configuration files
- application directories
- existing imports
- existing components
- existing API/database structure

Do not assume a framework, package, state-management system, database, or deployment platform without checking the repository.

Reuse existing:

- components
- hooks
- services
- utilities
- API patterns
- styling systems
- state-management patterns
- schemas
- constants

when appropriate.

Avoid introducing a new dependency when the existing stack can reasonably handle the requirement.

---

## Design System

All UI work should follow the established visual system in `docs/design_system.md`.

### Core aesthetic

Use:

- teal-led pastel palette
- lavender
- pink
- cream / warm white
- sky blue
- dark charcoal or deep indigo text
- rounded, chunky, playful display typography
- rounded, friendly UI typography
- rounded UI surfaces and controls
- sparse handmade doodles
- blobs
- stars
- swirls
- light handmade details

The visual tone should feel:

- playful
- friendly
- handmade
- polished
- welcoming
- appropriate for a small creative retail brand

It should not feel:

- corporate
- overly minimal
- sterile
- aggressively gamified
- visually cluttered
- childish

---

## Branding

**Do not display the shop name in the application UI unless the user explicitly requests it.**

Existing approved logo artwork may still be used where appropriate.

Do not independently add:

- brand-name headings
- brand-name footer text
- shop-name labels
- unnecessary branding copy

just because the experience belongs to the brand.

---

## Wireframes

Use the existing `/wireframes` directory as a major visual reference when implementing UI.

Important flows/screens include:

- typing test
- results / name
- leaderboard

When implementing a wireframed screen:

- inspect the actual wireframe first
- preserve its information hierarchy
- preserve the intended layout
- preserve the established brand system
- translate the design into responsive UI rather than reproducing it as a fixed image
- reuse shared UI patterns between screens

Do not independently redesign a screen when an approved wireframe already exists unless the user specifically requests a redesign.

---

## Private Wireframes

The repository may contain or locally reference:

`wireframes/private/`

Files in this directory are intentionally private.

Rules:

- Do not remove its `.gitignore` protection.
- Do not force-add private files to Git.
- Do not move private assets into tracked/public directories.
- Do not expose their contents in public documentation.
- Do not modify Git configuration to make them public.
- Do not commit them unless the user explicitly instructs otherwise.

A private wireframe may still be used locally as implementation reference if Cursor has access to it.

---

## Responsive UI

Do not design only for the exact dimensions of a wireframe.

Implement layouts so they remain usable across the viewport sizes relevant to the existing application.

Prefer:

- flexible layouts
- sensible max widths
- responsive spacing
- reusable layout primitives
- content-safe sizing

Avoid unnecessary hard-coded positioning when normal layout systems can reproduce the design.

---

## Components

Prefer reusable components when multiple screens genuinely share the same UI or behavior.

Do not create abstractions solely to reduce a few lines of code.

Do not duplicate substantial logic that already exists elsewhere in the project.

Keep components focused and understandable.

Follow naming and file-organization conventions already present in the repository.

---

## Styling

Follow the project's existing styling approach.

Before introducing new styling conventions, inspect how existing screens are styled.

Reuse existing:

- colors
- spacing
- typography
- border radii
- shadows
- buttons
- cards
- form controls
- breakpoints

when available.

Avoid creating visually inconsistent one-off values when an established token or pattern exists.

---

## Functionality

Preserve existing working functionality unless changing it is required for the requested feature.

Do not silently remove or alter:

- navigation
- state
- persistence
- validation
- keyboard behavior
- APIs
- database behavior
- scoring behavior
- result calculations
- leaderboard functionality

If existing behavior appears broken or contradictory, investigate before rewriting it.

---

## Typing Test Logic

Treat typing-test calculations and user results as product logic, not disposable UI state.

Before modifying logic related to metrics such as:

- WPM
- accuracy
- errors
- elapsed time
- completion state
- name
- score
- ranking
- leaderboard entries

inspect the existing implementation and determine how the metric is currently defined.

Do not change formulas or scoring semantics solely as part of a visual change.

---

## Results / Name Flow

The Results / Name screen should remain consistent with the approved wireframe and the rest of the typing-test flow.

Keep result data and name submission behavior separate enough that presentation changes do not accidentally change scoring behavior.

Validate name input according to existing product requirements.

Do not invent additional required user information unless explicitly requested.

---

## Leaderboard

Preserve the established leaderboard behavior and data model.

Do not change ranking or sorting rules without checking the current implementation or explicit requirements.

UI work should not silently modify leaderboard semantics.

Handle empty, loading, and error states when appropriate to the existing application architecture.

---

## User Experience

Prioritize a simple event-friendly flow.

Avoid unnecessary:

- dialogs
- configuration
- onboarding
- navigation
- forms
- confirmation steps
- explanatory text

unless required by the product.

Primary actions should be visually obvious.

Users should be able to understand what to do without extensive instructions.

---

## Accessibility

Do not sacrifice basic usability for visual fidelity.

Where applicable:

- use semantic HTML
- associate labels with form inputs
- preserve keyboard accessibility
- provide visible focus states
- use buttons for actions
- use links for navigation
- provide useful image alt text
- maintain reasonable text contrast

Do not remove accessibility behavior already present.

---

## Code Quality

When editing:

- follow existing formatting conventions
- use clear names
- remove dead code introduced by your changes
- avoid unnecessary duplication
- avoid premature abstraction
- keep logic readable
- avoid unrelated refactors

Do not rewrite unrelated files merely to match personal style preferences.

---

## Comments

Prefer self-explanatory code.

Add comments when they explain:

- non-obvious behavior
- product-specific constraints
- unusual workarounds
- reasoning that would otherwise be difficult to recover

Do not add comments that simply restate the code.

---

## Dependencies

Do not install a package automatically just because it makes a task slightly easier.

Before adding a dependency:

1. Check whether the project already has something that solves the problem.
2. Determine whether the platform or framework provides the functionality.
3. Confirm the dependency provides enough value to justify increasing project complexity.

Avoid replacing existing libraries without explicit reason.

---

## Git Safety

Do not perform destructive Git operations unless the user explicitly asks.

Do not:

- force push
- rewrite shared history
- delete branches
- reset unrelated work
- remove ignored-file protections
- commit private files

Preserve unrelated user changes.

When inspecting a dirty working tree, assume changes may be intentional.

---

## Scope Control

When the user asks for one feature or fix, keep edits focused on that request.

Do not bundle unrelated:

- redesigns
- refactors
- dependency upgrades
- formatting changes
- architecture changes

into the same task.

If another issue is discovered, mention it separately rather than silently expanding the scope.

---

## Verification

After changing code, perform the checks appropriate for the repository.

Inspect `package.json` and project documentation to determine the correct commands.

Where available and relevant, run:

- formatting
- linting
- type checking
- tests
- build

Do not claim a check passed unless it was actually run successfully.

If a check cannot be run, state that clearly.

---

## Debugging

For bugs:

1. Reproduce or trace the reported behavior.
2. Identify the likely root cause.
3. Inspect related code paths.
4. Make the smallest reasonable fix.
5. Verify the affected behavior.
6. Check for obvious regressions.

Do not make speculative code changes before inspecting the relevant implementation.

---

## Communication

When handling a coding task:

- be concise
- identify the relevant files
- explain significant implementation decisions
- distinguish confirmed findings from assumptions
- mention verification performed
- identify unresolved issues when relevant

Do not provide long tutorials unless requested.

---

## Planning Larger Changes

For changes involving multiple systems or many files, first understand the existing architecture and create a short implementation plan before editing.

For small, isolated changes, proceed without unnecessary planning overhead.

---

## Documentation

Update the document that owns the changed topic. Keep `docs/technical_plan.md` accurate when the work changes architecture, data flow, the implementation plan, or the automated test map. Keep `docs/prd.md` accurate when product behavior or booth acceptance tests change.

Do not update documentation merely because code formatting or insignificant implementation details changed.

Read `docs/technical_plan.md` before making substantial architectural changes. Read `docs/prd.md` before changing scoring, persistence, or offline behavior.

---

## Security and Secrets

Never commit or expose:

- API keys
- tokens
- credentials
- private keys
- `.env` secrets
- personally identifying private data

Use the project's existing environment-variable conventions.

Do not move secrets into frontend code or tracked files.

---

## General Rule

When uncertain:

**inspect the existing project before guessing.**

The current repository, approved wireframes, documented technical plan, and user's latest instructions define the project.