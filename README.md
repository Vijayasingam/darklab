# dark-git

A native desktop client for managing GitLab repositories.

## Tech Stack

- Electron
- electron-vite
- React + TypeScript
- Tailwind CSS
- Zustand
- TanStack Query
- better-sqlite3

## Package Manager

This project uses pnpm.

Current package manager version in package.json:

pnpm@10.17.1

## Prerequisites

- Node.js 20+
- pnpm 10+
- macOS, Windows, or Linux

## Setup

1. Install dependencies

    pnpm install

2. Start development mode

    pnpm run dev

## Available Scripts

- Development: pnpm run dev
- Build: pnpm run build
- Preview: pnpm run preview
- Package desktop app: pnpm run package
- Type check: pnpm run typecheck
- Type check (node config): pnpm run typecheck:node
- Lint: pnpm run lint
- Lint fix: pnpm run lint:fix
- Format: pnpm run format
- Test: pnpm run test
- Test watch: pnpm run test:watch

## Project Structure

- src/main: Electron main process code
- src/preload: secure preload bridge
- src/renderer: React renderer app
- src/shared: shared IPC channels and domain types

## Build Output

- App build output: release
- Bundled app code: out

## Notes

- Postinstall runs electron-rebuild for better-sqlite3.
- Lockfile is managed by pnpm through pnpm-lock.yaml.
