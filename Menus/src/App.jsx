import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/* ================= spring physics =================
   Springs described by damping ratio + response, so every motion can be interrupted and reversed. */
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useSpring(target, { damping = 1, response = 0.3 } = {}) {
  const s = useRef({ x: target, v: 0 })
  const [, redraw] = useState(0)
  const raf = useRef()
  const cfg = useRef()
  cfg.current = { damping, response, target }
  const run = useCallback(() => {
    cancelAnimationFrame(raf.current)
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const { damping: d, response: r, target: t } = cfg.current
      const k = (2 * Math.PI / r) ** 2, c = (4 * Math.PI * d) / r
      const st = s.current
      const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n
      for (let i = 0; i < n; i++) { st.v += (-k * (st.x - t) - c * st.v) * h; st.x += st.v * h }
      const done = Math.abs(st.x - t) < 1e-3 && Math.abs(st.v) < 1e-2
      if (done) { st.x = t; st.v = 0 }
      redraw((x) => x + 1)
      if (!done) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [])
  useEffect(() => {
    if (reducedMotion()) { s.current.x = target; s.current.v = 0; redraw((x) => x + 1); return }
    run()
  }, [target, run])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return {
    value: s.current.x,
    snap(x) { cancelAnimationFrame(raf.current); s.current.x = x; s.current.v = 0 },
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ================= the menu system =================
   One row structure, every configuration:
   [left icon] label ............ [badge | shortcut | right icon | submenu chevron]
   Sections group rows, with an optional label. Both sets render this same structure;
   only the styling tokens and the commit moment differ. */
function Row({ item, active, pressed, parent, rowRef, m, level, i, gutter }) {
  return (
    <div
      ref={rowRef}
      role="menuitem"
      aria-disabled={item.disabled || undefined}
      aria-haspopup={item.sub ? 'menu' : undefined}
      aria-expanded={item.sub ? parent : undefined}
      className={`mi ${active ? 'is-hover' : ''} ${pressed ? 'is-press' : ''} ${parent ? 'is-parent' : ''} ${item.disabled ? 'is-off' : ''}`}
      onPointerEnter={(e) => m.enter(level, i, e)}
      onPointerDown={(e) => { e.stopPropagation(); m.enter(level, i, e, true); m.press(level, i) }}
      onPointerUp={() => m.choose(level, i)}
    >
      {(gutter || item.left !== undefined) && <span className="mi-left">{item.left}</span>}
      <span className="mi-label">{item.label}</span>
      {item.badge != null && <span className="mi-badge">{item.badge}</span>}
      {item.shortcut && <span className="mi-short">{item.shortcut}</span>}
      {item.right && <span className="mi-right">{item.right}</span>}
      {item.sub && <span className="mi-right mi-chev" aria-hidden="true"><Chevron /></span>}
    </div>
  )
}

const Chevron = () => <svg viewBox="0 0 8 12" width="8" height="12"><path d="M1.5 1.5 6.5 6l-5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>

function Panel({ sections, flat, open, active, pressed, parentOpen, commit, level, m, className, style, rowsRef }) {
  const rows = useRef([])
  if (rowsRef) rowsRef.current = rows.current
  const p = useSpring(open ? 1 : 0, m.cfg.open)
  const [box, setBox] = useState({ top: 0, h: 0 })
  const hl = useSpring(box.top, m.cfg.bar)
  const hSpring = useSpring(box.h, m.cfg.bar)
  const prev = useRef(-1)
  useLayoutEffect(() => {
    const el = rows.current[active]
    if (active >= 0 && el) {
      if (prev.current < 0) { hl.snap(el.offsetTop); hSpring.snap(el.offsetHeight) } // appears in place, then glides
      setBox({ top: el.offsetTop, h: el.offsetHeight })
    }
    prev.current = active
  }, [active, open]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!open && p.value < 0.005) return null
  let n = -1
  // one left gutter per panel: if any row has an icon, every label lines up after it
  const gutter = flat.some((it) => it.left !== undefined)
  return (
    <div className={`menu ${className} ${commit ? 'is-commit' : ''}`} role="menu" style={{ ...style, '--p': p.value, pointerEvents: open ? undefined : 'none' }}
      onPointerLeave={() => m.leave(level)}>
      <span aria-hidden="true" className={`mi-hl ${active >= 0 ? 'on' : ''} ${pressed >= 0 ? 'is-press' : ''} ${parentOpen ? 'is-parent' : ''}`}
        style={{ top: hl.value, height: hSpring.value }} />
      {sections.map((sec, si) => (
        <div className="m-sec" role="group" aria-label={sec.label} key={si}>
          {si > 0 && <div className="m-rule" />}
          {sec.label && <div className="m-label">{sec.label}</div>}
          {sec.items.map((item) => {
            n += 1
            const i = n
            return <Row key={item.id} item={item} i={i} level={level} m={m} gutter={gutter} active={active === i} pressed={pressed === i}
              parent={!!item.sub && parentOpen && active === i} rowRef={(el) => { rows.current[i] = el }} />
          })}
        </div>
      ))}
    </div>
  )
}

const flatten = (sections) => sections.flatMap((s) => s.items)

function Menu({ title, sections, cfg, auto, offset = 0, onOpenChange, stageRef }) {
  const flat = flatten(sections)
  const [open, setOpen] = useState(true)
  const [idx, setIdx] = useState(-1)
  const [subIdx, setSubIdx] = useState(-1)
  const [subOpen, setSubOpen] = useState(false)
  const [pressed, setPressed] = useState(null) // { level, i }
  const [commit, setCommit] = useState(null) // level
  const [subTop, setSubTop] = useState(0)
  const rootRows = useRef([])
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const lastSub = useRef(null)
  const timers = useRef({})
  const last = useRef({ x: 0, y: 0 })
  const busy = useRef(false)
  const viaKeys = useRef(false)

  const parent = idx >= 0 ? flat[idx] : null
  if (parent?.sub) lastSub.current = parent.sub
  const subSections = lastSub.current || []
  const subFlat = flatten(subSections)

  const clear = (k) => clearTimeout(timers.current[k])
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])
  useEffect(() => { onOpenChange?.(open) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const place = (i) => { const el = rootRows.current[i]; if (el) setSubTop(el.offsetTop) }
  const showSub = (i) => { place(i); setSubOpen(true); setSubIdx(-1) }

  const reset = () => { setIdx(-1); setSubIdx(-1); setSubOpen(false); setPressed(null); setCommit(null) }
  const close = () => { clear('sub'); setOpen(false); setSubOpen(false); setPressed(null); setCommit(null); setIdx(-1); setSubIdx(-1) }
  const openMenu = () => { reset(); setOpen(true) }

  // moving toward the open submenu: don't let a row crossed on the way steal it
  const aiming = (e) => {
    const sub = wrapRef.current?.querySelector('.menu-sub')
    if (!sub) return false
    const r = sub.getBoundingClientRect()
    const dx = e.clientX - last.current.x
    return dx > 0 && e.clientX < r.left + 2 && Math.abs(e.clientY - r.top - r.height / 2) < r.height
  }

  const m = {
    cfg,
    enter(level, i, e, now) {
      if (busy.current) return
      if (level === 1) { clear('sub'); setSubIdx(i); return }
      clear('sub')
      const apply = () => {
        setIdx(i); setSubIdx(-1)
        if (flat[i]?.sub) showSub(i)
        else setSubOpen(false)
      }
      if (!now && subOpen && aiming(e)) { timers.current.sub = setTimeout(apply, 240); return }
      if (now || !flat[i]?.sub) return apply()
      setIdx(i); setSubOpen(false)
      timers.current.sub = setTimeout(apply, 110) // short intent delay before opening
    },
    leave(level) {
      if (busy.current) return
      if (level === 1) setSubIdx(-1)
      else if (!subOpen) setIdx(-1)
      setPressed(null)
    },
    press(level, i) { viaKeys.current = false; if (!busy.current) setPressed({ level, i }) },
    choose(level, i) {
      if (busy.current) return
      const item = level === 0 ? flat[i] : subFlat[i]
      if (!item || item.disabled) { setPressed(null); return }
      if (item.sub) { setPressed(null); showSub(i); setIdx(i); return }
      busy.current = true
      setPressed({ level, i })
      setCommit(level)
      timers.current.commit = setTimeout(() => {
        busy.current = false
        item.run?.()
        close()
        if (viaKeys.current) triggerRef.current?.focus({ preventScroll: true })
      }, cfg.commitMs)
    },
  }

  /* keyboard */
  const nextOn = (list, from, dir) => {
    for (let k = 1; k <= list.length; k++) {
      const j = (from + dir * k + list.length * 2) % list.length
      if (!list[j].disabled) return j
    }
    return from
  }
  const onKeyDown = (e) => {
    if (!open) return
    viaKeys.current = true
    const inSub = subOpen && subIdx >= 0
    const list = inSub ? subFlat : flat
    const cur = inSub ? subIdx : idx
    const setCur = inSub ? setSubIdx : (v) => { setIdx(v); setSubOpen(false) }
    const stop = () => { e.preventDefault(); e.stopPropagation() }
    if (e.key === 'ArrowDown') { stop(); setCur(nextOn(list, cur < 0 ? -1 : cur, 1)) }
    else if (e.key === 'ArrowUp') { stop(); setCur(nextOn(list, cur < 0 ? 0 : cur, -1)) }
    else if (e.key === 'Home') { stop(); setCur(nextOn(list, -1, 1)) }
    else if (e.key === 'End') { stop(); setCur(nextOn(list, 0, -1)) }
    else if (e.key === 'ArrowRight' && !inSub && flat[idx]?.sub) { stop(); showSub(idx); setSubIdx(0) }
    else if (e.key === 'ArrowLeft' && inSub) { stop(); setSubIdx(-1); setSubOpen(false) }
    else if (e.key === 'Enter' || e.key === ' ') {
      stop()
      if (cur < 0) return
      if (!inSub && flat[idx]?.sub) { showSub(idx); setSubIdx(0) } else m.choose(inSub ? 1 : 0, cur)
    } else if (e.key === 'Escape') {
      stop()
      if (inSub) { setSubIdx(-1); setSubOpen(false) } else { close(); triggerRef.current?.focus() }
    }
  }

  /* click outside the menu, inside the scene */
  useEffect(() => {
    const stage = stageRef?.current
    if (!stage || auto) return
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) close() }
    stage.addEventListener('pointerdown', onDown)
    return () => stage.removeEventListener('pointerdown', onDown)
  }, [auto]) // eslint-disable-line react-hooks/exhaustive-deps

  /* wall: the menu operates itself */
  const latest = useRef()
  latest.current = { flat, m, setIdx, setSubIdx, showSub, setPressed, openMenu }
  useEffect(() => {
    if (!auto) return
    let stop = false
    ;(async () => {
      await sleep(300 + offset * 370)
      let n = offset
      while (!stop) {
        openLoop: {
          latest.current.openMenu()
          await sleep(600)
          const list = latest.current.flat
          const route = list.map((it, i) => ({ it, i })).filter((r) => !r.it.disabled)
          for (const { it, i } of route) {
            if (stop) break openLoop
            latest.current.setIdx(i); latest.current.setSubIdx(-1)
            if (it.sub) {
              latest.current.showSub(i)
              await sleep(520)
              const sub = flatten(it.sub)
              for (let j = 0; j < sub.length; j++) { if (stop) break openLoop; latest.current.setSubIdx(j); await sleep(360) }
              await sleep(200)
              latest.current.m.press(1, (n + 1) % sub.length); latest.current.setSubIdx((n + 1) % sub.length)
              await sleep(240)
              latest.current.m.choose(1, (n + 1) % sub.length)
              await sleep(cfg.commitMs + 900)
              n += 1
              break
            }
            await sleep(420)
          }
        }
      }
    })()
    return () => { stop = true }
  }, [auto]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => { if (open) close(); else openMenu() }

  return (
    <div className="menu-anchor">
      <button ref={triggerRef} type="button" className={`m-trigger ${open ? 'is-open' : ''}`} aria-haspopup="menu" aria-expanded={open}
        onPointerDown={(e) => { e.stopPropagation(); toggle() }}
        onClick={(e) => { if (e.detail === 0) { toggle(); requestAnimationFrame(() => wrapRef.current?.focus()) } }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) openMenu(); setIdx(nextOn(flat, -1, 1)); requestAnimationFrame(() => wrapRef.current?.focus()) } }}>
        {title}
      </button>
      <div ref={wrapRef} className="menu-wrap" tabIndex={-1} onKeyDown={onKeyDown}>
        <Panel sections={sections} flat={flat} open={open} level={0} m={m} className="menu-root" rowsRef={rootRows}
          active={idx} pressed={pressed?.level === 0 ? pressed.i : -1} commit={commit === 0} parentOpen={subOpen} />
        <Panel sections={subSections} flat={subFlat} open={open && subOpen} level={1} m={m} className="menu-sub"
          style={{ '--sub-top': `${subTop}px` }} active={subIdx} pressed={pressed?.level === 1 ? pressed.i : -1} commit={commit === 1} />
      </div>
    </div>
  )
}

