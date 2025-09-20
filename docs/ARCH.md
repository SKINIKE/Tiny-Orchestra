# Tiny Orchestra – Architecture Overview (Phase 0)

Tiny Orchestra is structured as a pnpm workspace that separates UI, DSP, and test layers. The Phase 0 skeleton establishes clear boundaries:

- `apps/desktop` hosts the Tauri + React shell. The UI consumes shared logic through workspace packages and is bundled with Vite.
- `packages/core` will evolve into the pure TypeScript DSP engine. For now it exposes placeholder utilities so that integration patterns are validated early.
- `e2e` contains Playwright tests that exercise the web build. They are wired into the workspace tooling for future CI usage.

Global tooling (linting, formatting, type-checking) lives at the repo root to enforce consistent standards across packages.
