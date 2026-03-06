/**
 * app.js — Application Entry Point
 * ==================================
 * In ZeppOS, every Mini Program starts with app.js.
 * globalData is shared across ALL pages.
 *
 * Lifecycle:
 *   onCreate(param) → App is launched; param === 'alarm' when woken by alarm
 *   onDestroy()     → App is terminated
 */

import { LocalStorage } from '@zos/storage'
import { set, cancel } from '@zos/alarm'

const STORAGE_KEY = 'stretch_settings'
const storage = new LocalStorage()

/**
 * scheduleNextAlarm — Calculate and schedule the next background alarm.
 * Returns the alarm ID, or null if scheduling is disabled or no valid time found.
 * The caller is responsible for persisting the returned ID into settings.alarmId.
 */
function scheduleNextAlarm(settings) {
  if (!settings.enabled || settings.days.length === 0) return null

  const now = new Date()
  const endMinutes = settings.endHour * 60 + settings.endMinute

  // Start from now + interval
  let next = new Date(now.getTime() + settings.intervalMinutes * 60 * 1000)

  // If next time is past end-of-day, move to start time the next calendar day
  if (next.getHours() * 60 + next.getMinutes() >= endMinutes) {
    next.setHours(settings.startHour, settings.startMinute, 0, 0)
    next.setDate(next.getDate() + 1)
  }

  // Advance to the next valid weekday (max 7 iterations to avoid infinite loop)
  for (let i = 0; i < 7; i++) {
    if (settings.days.includes(next.getDay())) break
    next.setDate(next.getDate() + 1)
    next.setHours(settings.startHour, settings.startMinute, 0, 0)
  }

  // Cancel the previous alarm so we never have two active at once
  if (settings.alarmId != null) {
    try {
      cancel(settings.alarmId)
    } catch (e) {
      console.log('[Alarm] cancel error:', e.message)
    }
  }

  let id
  try {
    id = set({
      url: 'pages/stretch/index',
      time: Math.floor(next.getTime() / 1000), // UTC seconds
      param: 'alarm',
      store: true,
    })
  } catch (e) {
    console.log('[Alarm] set() error:', e.message)
    return null
  }

  console.log('[Alarm] scheduled at', next.toISOString(), 'id:', id)

  return id
}

App({
  globalData: {
    // ─── Stretch Exercise Database ───────────────────────────
    exercises: [
      {
        name: 'Neck Roll',
        duration: 30,
        region: 'neck',
        steps: 'Slowly roll your head\nin a circle.\n5x each direction.'
      },
      {
        name: 'Shoulder Shrug',
        duration: 20,
        region: 'shoulders',
        steps: 'Raise shoulders to ears.\nHold 3s, release.\nRepeat 8x.'
      },
      {
        name: 'Chest Opener',
        duration: 30,
        region: 'chest',
        steps: 'Clasp hands behind back.\nSqueeze shoulder blades.\nHold 15s x2.'
      },
      {
        name: 'Seated Twist',
        duration: 30,
        region: 'back',
        steps: 'Sit upright, twist right.\nHold 15s.\nSwitch sides.'
      },
      {
        name: 'Wrist Circles',
        duration: 20,
        region: 'wrists',
        steps: 'Extend arms forward.\nRotate wrists slowly.\n10x each direction.'
      },
      {
        name: 'Standing Quad',
        duration: 40,
        region: 'legs',
        steps: 'Stand on one leg.\nPull foot to glute.\nHold 20s each side.'
      },
      {
        name: 'Forward Fold',
        duration: 30,
        region: 'back',
        steps: 'Stand, bend at hips.\nReach for toes.\nHold 30s, breathe.'
      },
      {
        name: 'Cat-Cow',
        duration: 30,
        region: 'spine',
        steps: 'On all fours:\nArch back (cat),\nthen drop belly (cow).\n10x slowly.'
      },
      {
        name: 'Hip Flexor',
        duration: 40,
        region: 'hips',
        steps: 'Lunge position.\nPush hips forward.\nHold 20s each side.'
      },
      {
        name: 'Calf Raise',
        duration: 20,
        region: 'calves',
        steps: 'Stand on edge of step.\nRaise up on toes.\nLower slowly. 15x.'
      },
      {
        name: 'Side Bend',
        duration: 30,
        region: 'obliques',
        steps: 'Stand tall, arm overhead.\nLean to one side.\nHold 15s each.'
      },
      {
        name: 'Ankle Circles',
        duration: 20,
        region: 'ankles',
        steps: 'Lift one foot.\nRotate ankle slowly.\n10x each direction,\neach foot.'
      }
    ],

    // ─── App State ───────────────────────────────────────────
    lastExerciseIndex: -1,

    // Set to true in onCreate when woken by the alarm.
    // The stretch page reads and clears this flag in onInit.
    launchedByAlarm: false,
    alarmExerciseIndex: 0,

    // ─── Schedule Settings (defaults; overwritten from LocalStorage) ─────
    settings: {
      days: [1, 2, 3, 4, 5], // 0=Sun … 6=Sat, default Mon–Fri
      startHour: 9,
      startMinute: 0,
      endHour: 17,
      endMinute: 0,
      intervalMinutes: 45,
      enabled: false,
      alarmId: null,
    },

    // Shared utility — callable from any page via getApp()._options.globalData
    scheduleNextAlarm,
  },

  onCreate(param) {
    console.log('[StretchReminder] App created, param:', param)

    // Restore persisted settings
    try {
      const saved = storage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        Object.assign(this._options.globalData.settings, parsed)
      }
    } catch (e) {
      console.log('[App] Failed to load settings:', e.message)
    }

    // When launched by an alarm, pre-select an exercise for the stretch page
    if (param === 'alarm') {
      const gd = this._options.globalData
      gd.launchedByAlarm = true

      const exercises = gd.exercises
      const lastIdx = gd.lastExerciseIndex
      let newIdx
      do {
        newIdx = Math.floor(Math.random() * exercises.length)
      } while (newIdx === lastIdx && exercises.length > 1)

      gd.alarmExerciseIndex = newIdx
      gd.lastExerciseIndex = newIdx
      console.log('[App] Alarm launch, exercise:', exercises[newIdx].name)

      // Reschedule the next alarm immediately on launch so it is guaranteed to
      // be set even if the stretch page is dismissed via the hardware back button.
      // The stretch page may reschedule again from Done/Next (preferred timing),
      // which will cancel this one and replace it.
      const settings = gd.settings
      if (settings && settings.enabled) {
        const newId = scheduleNextAlarm(settings)
        if (newId != null) {
          settings.alarmId = newId
          try {
            storage.setItem(STORAGE_KEY, JSON.stringify(settings))
          } catch (e) {
            console.log('[App] Failed to persist rescheduled alarm id:', e.message)
          }
        }
      }
    }
  },

  onDestroy() {
    console.log('[StretchReminder] App destroyed')
  }
})
