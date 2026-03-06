# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A ZeppOS Mini Program for the **Amazfit Balance** watch (480×480 round AMOLED display) that reminds users to stretch at configurable intervals. It runs entirely on-device — no phone/side-app connection.

## Build & Run Commands

Prerequisites: Node.js v14+ and the Zeus CLI (`npm install @zeppos/zeus-cli -g`).

```bash
# Simulator (requires simulator running from https://developer.zepp.com/os/develop-simulator)
zeus dev compile preview

# Real watch (requires developer login and Zepp App)
zeus login
zeus preview   # generates QR code, select target: amazfit-balance

# Production build (.zpk output)
zeus build
```

## Architecture

### App Lifecycle

```
App (app.js)              — boots first, holds globalData for the app's lifetime
  └── pages/home/         — countdown timer page (entry screen)
  └── pages/stretch/      — exercise display page (pushed onto nav stack)
```

### Shared State via `globalData`

Pages access shared state through `getApp()._options.globalData`:
- `exercises[]` — the full exercise database (12 stretches with name/duration/region/steps)
- `lastExerciseIndex` — tracks last shown exercise to prevent immediate repeats
- `reminderIntervalMinutes` — default: 30

### Navigation Pattern

`push()` navigates forward (adds to stack); `back()` returns. The stretch page avoids deep stacks by calling `back()` then `setTimeout(() => push(...), 100)` when showing "Next" exercise.

### Key ZeppOS Constraints

- **UI is imperative**: use `createWidget()` with explicit x/y/w/h coords; store widget refs for later `setProperty(prop.MORE, {...})` updates
- **`px()` is required**: wraps all coordinates for screen-adaptive scaling (designWidth=480)
- **Colors are `0xRRGGBB`** integers, not CSS strings
- **Timers pause on app suspension**: `setInterval` pauses when user leaves the app. For true background reminders, the Alarm API (`@zos/alarm`) is needed
- **`onDestroy()` must clear all intervals** — timer leaks are the most common ZeppOS bug
- **Round screen**: keep important content within ~400px diameter; corners are clipped

### File Layout

```
app.json          — manifest: appId, pages list, device platforms (deviceSource IDs), designWidth
app.js            — App() entry: globalData with exercise database and app state
pages/home/       — Home screen with countdown timer, "Stretch Now" and "Reset Timer" buttons
pages/stretch/    — Exercise page: shows name/instructions/region tag, per-exercise countdown, Done/Next buttons
pages/i18n/       — Localization strings (en-US.po)
assets/amazfit-balance/  — Device-specific image assets (icon.png goes here)
dist/             — Build output
```

### Key API Imports

| Module | Used for |
|--------|----------|
| `@zos/ui` | `createWidget`, `widget`, `prop`, `align`, `text_style`, `event` |
| `@zos/utils` | `px()` — coordinate scaling |
| `@zos/router` | `push`, `back` — page navigation |
| `@zos/sensor` | `Vibrator`, `VIBRATOR_SCENE_SHORT`, `VIBRATOR_SCENE_DURATION` |

### `app.json` Device Configuration

The target is `amazfit-balance` with `deviceSource` IDs `8519936` and `8519937`. The `defaultLanguage` field must be present (currently missing — this causes the build error seen at startup). Add `"defaultLanguage": "en-US"` under `"app"` in app.json.
