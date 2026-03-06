/**
 * pages/stretch/index.js — Stretch Exercise Page
 * =================================================
 * Reached in two ways:
 *   1. Manual:  pushed from Settings page via push({ url, params })
 *   2. Alarm:   ZeppOS opens the app directly here; app.js sets
 *               globalData.launchedByAlarm = true and picks the exercise.
 *
 * After the user taps Done or Next, the next background alarm is
 * rescheduled (if reminders are enabled).
 */

import { createWidget, widget, align, text_style, prop, event } from '@zos/ui'
import { px } from '@zos/utils'
import { back } from '@zos/router'
import { Vibrator, VIBRATOR_SCENE_DURATION, VIBRATOR_SCENE_SHORT } from '@zos/sensor'
import { LocalStorage } from '@zos/storage'
import { setSettings as setDisplay } from '@zos/display'

const SCREEN_W = 480
const storage = new LocalStorage()

// ─── Colors ──────────────────────────────────────────────────
const COLOR_EXERCISE     = 0x4FC3F7
const COLOR_TIMER        = 0xFFA500
const COLOR_STEPS        = 0xFFFFFF
const COLOR_REGION_TAG   = 0x66BB6A
const COLOR_BTN_DONE     = 0x1B5E20
const COLOR_BTN_DONE_P   = 0x388E3C
const COLOR_BTN_SKIP     = 0x333333
const COLOR_BTN_SKIP_P   = 0x555555
const COLOR_WHITE        = 0xFFFFFF
const COLOR_DIM          = 0x888888
const COLOR_COMPLETE     = 0x66BB6A
const COLOR_ARC          = 0xFFA500
const COLOR_ARC_TRACK    = 0x2A2A2A

// ─── Arc geometry ────────────────────────────────────────────
// Angles in ZeppOS: 0° = 3 o'clock, clockwise positive.
// 7:30 o'clock = 135°, 4:30 o'clock = 45° (≡ 405° after a full rotation).
// The arc sweeps 270° clockwise from 7:30 → 9 → 12 → 3 → 4:30,
// leaving a 90° gap at the bottom where the buttons sit.
const ARC_START = 135
const ARC_SPAN  = 270

// ─── Region labels ───────────────────────────────────────────
const REGION_ICONS = {
  neck:     'NECK',
  shoulders:'SHOULDERS',
  chest:    'CHEST',
  back:     'BACK',
  wrists:   'WRISTS',
  legs:     'LEGS',
  spine:    'SPINE',
  hips:     'HIPS',
  calves:   'CALVES',
  obliques: 'OBLIQUES',
  ankles:   'ANKLES'
}

// ─── Exercise image map ──────────────────────────────────────
const EXERCISE_IMAGES = {
  'Neck Roll':      'exercises/neck_roll.png',
  'Shoulder Shrug': 'exercises/shoulder_shrug.png',
  'Chest Opener':   'exercises/chest_opener.png',
  'Seated Twist':   'exercises/seated_twist.png',
  'Wrist Circles':  'exercises/wrist_circles.png',
  'Standing Quad':  'exercises/standing_quad.png',
  'Forward Fold':   'exercises/forward_fold.png',
  'Cat-Cow':        'exercises/cat_cow.png',
  'Hip Flexor':     'exercises/hip_flexor.png',
  'Calf Raise':     'exercises/calf_raise.png',
  'Side Bend':      'exercises/side_bend.png',
  'Ankle Circles':  'exercises/ankle_circles.png',
}

const STORAGE_KEY = 'stretch_settings'

