## Devmate

Devmate is a **Git desktop client** that helps you manage repositories visually, similar to **SourceTree** or **GitHub Desktop**. It focuses on being fast, minimal, and easy to use for everyday Git workflows.

You will typically download a ready-to-use **`.exe`** from this repository and run it directly on Windows.

---

## Features

- **Visual Git history**
  - See commits, branches, and tags in a clear timeline.
- **Branch management**
  - Create, rename, switch, and delete branches without using the command line.
- **Staging & commits**
  - Stage individual files or hunks and write commit messages in a simple UI.
- **Diff viewer**
  - Inspect changes before committing.
- **Remote operations**
  - Pull, push, and fetch from remotes with a couple of clicks.
- **Multiple repositories**
  - Quickly switch between projects from a single app.
- **Familiar UX**
  - If you’ve used SourceTree or GitHub Desktop, Devmate should feel natural.

---

## Download & Installation (Users)

> Once releases are published, this section will point to the latest `.exe`.

- Download the latest **Devmate `.exe`** from the Releases section of this repository.
- Double-click the `.exe` to run the app.
- Optionally, pin Devmate to your taskbar or start menu for quick access.

No additional runtime should be required for normal use; everything is bundled into the desktop app.

---

## Getting Started

### Prerequisites

- **Node.js** (recommended: LTS version)
- **npm** (comes with Node.js)
- **Rust toolchain** (required by Tauri)
  - Install from: https://www.rust-lang.org/tools/install
  - Make sure `cargo` is available in your PATH

For Tauri’s latest platform-specific requirements, see: https://tauri.app

### Install dependencies

From the project root:

```bash
npm install
```

---

## Development

### Run the web app only (Vite dev server)

Useful for fast UI work without the Tauri shell:

```bash
npm run dev
```

By default Vite will print the local dev URL (for example `http://localhost:5173`).

### Run the full desktop app (Tauri + Vite)

Launches the Tauri window and uses the Vite dev server for the frontend:

```bash
npm run tauri:dev
```

This will compile the Rust side (Tauri) and run the React app in development mode.

---

## Building

### Build the web assets (for Tauri bundle)

```bash
npm run build
```

This runs TypeScript type-checking (`tsc`) and then `vite build`, outputting the production bundle to `dist/`.

### Build the desktop application

Use the Tauri CLI to produce a distributable bundle (installer / app).

Typically you run:

```bash
npm run build
# then
pnpm tauri build
```

or the equivalent `tauri build` command configured for your environment. Adjust to your workflow and package manager.

Refer to the official docs for details: https://tauri.app/v2/guides/building/

---

## Project Structure (high level)

- **`src/`** – React application source code (components, routes, hooks, etc.)
- **`public/`** – Static assets served by Vite
- **`src-tauri/`** – Tauri (Rust) side of the application
- **`index.html`** – HTML entry for Vite
- **`vite.config.ts`** – Vite configuration
- **`tsconfig*.json`** – TypeScript configuration

---

## How Devmate Compares to SourceTree / GitHub Desktop

- **Similarities**
  - Visual Git history and branch management.
  - Staging, committing, and viewing diffs through a graphical interface.
  - Simple flows for pulling and pushing to remotes.
- **Differences / Focus**
  - Aims to be lightweight and minimal, with fewer distractions.
  - Built with modern web technology and a native Tauri shell for fast startup.
  - Currently focused on the most common workflows rather than every advanced Git feature.

---

## Tech Stack

- **Framework**: React 19 + React DOM
- **Bundler/Dev server**: Vite 7
- **Language**: TypeScript 5
- **Desktop shell**: Tauri 2
- **Styling**: Tailwind CSS 4, `tailwind-merge`
- **UI primitives**: Radix UI (`@radix-ui/react-*`)
- **Icons**: `lucide-react`

---

## Recommended IDE Setup

- **VS Code**
  - [Tauri extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
  - TypeScript / React tooling (built-in)

You can of course use any editor that supports TypeScript, React, and Rust.

