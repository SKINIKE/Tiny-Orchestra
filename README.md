# Tiny Orchestra

Tiny Orchestra is a lo-fi chiptune tracker and sequencer built as an offline-first desktop application. The repository is organised as a pnpm workspace so that the core DSP engine, user interface, and automation tooling can evolve independently.

## Workspace layout

| Path | Description |
| ---- | ----------- |
| `apps/desktop` | Tauri + React shell that will host the tracker UI. |
| `packages/core` | TypeScript package that will contain the audio engine and file exporters. |
| `e2e` | Playwright end-to-end tests that exercise the web build. |
| `docs` | Architecture notes, product requirements, and phase tracking. |

## Scripts

The root `package.json` exposes aggregate scripts:

- `pnpm dev:web` – run the desktop shell in web mode via Vite.
- `pnpm dev:tauri` – launch the native desktop build.
- `pnpm lint` / `pnpm format` – enforce code style.
- `pnpm test` – execute unit tests across workspace packages.
- `pnpm e2e` – run Playwright smoke tests.
- `pnpm build` – type-check and build packages that define a build target.

## Tooling

- TypeScript with strict settings shared via `tsconfig.base.json`.
- ESLint + Prettier + Husky pre-commit checks (including a binary file guard).
- Vitest for unit tests and Playwright for end-to-end coverage.
- GitHub Actions workflow (`ci.yml`) that installs dependencies, runs lint/test, and builds the workspace.