Page({
  state: {
    exercise: null,
    exerciseIndex: 0,
    remainingSeconds: 0,
    timerId: null,
    // widget refs
    arcWidget: null,
    regionWidget: null,
    nameWidget: null,
    imageWidget: null,
    stepsWidget: null,
    timerShadowWidget: null,
    timerWidget: null,
    statusWidget: null,
    isComplete: false,
    wasAlarmLaunch: false,
  },

  onInit(params) {
    const app = getApp()
    const gd = app._options.globalData

    if (gd.launchedByAlarm) {
      this.state.exerciseIndex = gd.alarmExerciseIndex
      this.state.wasAlarmLaunch = true
      gd.launchedByAlarm = false
    } else {
      let parsed = {}
      try {
        if (typeof params === 'string') parsed = JSON.parse(params)
      } catch (e) {
        console.log('[Stretch] Failed to parse params:', e.message)
      }
      this.state.exerciseIndex = parsed.exerciseIndex || 0
    }

    const exercises = gd.exercises
    this.state.exercise = exercises[this.state.exerciseIndex]
    this.state.remainingSeconds = this.state.exercise.duration
    console.log(`[Stretch] Showing: ${this.state.exercise.name}`)
  },

  build() {
    const ex = this.state.exercise

    // Keep the display on long enough to read and start the exercise
    try { setDisplay({ brightTime: 30 * 1000 }) } catch (e) { /* ignore */ }

    // ─── Arc track (dim background ring) ─────────────────────
    createWidget(widget.ARC, {
      x: px(2), y: px(2), w: px(476), h: px(476),
      start_angle: ARC_START, end_angle: ARC_START + ARC_SPAN,
      color: COLOR_ARC_TRACK, line_width: px(8),
    })

    // ─── Arc progress (orange, shrinks as timer counts down) ──
    this.state.arcWidget = createWidget(widget.ARC, {
      x: px(2), y: px(2), w: px(476), h: px(476),
      start_angle: ARC_START, end_angle: ARC_START + ARC_SPAN,
      color: COLOR_ARC, line_width: px(8),
    })

    // ─── Body region tag ──────────────────────────────────────
    const regionLabel = REGION_ICONS[ex.region] || ex.region.toUpperCase()
    this.state.regionWidget = createWidget(widget.TEXT, {
      x: px(0), y: px(46), w: px(SCREEN_W), h: px(22),
      color: COLOR_REGION_TAG, text_size: px(18),
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.NONE, text: regionLabel
    })

    // ─── Exercise name ────────────────────────────────────────
    this.state.nameWidget = createWidget(widget.TEXT, {
      x: px(30), y: px(64), w: px(SCREEN_W - 60), h: px(52),
      color: COLOR_EXERCISE, text_size: px(40),
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.NONE, text: ex.name
    })

    // ─── Separator ────────────────────────────────────────────
    createWidget(widget.FILL_RECT, {
      x: px(120), y: px(118), w: px(240), h: px(2),
      radius: px(1), color: 0x4FC3F7
    })

    // ─── Exercise illustration ────────────────────────────────
    const imgSrc = EXERCISE_IMAGES[ex.name] || 'exercises/hip_flexor.png'
    this.state.imageWidget = createWidget(widget.IMG, {
      x: px(140), y: px(124),
      src: imgSrc,
    })

    // ─── Instructions ─────────────────────────────────────────
    // Collapse newlines to bullet-separated single line for compact display
    const stepsText = ex.steps.replace(/\n/g, ' · ')
    this.state.stepsWidget = createWidget(widget.TEXT, {
      x: px(40), y: px(260), w: px(SCREEN_W - 80), h: px(60),
      color: COLOR_STEPS, text_size: px(20),
      align_h: align.CENTER_H, align_v: align.TOP,
      text_style: text_style.WRAP, text: stepsText
    })

    // ─── Countdown timer (shadow + main) ─────────────────────
    // Shadow: same text, shifted 3px down-right, very dark orange
    this.state.timerShadowWidget = createWidget(widget.TEXT, {
      x: px(3), y: px(319), w: px(SCREEN_W), h: px(62),
      color: 0x331A00, text_size: px(58),
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.NONE, text: this.state.remainingSeconds + 's'
    })
    this.state.timerWidget = createWidget(widget.TEXT, {
      x: px(0), y: px(316), w: px(SCREEN_W), h: px(62),
      color: COLOR_TIMER, text_size: px(58),
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.NONE, text: this.state.remainingSeconds + 's'
    })

    // ─── Status message ───────────────────────────────────────
    this.state.statusWidget = createWidget(widget.TEXT, {
      x: px(0), y: px(380), w: px(SCREEN_W), h: px(22),
      color: COLOR_DIM, text_size: px(16),
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.NONE, text: 'Hold the stretch...'
    })

    // ─── Done button (border outer + dark inner + label) ──────
    createWidget(widget.FILL_RECT, {
      x: px(78), y: px(416), w: px(158), h: px(48), radius: px(24),
      color: 0x4CAF50,
    })
    createWidget(widget.FILL_RECT, {
      x: px(80), y: px(418), w: px(154), h: px(44), radius: px(22),
      color: COLOR_BTN_DONE,
    })
    const doneLabel = createWidget(widget.TEXT, {
      x: px(78), y: px(416), w: px(158), h: px(48),
      color: COLOR_WHITE, text_size: px(20),
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.NONE, text: '✓ DONE',
    })
    doneLabel.addEventListener(event.CLICK_UP, () => this.finishAndGoBack())

    // ─── Next button (border outer + dark inner + label) ──────
    createWidget(widget.FILL_RECT, {
      x: px(244), y: px(416), w: px(158), h: px(48), radius: px(24),
      color: 0x555555,
    })
    createWidget(widget.FILL_RECT, {
      x: px(246), y: px(418), w: px(154), h: px(44), radius: px(22),
      color: COLOR_BTN_SKIP,
    })
    const nextLabel = createWidget(widget.TEXT, {
      x: px(244), y: px(416), w: px(158), h: px(48),
      color: COLOR_WHITE, text_size: px(20),
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.NONE, text: '→ NEXT',
    })
    nextLabel.addEventListener(event.CLICK_UP, () => this.showNextExercise())

    this.startExerciseTimer()

    if (this.state.wasAlarmLaunch) {
      this.vibrateAlarm()
    }
  },

  startExerciseTimer() {
    if (this.state.timerId) clearInterval(this.state.timerId)
    this.state.isComplete = false

    this.state.timerId = setInterval(() => {
      this.state.remainingSeconds--

      if (this.state.remainingSeconds <= 0) {
        clearInterval(this.state.timerId)
        this.state.timerId = null
        this.state.isComplete = true
        this.state.timerWidget.setProperty(prop.MORE, { text: 'Done!', color: COLOR_COMPLETE })
        this.state.timerShadowWidget.setProperty(prop.MORE, { text: 'Done!' })
        this.state.statusWidget.setProperty(prop.MORE, { text: 'Great job! Tap Done or Next.', color: COLOR_COMPLETE })
        this.state.arcWidget.setProperty(prop.MORE, { end_angle: ARC_START + 1, color: COLOR_COMPLETE })
        this.vibrateCompletion()
        return
      }

      // Arc shrinks clockwise from the 4:30 end as time runs out
      const fraction = this.state.remainingSeconds / this.state.exercise.duration
      const arcEnd = ARC_START + Math.round(fraction * ARC_SPAN)
      this.state.arcWidget.setProperty(prop.MORE, { end_angle: arcEnd })

      const tickText = this.state.remainingSeconds + 's'
      this.state.timerWidget.setProperty(prop.MORE, { text: tickText })
      this.state.timerShadowWidget.setProperty(prop.MORE, { text: tickText })

      if (this.state.remainingSeconds <= 5) {
        this.state.timerWidget.setProperty(prop.MORE, { text: tickText, color: COLOR_COMPLETE })
        this.state.statusWidget.setProperty(prop.MORE, { text: 'Almost there!' })
      }
    }, 1000)
  },

  vibrateCompletion() {
    try {
      const vibrator = new Vibrator()
      vibrator.setMode(VIBRATOR_SCENE_DURATION)
      vibrator.start()
    } catch (e) {
      console.log('[Stretch] Vibrator error:', e.message)
    }
  },

  vibrateAlarm() {
    const pulse = () => {
      try {
        const v = new Vibrator()
        v.setMode(VIBRATOR_SCENE_SHORT)
        v.start()
      } catch (e) {
        console.log('[Stretch] Alarm vibrate error:', e.message)
      }
    }
    pulse()
    setTimeout(pulse, 500)
    setTimeout(pulse, 1000)
  },

  rescheduleAlarm() {
    const app = getApp()
    const gd = app._options.globalData
    const settings = gd.settings

    if (!settings || !settings.enabled) return

    try {
      const newId = gd.scheduleNextAlarm(settings)
      settings.alarmId = newId
      storage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.log('[Stretch] rescheduleAlarm error:', e.message)
    }
  },

  finishAndGoBack() {
    if (this.state.timerId) clearInterval(this.state.timerId)
    this.rescheduleAlarm()
    back()
  },

  showNextExercise() {
    if (this.state.timerId) clearInterval(this.state.timerId)
    this.rescheduleAlarm()

    const app = getApp()
    const exercises = app._options.globalData.exercises
    const lastIdx = this.state.exerciseIndex
    let newIdx
    do {
      newIdx = Math.floor(Math.random() * exercises.length)
    } while (newIdx === lastIdx && exercises.length > 1)

    app._options.globalData.lastExerciseIndex = newIdx
    this.state.exerciseIndex = newIdx
    this.state.exercise = exercises[newIdx]
    this.state.remainingSeconds = this.state.exercise.duration
    this.state.isComplete = false

    const ex = this.state.exercise
    const regionLabel = REGION_ICONS[ex.region] || ex.region.toUpperCase()
    const stepsText = ex.steps.replace(/\n/g, ' · ')

    this.state.regionWidget.setProperty(prop.MORE, { text: regionLabel })
    this.state.nameWidget.setProperty(prop.MORE,   { text: ex.name })
    this.state.imageWidget.setProperty(prop.MORE,  { src: EXERCISE_IMAGES[ex.name] || 'exercises/hip_flexor.png' })
    this.state.stepsWidget.setProperty(prop.MORE,  { text: stepsText })
    this.state.timerWidget.setProperty(prop.MORE,       { text: ex.duration + 's', color: COLOR_TIMER })
    this.state.timerShadowWidget.setProperty(prop.MORE, { text: ex.duration + 's' })
    this.state.statusWidget.setProperty(prop.MORE, { text: 'Hold the stretch...', color: COLOR_DIM })
    this.state.arcWidget.setProperty(prop.MORE,    { end_angle: ARC_START + ARC_SPAN, color: COLOR_ARC })

    this.startExerciseTimer()
  },

  onDestroy() {
    if (this.state.timerId) {
      clearInterval(this.state.timerId)
      this.state.timerId = null
    }
    console.log('[Stretch] Page destroyed')
  }
})