/* ⌘ shortcuts work while the pointer or focus is inside this set */
function useShortcuts(ref, map, auto) {
  const latest = useRef(map)
  latest.current = map
  useEffect(() => {
    if (auto) return
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return
      const el = ref.current
      if (!el || !(el.matches(':hover') || el.contains(document.activeElement))) return
      const fn = latest.current[e.key.toLowerCase()]
      if (fn) { e.preventDefault(); fn() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [auto, ref])
}

/* ================= NOSTALGIC · Every Choice Inverts =================
   A 1-bit desk from 1984. One bar glides between rows and inverts everything it passes. */
const px = (rects, size = 16) => (
  <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
    {rects.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill="currentColor" />)}
  </svg>
)
const PX = {
  check: px([[3, 8, 2, 2], [5, 10, 2, 2], [7, 8, 2, 2], [9, 6, 2, 2], [11, 4, 2, 2]]),
  note: px([[3, 1, 10, 1], [3, 14, 10, 1], [3, 1, 1, 14], [12, 1, 1, 14], [5, 4, 6, 1], [5, 7, 6, 1], [5, 10, 4, 1]]),
  trash: px([[6, 1, 4, 1], [2, 3, 12, 1], [3, 5, 1, 10], [12, 5, 1, 10], [3, 14, 10, 1], [6, 6, 1, 7], [9, 6, 1, 7]]),
  sound: px([[2, 6, 3, 4], [5, 5, 1, 6], [6, 4, 1, 8], [7, 3, 1, 10], [10, 6, 1, 4], [12, 4, 1, 8]]),
  mute: px([[2, 6, 3, 4], [5, 5, 1, 6], [6, 4, 1, 8], [7, 3, 1, 10], [10, 6, 1, 1], [13, 6, 1, 1], [11, 7, 2, 2], [10, 9, 1, 1], [13, 9, 1, 1]]),
  disk: (
    <svg viewBox="0 0 32 32" width="48" height="48" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M3 9h26v15H3z" fill="#fff" stroke="#000" /><path d="M6 19h3v2H6zM24 12h2v2h-2z" fill="#000" />
    </svg>
  ),
  bigNote: (
    <svg viewBox="0 0 32 32" width="48" height="48" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M7 3h13l5 5v21H7z" fill="#fff" stroke="#000" /><path d="M20 3v5h5M10 13h12M10 17h12M10 21h8" fill="none" stroke="#000" />
    </svg>
  ),
  bigTrash: (full) => (
    <svg viewBox="0 0 32 32" width="48" height="48" shapeRendering="crispEdges" aria-hidden="true">
      {full && <path d="M10 2h5v5h-5zM17 1h5v6h-5z" fill="#fff" stroke="#000" />}
      <path d="M6 7h20v3H6zM8 10h16v20H8z" fill="#fff" stroke="#000" /><path d="M12 13v14M16 13v14M20 13v14" stroke="#000" />
    </svg>
  ),
}

const PATTERNS = ['Checker', 'Pinstripe', 'Bricks', 'Plain']
const SCATTER = { disk: [58, 15], note: [74, 54], trash: [88, 76] }
const TIDY = { disk: [90, 10], note: [90, 30], trash: [90, 80] }

function beep(muted, auto) {
  if (muted || auto) return
  try {
    const A = window.__ctx || (window.__ctx = new (window.AudioContext || window.webkitAudioContext)())
    const o = A.createOscillator(), g = A.createGain()
    o.type = 'square'; o.frequency.value = 880; g.gain.value = 0.025
    o.connect(g); g.connect(A.destination); o.start(); o.stop(A.currentTime + 0.07)
  } catch { /* no sound available */ }
}

const CLASSIC_CFG = { commitMs: 300, open: { damping: 1, response: 0.2 }, bar: { damping: 1, response: 0.16 } }

function Clock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 15000); return () => clearInterval(i) }, [])
  return <span className="dt-clock">{t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
}

