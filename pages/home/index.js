/**
 * pages/home/index.js — Settings Page
 * =====================================
 * Minimalistic, no card borders. Scrollable (~550px total).
 * The first viewport shows all controls; Save/Stretch are one swipe down.
 *
 *   STRETCH REMINDER
 *
 *   ACTIVE DAYS
 *   ● S  ● M  ● T  ● W  ● T  ○ F  ○ S   (52 px circles)
 *
 *   START
 *   [  −  ]   09:00   [  +  ]            (72 px buttons)
 *
 *   END
 *   [  −  ]   17:00   [  +  ]
 *
 *   INTERVAL
 *   [  −  ]  45 min   [  +  ]
 *
 *   Next: Fri 11:00
 *   [  SAVE & START  ]
 *   [  Stretch Now   ]
 */

import { createWidget, widget, align, text_style, prop, event } from '@zos/ui'
import { px } from '@zos/utils'
import { push } from '@zos/router'
import { LocalStorage } from '@zos/storage'

const SCREEN_W   = 480
const storage    = new LocalStorage()

// ─── Colors ──────────────────────────────────────────────────
const COLOR_PRIMARY    = 0x4FC3F7   // cyan
const COLOR_WHITE      = 0xFFFFFF
const COLOR_LABEL      = 0x555555   // dim section headers
const COLOR_CTRL       = 0x1A2840   // dark navy — +/− buttons
const COLOR_CTRL_P     = 0x253D5E
const COLOR_CTRL_TXT   = 0x4FC3F7
const COLOR_DAY_ON     = 0x2E7D32
const COLOR_DAY_ON_P   = 0x388E3C
const COLOR_DAY_OFF    = 0x1E1E1E
const COLOR_DAY_OFF_P  = 0x2E2E2E
const COLOR_BTN_SAVE   = 0x1565C0
const COLOR_BTN_SAVE_P = 0x1976D2
const COLOR_BTN_STR    = 0x1B5E20
const COLOR_BTN_STR_P  = 0x388E3C
const COLOR_TEXT_DIM   = 0x777777

// DAY_LABELS: Sun=0 … Sat=6
const DAY_LABELS  = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const STORAGE_KEY = 'stretch_settings'

// ─── Layout constants ─────────────────────────────────────────
// Control row: [−] at x=LEFT_BTN, value centered, [+] at x=RIGHT_BTN
const LEFT_BTN  = 52
const RIGHT_BTN = 356   // 356+72 = 428 — safe at all y positions used
const BTN_W     = 72
const BTN_H     = 52
const BTN_R     = 12

