# Typing Test

An offline typing contest for a landscape iPad and a giant physical keyboard, intended for repeated use at an event booth.

On Event Setup the operator chooses 30 or 60 seconds and a game mode: Standard, Famous Lines, or Story. Story always uses 60 seconds. Arrow keys move through those choices and Enter selects them. Holding Escape on Ready opens Event Setup. A score keeps the length, mode, and WPM from the attempt that earned it. Story ends when the story is finished, and that WPM uses the time it took. The 60-second timer still ends a slow attempt. The name field is ready when Results asks for a name, so the first letter goes into it. Enter saves that name with the score. When Results has no name field, Enter or Space opens the leaderboard. Enter or Space on the Leaderboard returns to Ready.

## Run

```bash
nvm use
npm install
npm run dev
```

## Documentation

| Document | What it owns |
| --- | --- |
| [Product requirements](docs/prd.md) | Scoring, name rules, persistence, offline requirements, and booth acceptance tests |
| [Technical plan](docs/technical_plan.md) | Implementation plan, application structure, and the automated test map |
| [Design system](docs/design_system.md) | Palette, type, tokens, and contestant-facing strings |
| [Wireframes](docs/wireframes.md) | Screen layout |
| [Wireframe images](docs/wireframes/) | The five screen PNGs |

## License

No license has been selected yet.

Until a license is added, this repository does not grant reuse of the source or project assets. If the project is made public, add an explicit license only after deciding how the specification, future code, and any branding or assets may be used.