function NostalgicSet({ auto, offset }) {
  const ref = useRef(null)
  const [pattern, setPattern] = useState(0)
  const [tidy, setTidy] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [trash, setTrash] = useState(3)
  const [muted, setMuted] = useState(false)
  const ding = () => beep(muted, auto)
  const toggleNote = () => { setNoteOpen((v) => !v); ding() }
  const tidyUp = () => { setTidy((v) => { if (v) setTrash(3); return !v }); ding() }

  useShortcuts(ref, { j: toggleNote, k: tidyUp }, auto)

  const sections = [
    { label: 'Desk', items: [
      { id: 'tidy', label: tidy ? 'Scatter Desk' : 'Clean Up Desk', shortcut: '⌘K', run: tidyUp },
      { id: 'note', label: 'Note Pad', left: PX.note, shortcut: '⌘J', run: toggleNote },
      { id: 'trash', label: 'Empty Trash', left: PX.trash, badge: trash || undefined, disabled: trash === 0, run: () => { setTrash(0); ding() } },
    ] },
    { items: [
      { id: 'sound', label: 'Sound', right: muted ? PX.mute : PX.sound, run: () => { setMuted((v) => !v); if (muted) beep(false, auto) } },
      { id: 'pattern', label: 'Desktop Pattern', sub: [{ items: PATTERNS.map((name, i) => ({
        id: name, label: name, left: pattern === i ? PX.check : <span className="mi-blank" />, run: () => { setPattern(i); ding() },
      })) }] },
    ] },
  ]

  const pos = tidy ? TIDY : SCATTER
  const icon = (k, glyph, name) => <div className={`dt-icon ${k === 'trash' && trash === 0 ? 'is-empty' : ''}`} style={{ left: `${pos[k][0]}%`, top: `${pos[k][1]}%` }}>{glyph}<span>{name}</span></div>

  return (
    <div className="monitor" ref={ref}>
      <div className="desk" data-auto={auto ? '' : undefined}>
        {PATTERNS.map((p, i) => <div key={p} className={`dt-pattern p-${p}`} style={{ opacity: pattern === i ? 1 : 0 }} />)}
        <div className="dt-bar">
          <span className="dt-mark" aria-hidden="true">{px([[7, 1, 2, 2], [3, 4, 10, 1], [2, 5, 12, 8], [4, 13, 8, 1]])}</span>
          <Menu title="Special" sections={sections} cfg={CLASSIC_CFG} auto={auto} offset={offset} stageRef={ref} />
          <Clock />
        </div>
        {icon('disk', PX.disk, 'Hard Disk')}
        {icon('note', PX.bigNote, 'Notes')}
        {icon('trash', PX.bigTrash(trash > 0), 'Trash')}
        <div className={`dt-note ${noteOpen ? 'on' : ''}`} aria-hidden={!noteOpen}>
          <div className="dt-note-bar"><i /><b>Note Pad</b></div>
          <p>Hold the button, drag down, let go. A menu was a gesture before it was a list.</p>
        </div>
      </div>
    </div>
  )
}