Page({
  state: {
    days: [1, 2, 3, 4, 5],
    startHour: 9,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    intervalMinutes: 45,
    // widget refs
    dayBgs: [],
    startText: null,
    endText: null,
    intervalText: null,
    nextAlarmText: null,
  },

  onInit() {
    try {
      const saved = storage.getItem(STORAGE_KEY)
      if (saved) {
        const p = JSON.parse(saved)
        if (p.days)                this.state.days            = p.days
        if (p.startHour   != null) this.state.startHour      = p.startHour
        if (p.startMinute != null) this.state.startMinute    = p.startMinute
        if (p.endHour     != null) this.state.endHour        = p.endHour
        if (p.endMinute   != null) this.state.endMinute      = p.endMinute
        if (p.intervalMinutes)     this.state.intervalMinutes = p.intervalMinutes
      }
    } catch (e) {
      console.log('[Settings] Failed to load:', e.message)
    }
  },

  build() {
    const s = this.state

    // ─── Title ────────────────────────────────────────────────
    createWidget(widget.TEXT, {
      x: px(0), y: px(35), w: px(SCREEN_W), h: px(32),
      color: COLOR_PRIMARY, text_size: px(24),
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.NONE, text: 'STRETCH REMINDER'
    })

    // ─── Section: Active Days ─────────────────────────────────
    this.sectionLabel('ACTIVE DAYS', 80)

    // 52×52 circles — BTN=52, GAP=5 → totalW=394, startX=43
    // Use FILL_RECT + TEXT so color updates reliably via setProperty
    const BTN = 52, GAP = 5
    const dayStartX = Math.floor((SCREEN_W - (7 * BTN + 6 * GAP)) / 2)
    s.dayBgs = []
    for (let d = 0; d < 7; d++) {
      const on = s.days.includes(d)
      const xPos = dayStartX + d * (BTN + GAP)
      const bg = createWidget(widget.FILL_RECT, {
        x: px(xPos), y: px(102), w: px(BTN), h: px(BTN), radius: px(BTN / 2),
        color: on ? COLOR_DAY_ON : COLOR_DAY_OFF,
      })
      s.dayBgs.push(bg)
      // TEXT sits on top in Z-order and intercepts all taps — attach listener here
      const lbl = createWidget(widget.TEXT, {
        x: px(xPos), y: px(102), w: px(BTN), h: px(BTN),
        color: COLOR_WHITE, text_size: px(18),
        align_h: align.CENTER_H, align_v: align.CENTER_V,
        text_style: text_style.NONE, text: DAY_LABELS[d]
      })
      lbl.addEventListener(event.CLICK_UP, () => this.toggleDay(d))
    }

    // ─── Section: Start ───────────────────────────────────────
    this.sectionLabel('START', 166)
    this.ctrlRow(
      188,
      () => this.adjustStart(-30),
      () => this.adjustStart(+30),
    )
    s.startText = this.valueText(188, this.fmtTime(s.startHour, s.startMinute))

    // ─── Section: End ─────────────────────────────────────────
    this.sectionLabel('END', 252)
    this.ctrlRow(
      274,
      () => this.adjustEnd(-30),
      () => this.adjustEnd(+30),
    )
    s.endText = this.valueText(274, this.fmtTime(s.endHour, s.endMinute))

    // ─── Section: Interval ────────────────────────────────────
    this.sectionLabel('INTERVAL', 338)
    this.ctrlRow(
      360,
      () => this.adjustInterval(-5),
      () => this.adjustInterval(+5),
    )
    s.intervalText = this.valueText(360, s.intervalMinutes + ' min')

    // ─── Next alarm preview ───────────────────────────────────
    s.nextAlarmText = createWidget(widget.TEXT, {
      x: px(0), y: px(424), w: px(SCREEN_W), h: px(26),
      color: COLOR_TEXT_DIM, text_size: px(17),
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.NONE, text: this.computeNextLabel()
    })

    // ─── Save & Start ─────────────────────────────────────────
    createWidget(widget.BUTTON, {
      x: px(80), y: px(456), w: px(320), h: px(58), radius: px(29),
      normal_color: COLOR_BTN_SAVE, press_color: COLOR_BTN_SAVE_P,
      text: 'SAVE & START', text_size: px(22), color: COLOR_WHITE,
      click_func: () => this.saveAndStart()
    })

    // ─── Stretch Now ──────────────────────────────────────────
    createWidget(widget.BUTTON, {
      x: px(110), y: px(522), w: px(260), h: px(52), radius: px(26),
      normal_color: COLOR_BTN_STR, press_color: COLOR_BTN_STR_P,
      text: 'Stretch Now', text_size: px(21), color: COLOR_WHITE,
      click_func: () => this.goToStretch()
    })
  },

  // ─── Layout helpers ──────────────────────────────────────────

  sectionLabel(text, y) {
    createWidget(widget.TEXT, {
      x: px(0), y: px(y), w: px(SCREEN_W), h: px(20),
      color: COLOR_LABEL, text_size: px(14),
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.NONE, text
    })
  },

  // Draws the [−] and [+] buttons for a control row (value text added separately).
  ctrlRow(y, onMinus, onPlus) {
    createWidget(widget.BUTTON, {
      x: px(LEFT_BTN), y: px(y), w: px(BTN_W), h: px(BTN_H), radius: px(BTN_R),
      normal_color: COLOR_CTRL, press_color: COLOR_CTRL_P,
      text: '−', text_size: px(28), color: COLOR_CTRL_TXT,
      click_func: onMinus
    })
    createWidget(widget.BUTTON, {
      x: px(RIGHT_BTN), y: px(y), w: px(BTN_W), h: px(BTN_H), radius: px(BTN_R),
      normal_color: COLOR_CTRL, press_color: COLOR_CTRL_P,
      text: '+', text_size: px(28), color: COLOR_CTRL_TXT,
      click_func: onPlus
    })
  },

  // Creates the centred value TEXT widget and returns the ref.
  valueText(y, text) {
    return createWidget(widget.TEXT, {
      x: px(LEFT_BTN + BTN_W), y: px(y),
      w: px(RIGHT_BTN - LEFT_BTN - BTN_W), h: px(BTN_H),
      color: COLOR_WHITE, text_size: px(26),
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.NONE, text
    })
  },

  // ─── Interaction handlers ─────────────────────────────────────

  toggleDay(d) {
    const s = this.state
    const idx = s.days.indexOf(d)
    if (idx === -1) s.days.push(d)
    else            s.days.splice(idx, 1)
    const on = s.days.includes(d)
    s.dayBgs[d].setProperty(prop.MORE, {
      color: on ? COLOR_DAY_ON : COLOR_DAY_OFF,
    })
    this.refreshNextLabel()
  },

  // Shifts start time by ±30 min. Cannot cross end time.
  adjustStart(delta) {
    const s = this.state
    const newStart = s.startHour * 60 + s.startMinute + delta
    const maxStart = s.endHour   * 60 + s.endMinute   - 30
    if (newStart < 0 || newStart > maxStart) return
    s.startHour   = Math.floor(newStart / 60)
    s.startMinute = newStart % 60
    s.startText.setProperty(prop.MORE, { text: this.fmtTime(s.startHour, s.startMinute) })
    this.refreshNextLabel()
  },

  // Shifts end time by ±30 min. Cannot cross start time.
  adjustEnd(delta) {
    const s = this.state
    const newEnd = s.endHour * 60 + s.endMinute + delta
    const minEnd = s.startHour * 60 + s.startMinute + 30
    if (newEnd < minEnd || newEnd > 23 * 60 + 30) return
    s.endHour   = Math.floor(newEnd / 60)
    s.endMinute = newEnd % 60
    s.endText.setProperty(prop.MORE, { text: this.fmtTime(s.endHour, s.endMinute) })
    this.refreshNextLabel()
  },

  adjustInterval(delta) {
    const s = this.state
    const val = Math.min(120, Math.max(5, s.intervalMinutes + delta))
    s.intervalMinutes = val
    s.intervalText.setProperty(prop.MORE, { text: val + ' min' })
    this.refreshNextLabel()
  },

  refreshNextLabel() {
    this.state.nextAlarmText.setProperty(prop.MORE, {
      text: this.computeNextLabel(), color: COLOR_TEXT_DIM,
    })
  },

  computeNextLabel() {
    const s = this.state
    if (s.days.length === 0) return 'No days selected'
    const now = new Date()
    const endMinutes = s.endHour * 60 + s.endMinute
    let next = new Date(now.getTime() + s.intervalMinutes * 60 * 1000)
    if (next.getHours() * 60 + next.getMinutes() >= endMinutes) {
      next.setHours(s.startHour, s.startMinute, 0, 0)
      next.setDate(next.getDate() + 1)
    }
    for (let i = 0; i < 7; i++) {
      if (s.days.includes(next.getDay())) break
      next.setDate(next.getDate() + 1)
      next.setHours(s.startHour, s.startMinute, 0, 0)
    }
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return 'Next: ' + dayNames[next.getDay()] + ' ' + this.fmtTime(next.getHours(), next.getMinutes())
  },

  saveAndStart() {
    const s = this.state
    const settings = {
      days: s.days.slice(),
      startHour: s.startHour,
      startMinute: s.startMinute,
      endHour: s.endHour,
      endMinute: s.endMinute,
      intervalMinutes: s.intervalMinutes,
      enabled: true,
      alarmId: null,
    }
    try {
      const saved = storage.getItem(STORAGE_KEY)
      if (saved) settings.alarmId = JSON.parse(saved).alarmId || null
    } catch (e) { /* ignore */ }

    const app = getApp()
    const newId = app._options.globalData.scheduleNextAlarm(settings)
    settings.alarmId = newId
    storage.setItem(STORAGE_KEY, JSON.stringify(settings))
    app._options.globalData.settings = settings
    console.log('[Settings] Saved, alarm id:', newId)

    s.nextAlarmText.setProperty(prop.MORE, {
      text: '\u2713 Saved \u2014 ' + this.computeNextLabel().replace('Next: ', ''),
      color: 0x66BB6A,
    })
  },

  goToStretch() {
    const app = getApp()
    const exercises = app._options.globalData.exercises
    const lastIdx = app._options.globalData.lastExerciseIndex
    let newIdx
    do {
      newIdx = Math.floor(Math.random() * exercises.length)
    } while (newIdx === lastIdx && exercises.length > 1)
    app._options.globalData.lastExerciseIndex = newIdx
    push({ url: 'pages/stretch/index', params: JSON.stringify({ exerciseIndex: newIdx }) })
  },

  fmtTime(h, m) {
    return (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m)
  },

  onDestroy() {
    console.log('[Settings] Page destroyed')
  }
})
