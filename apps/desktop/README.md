# Tiny Orchestra Desktop

This package hosts the Tiny Orchestra desktop shell powered by Vite, React, and Tauri. It is part of the pnpm workspace so that the UI can share logic with the core DSP packages while staying testable in isolation.

## Available scripts

- `pnpm dev:web` – start the Vite development server for the web shell.
- `pnpm dev:tauri` – launch the native shell via the Tauri CLI.
- `pnpm test` – execute component unit tests with Vitest.
- `pnpm build` – type-check the project and produce the production web build consumed by Tauri.

All commands are executed from the `apps/desktop` directory or through the workspace runner (`pnpm --filter @tiny-orchestra/desktop <script>`).