/* ================= LUXURIOUS · At Your Service =================
   A suite's concierge menu. Nothing is hurried: a gold hairline moves between rows and
   a press gilds the row. Each request is answered by the room itself. */
const li = (d) => (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
)
const LI = {
  curtain: li(['M3 3h14', 'M5 3c0 6 1 10 3 14', 'M15 3c0 6-1 10-3 14', 'M5 17h3M12 17h3']),
  lamp: li(['M10 2v4', 'M6 6h8l2 6H4z', 'M10 12v5', 'M7 17.5h6']),
  letter: li(['M3 5.5h14v10H3z', 'M3 6l7 5.5L17 6']),
  moon: li(['M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8z']),
  bell: li(['M4 14h12', 'M5 14a5 5 0 0 1 10 0', 'M10 9V7.5', 'M8.5 7h3', 'M3 16.5h14']),
  check: li(['M5 10.5l3.5 3.5L15 6.5']),
}

const LIGHT = ['Candlelight', 'Dusk', 'Daylight']
const LUX_CFG = { commitMs: 460, open: { damping: 1, response: 0.5 }, bar: { damping: 1, response: 0.38 } }

function LuxuriousSet({ auto, offset }) {
  const ref = useRef(null)
  const [curtains, setCurtains] = useState(false)
  const [light, setLight] = useState(0)
  const [dnd, setDnd] = useState(false)
  const [letters, setLetters] = useState(2)
  const [bottle, setBottle] = useState(false)
  const [note, setNote] = useState('Good evening.')
  const c = useSpring(curtains ? 1 : 0, { damping: 1, response: 1.1 })
  const b = useSpring(bottle ? 1 : 0, { damping: 0.8, response: 0.7 })

  const drawCurtains = () => { setCurtains((v) => { setNote(v ? 'The curtains are open.' : 'The curtains are drawn.'); return !v }) }
  const checkout = () => setNote('Departure is held until two.')
  useShortcuts(ref, { u: drawCurtains, i: checkout }, auto)

  const sections = [
    { label: 'The Suite', items: [
      { id: 'curtains', label: curtains ? 'Open the Curtains' : 'Draw the Curtains', left: LI.curtain, shortcut: '⌘U', run: drawCurtains },
      { id: 'light', label: 'Lighting', left: LI.lamp, sub: [{ items: LIGHT.map((name, i) => ({
        id: name, label: name, left: light === i ? LI.check : <span className="mi-blank" />, run: () => { setLight(i); setNote(`${name}, as you wish.`) },
      })) }] },
      { id: 'dnd', label: 'Do Not Disturb', right: dnd ? LI.moon : <span className="mi-ring" />, run: () => { setDnd((v) => { setNote(v ? 'The door is open to visitors.' : 'You will not be disturbed.'); return !v }) } },
    ] },
    { label: 'Service', items: [
      { id: 'bottle', label: bottle ? 'Clear the Champagne' : 'Champagne on Ice', run: () => { setBottle((v) => { setNote(v ? 'Cleared with thanks.' : 'On ice, at your table.'); return !v }) } },
      { id: 'letters', label: 'Correspondence', left: LI.letter, badge: letters || undefined, run: () => { setNote(letters ? 'Your letters have been read.' : 'Two letters have arrived.'); setLetters(letters ? 0 : 2) } },
      { id: 'late', label: 'Late Departure', left: LI.bell, shortcut: '⌘I', run: checkout },
    ] },
  ]

  return (
    <div className={`suite light-${light}`} ref={ref}>
      <svg className="room" viewBox="0 0 960 560" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="lx-sky0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b1020" /><stop offset="1" stopColor="#2a2238" /></linearGradient>
          <linearGradient id="lx-sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a3560" /><stop offset=".7" stopColor="#c0746a" /><stop offset="1" stopColor="#eab27e" /></linearGradient>
          <linearGradient id="lx-sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a9cde0" /><stop offset="1" stopColor="#f0e7d6" /></linearGradient>
          <linearGradient id="lx-drape" x1="0" y1="0" x2="1" y2="0" spreadMethod="repeat" gradientUnits="userSpaceOnUse" gradientTransform="scale(26 1)">
            <stop offset="0" stopColor="#3b2a1c" /><stop offset=".5" stopColor="#6b5033" /><stop offset="1" stopColor="#3b2a1c" />
          </linearGradient>
          <radialGradient id="lx-glow"><stop offset="0" stopColor="#ffd9a0" stopOpacity=".85" /><stop offset="1" stopColor="#ffd9a0" stopOpacity="0" /></radialGradient>
          <clipPath id="lx-arch"><path d="M544 470V210a150 150 0 0 1 300 0v260z" /></clipPath>
        </defs>
        <rect width="960" height="560" fill="#191410" />
        {/* wall panels */}
        <g fill="none" stroke="#d9c39a" strokeOpacity=".13">
          <rect x="30" y="40" width="470" height="420" /><rect x="880" y="40" width="60" height="420" />
        </g>
        {/* window */}
        <g clipPath="url(#lx-arch)">
          {[0, 1, 2].map((i) => <rect key={i} className="lx-sky" x="544" y="60" width="300" height="410" fill={`url(#lx-sky${i})`} style={{ opacity: light === i ? 1 : 0 }} />)}
          <g className="lx-city" fill="#0a0a10">
            <path d="M544 470V370h40v-40h34v60h36v-90h44v50h34v-30h46v60h66v90z" />
          </g>
          <g className="lx-lights" fill="#ffd38a" transform="translate(44 0)">
            {[[516, 400], [552, 350], [590, 410], [622, 330], [640, 372], [668, 390], [712, 382], [744, 412], [770, 430], [530, 440], [610, 446], [690, 440]].map(([x, y], i) => <rect key={i} x={x} y={y} width="4" height="5" />)}
          </g>
          <rect x="544" y="60" width={150 * c.value} height="410" fill="url(#lx-drape)" />
          <rect x={844 - 150 * c.value} y="60" width={150 * c.value} height="410" fill="url(#lx-drape)" />
        </g>
        <path d="M544 470V210a150 150 0 0 1 300 0v260z" fill="none" stroke="#d9c39a" strokeOpacity=".55" strokeWidth="2" />
        <path d="M694 60v410M544 280h300" stroke="#d9c39a" strokeOpacity=".3" />
        {/* floor + table */}
        <rect y="470" width="960" height="90" fill="#0f0c09" />
        <path d="M0 470h960" stroke="#d9c39a" strokeOpacity=".3" />
        <g transform="translate(70 0)">
          <ellipse cx="400" cy="434" rx="96" ry="10" fill="#2b2118" stroke="#d9c39a" strokeOpacity=".5" />
          <path d="M400 444v80M372 530h56" stroke="#d9c39a" strokeOpacity=".6" strokeWidth="2" fill="none" />
          {/* letters */}
          <g style={{ opacity: letters ? 1 : 0, transition: 'opacity .5s' }}>
            <path d="M326 426l50-5 6 8-50 5z" fill="#efe6d2" /><path d="M334 421l44-7 6 7-44 7z" fill="#d8ccb2" />
          </g>
          {/* champagne */}
          <g style={{ opacity: b.value, transform: `translateY(${(1 - b.value) * 18}px)` }}>
            <path d="M420 430h44l-6-26h-32z" fill="#b89c6b" />
            <path d="M437 406v-26l3-8v-16h6v16l3 8v26z" fill="#10241a" stroke="#d9c39a" strokeOpacity=".6" />
          </g>
        </g>
        {/* pendant */}
        <path d="M470 0v120" stroke="#d9c39a" strokeOpacity=".6" />
        <circle className="lx-halo" cx="470" cy="150" r="170" fill="url(#lx-glow)" />
        <path d="M438 150a32 32 0 0 1 64 0z" fill="#d9c39a" />
        {/* door sign */}
        <circle cx="910" cy="240" r="5" fill={dnd ? '#e05a4a' : '#3a2f24'} style={{ transition: 'fill .6s', filter: dnd ? 'drop-shadow(0 0 6px #e05a4a)' : 'none' }} />
        <rect x="888" y="226" width="44" height="28" rx="14" fill="none" stroke="#d9c39a" strokeOpacity=".4" />
      </svg>
      <div className="lx-veil" />
      <Menu title={<><span className="lx-mono" aria-hidden="true">C</span>Concierge</>} sections={sections} cfg={LUX_CFG} auto={auto} offset={offset} stageRef={ref} />
      <div className="lx-note" aria-live="polite"><span key={note}>{note}</span></div>
    </div>
  )
}

