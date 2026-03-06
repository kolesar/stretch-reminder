# Stretch Reminder

A ZeppOS Mini Program for the **Amazfit Active Max** smartwatch that reminds you to stretch at regular intervals throughout the workday. Each reminder picks a random exercise from a library of 12 guided stretches, shows an animated countdown timer, and automatically schedules the next alarm.

---

## Features

- **Scheduled reminders** — configure active weekdays, start/end time, and interval (5–120 min)
- **12 guided exercises** — covering neck, shoulders, chest, back, wrists, legs, spine, hips, calves, obliques, and ankles
- **Animated progress arc** — orange ring counts down the exercise duration
- **Exercise illustrations** — custom artwork for each stretch
- **Alarm-based delivery** — fires even when the watch app is not open
- **Persistent settings** — saved on-device across app restarts and reboots

---

## Device Support

| Device | Platform ID | deviceSource |
|---|---|---|
| Amazfit Active Max | GenevaWN | 10813697 |
| Amazfit Active Max | GenevaW | 10813699 |

- **Screen:** 480 × 480 px, round AMOLED
- **ZeppOS API:** 3.0.0

---

## Project Structure

```
stretch-reminder/
├── app.js                        # App entry: exercise database, alarm scheduler, globalData
├── app.json                      # Manifest: device targets, permissions, page list
├── Makefile                      # Dev / build / clean shortcuts
├── pages/
│   ├── home/index.js             # Settings page: days, time window, interval, Save & Start
│   ├── stretch/index.js          # Exercise page: arc timer, illustration, Done / Next
│   └── i18n/en-US.po             # English locale strings
└── assets/
    └── amazfit-active-max/
        ├── icon.png              # App icon
        └── exercises/            # 12 exercise illustrations (200 × 140 px PNG)
            ├── neck_roll.png
            ├── shoulder_shrug.png
            ├── chest_opener.png
            ├── seated_twist.png
            ├── wrist_circles.png
            ├── standing_quad.png
            ├── forward_fold.png
            ├── cat_cow.png
            ├── hip_flexor.png
            ├── calf_raise.png
            ├── side_bend.png
            └── ankle_circles.png
```

---

## Prerequisites

- **Node.js** v14+
- **Zeus CLI** — the official ZeppOS build tool:
  ```bash
  npm install @zeppos/zeus-cli -g
  ```
- **ZeppOS Simulator** (optional, for `make dev`) — download from the [Zepp developer portal](https://developer.zepp.com/os/develop-simulator)
- **Zepp mobile app** (for real-device install) — available on iOS and Android

---

## Getting Started

```bash
git clone https://github.com/kolesar/stretch-reminder.git
cd stretch-reminder
```

> No `npm install` required — all dependencies are resolved by the Zeus CLI at build time.

---

## Development Workflow

| Command | What it does |
|---|---|
| `make dev` | Compile and open in the ZeppOS Simulator |
| `make preview` | Generate a QR code — scan with the Zepp app to install on a real watch |
| `make build` | Build a release `.zpk` package into `dist/` |
| `make clean` | Remove build artefacts from `dist/` |

### First-time real-device setup

```bash
zeus login       # Authenticate with your Zepp developer account (one-time)
make preview     # Generates QR code — scan in the Zepp app → Developer Options
```

---

## How the Alarm Chain Works

1. Open the app → configure days / time window / interval → tap **SAVE & START**
2. The app calls `@zos/alarm set(...)` to schedule the first alarm
3. At the scheduled time, ZeppOS launches the app with `param = "alarm"`
4. `app.js` picks a random exercise and immediately reschedules the **next** alarm (safety net — fires even if the user dismisses via the hardware back button)
5. The stretch page displays the exercise; tapping **DONE** or **NEXT** reschedules again from that moment (preferred timing, replaces the safety-net alarm)
6. The chain continues until the user disables reminders

---

## Settings Reference

All settings are stored on-device via `LocalStorage` under the key `stretch_settings`:

| Field | Type | Default | Description |
|---|---|---|---|
| `days` | `number[]` | `[1,2,3,4,5]` | Active weekdays — `0` = Sun … `6` = Sat |
| `startHour` / `startMinute` | `number` | `9:00` | Reminder window start |
| `endHour` / `endMinute` | `number` | `17:00` | Reminder window end |
| `intervalMinutes` | `number` | `45` | Minutes between reminders (5–120) |
| `enabled` | `boolean` | `false` | Whether the alarm chain is active |
| `alarmId` | `number \| null` | `null` | Currently scheduled alarm ID |

---

## Exercise Library

| Exercise | Body Region | Duration |
|---|---|---|
| Neck Roll | Neck | 30 s |
| Shoulder Shrug | Shoulders | 20 s |
| Chest Opener | Chest | 30 s |
| Seated Twist | Back | 30 s |
| Wrist Circles | Wrists | 20 s |
| Standing Quad | Legs | 40 s |
| Forward Fold | Back | 30 s |
| Cat-Cow | Spine | 30 s |
| Hip Flexor | Hips | 40 s |
| Calf Raise | Calves | 20 s |
| Side Bend | Obliques | 30 s |
| Ankle Circles | Ankles | 20 s |

---

## Permissions

Declared in `app.json`:

| Permission | Used for |
|---|---|
| `device:os.alarm` | Scheduling background reminders |
| `device:os.local_storage` | Persisting settings on-device |
| `device:os.display` | Keeping the screen on during an exercise |

---

## License

MIT