/* ================= page ================= */
const SETS = [
  { id: 'classic', tone: 'Nostalgic, Every Choice Inverts', Body: NostalgicSet },
  { id: 'lux', tone: 'Luxurious, At Your Service', Body: LuxuriousSet },
]

/* Figma drawing + spec thumbnail: the enlarged copy is drawn above the page, so no section clips it */
const DRAFT_VERSION = 'spec-1'
function DraftThumb({ set }) {
  const ref = useRef(null)
  const [box, setBox] = useState(null)
  const [open, setOpen] = useState(false)
  const src = `${import.meta.env.BASE_URL}final/${set.id}.png?v=${DRAFT_VERSION}`
  const show = () => {
    const im = ref.current.querySelector('img')
    const r = im.getBoundingClientRect()
    const W = Math.min(900, window.innerWidth - 32), H = W * (im.naturalHeight / im.naturalWidth || .7)
    const left = Math.min(Math.max(r.right - W, 16), window.innerWidth - W - 16)
    const top = Math.max(16, Math.min(r.top, window.innerHeight - H - 16))
    setBox({ left, top, W, s: r.width / W, ox: r.left - left, oy: r.top - top })
    requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)))
  }
  const hide = () => setOpen(false)
  useEffect(() => {
    if (!box) return
    window.addEventListener('scroll', hide, { passive: true })
    return () => window.removeEventListener('scroll', hide)
  }, [box])
  return (
    <>
      <div ref={ref} className="draft-ref" tabIndex={0} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
        <img src={src} alt={`${set.tone} — Figma drawing and spec`} loading="lazy" onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
        <span>Figma spec</span>
      </div>
      {box && createPortal(
        <img className="draft-zoom" src={src} alt="" aria-hidden="true" onTransitionEnd={() => { if (!open) setBox(null) }}
          style={{ left: box.left, top: box.top, width: box.W, transformOrigin: `${box.ox}px ${box.oy}px`, transform: open ? 'none' : `scale(${box.s})`, opacity: open ? 1 : 0 }} />,
        document.body)}
    </>
  )
}

/* wall (home page hover background): every set operating itself, repeated to fill the screen */
function Wall() {
  const embedded = window.parent !== window
  const [active, setActive] = useState(true)
  useEffect(() => {
    if (!embedded) return
    const onMessage = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data === 'wall:play') setActive(true)
      if (e.data === 'wall:pause') setActive(false)
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage('wall:ready', window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [embedded])
  const [layout] = useState(() => ({ cols: Math.max(1, Math.round(window.innerWidth / 620)), rows: Math.ceil(window.innerHeight / 480) + 1 }))
  return (
    <div className="wall" aria-hidden="true">
      {active && Array.from({ length: layout.cols }, (_, c) => (
        <div key={c} className="wall-col">
          {Array.from({ length: layout.rows }, (_, r) => {
            const set = SETS[(c + r) % SETS.length]
            return <div key={r} className={`wall-tile s-${set.id}`}><set.Body auto offset={c * 2 + r} /></div>
          })}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  if (new URLSearchParams(window.location.search).has('wall')) return <Wall />
  return (
    <main>
      <header className="page-head">
        <a className="back" href="../">← Advanced Interface</a>
        <h1>Menus</h1>
        <p>Week 6 · Advanced Interface</p>
      </header>
      {SETS.map((set) => (
        <section key={set.id} className={`set s-${set.id}`}>
          <div className="set-head">
            <h2>{set.tone}</h2>
            <DraftThumb set={set} />
          </div>
          <set.Body />
        </section>
      ))}
    </main>
  )
}
