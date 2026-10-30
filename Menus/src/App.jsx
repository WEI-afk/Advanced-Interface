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
    velocity: s.current.v,
    snap(x) { cancelAnimationFrame(raf.current); s.current.x = x; s.current.v = 0 },
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ================= the menu system =================
   One row structure, every configuration:
   [left icon] label ............ [badge | shortcut | right icon | submenu chevron]
   Sections group rows, with an optional label. Both sets render this same structure;
   only the styling tokens and the commit moment differ. */
function Row({ item, active, pressed, parent, rowRef, m, level, i, gutter, fx }) {
  return (
    <div
      ref={rowRef}
      style={fx}
      data-sfx={item.sfx}
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

// a row's top inside its panel, whatever intermediate containers exist
const topOf = (el) => {
  let y = 0, n = el
  while (n && !n.classList.contains('menu')) { y += n.offsetTop; n = n.offsetParent }
  return y
}

function Panel({ sections, flat, open, active, pressed, parentOpen, commit, level, m, className, style, rowsRef }) {
  const rows = useRef([])
  if (rowsRef) rowsRef.current = rows.current
  const p = useSpring(open ? 1 : 0, m.cfg.open)
  const [box, setBox] = useState({ top: 0, h: 0 })
  const hl = useSpring(box.top, m.cfg.bar)
  const hSpring = useSpring(box.h, m.cfg.bar)
  // how much the moving highlight is present, so rows can react to their distance from it
  const presence = useSpring(active >= 0 ? 1 : 0, { damping: 1, response: 0.28 })
  const prev = useRef(-1)
  useLayoutEffect(() => {
    const el = rows.current[active]
    if (active >= 0 && el) {
      if (prev.current < 0) { hl.snap(topOf(el)); hSpring.snap(el.offsetHeight) } // appears in place, then glides
      setBox({ top: topOf(el), h: el.offsetHeight })
    }
    prev.current = active
  }, [active, open]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!open && p.value < 0.005) return null
  let n = -1
  // one left gutter per panel: if any row has an icon, every label lines up after it
  const gutter = flat.some((it) => it.left !== undefined)
  const rowFx = (i) => {
    const el = rows.current[i]
    const d = el && hSpring.value > 1 ? (topOf(el) - hl.value) / hSpring.value : 9
    return { '--i': i, '--sgn': i % 2 ? 1 : -1, '--d': Math.max(-3, Math.min(3, d)).toFixed(3), '--near': (Math.max(0, 1 - Math.abs(d)) * presence.value).toFixed(3), '--pres': presence.value.toFixed(3) }
  }
  return (
    <div className={`menu ${className} ${commit ? 'is-commit' : ''}`} role="menu" style={{ ...style, '--p': p.value, '--v': Math.abs(hl.velocity).toFixed(0), pointerEvents: open ? undefined : 'none' }}
      onPointerLeave={() => m.leave(level)}>
      <span aria-hidden="true" className={`mi-hl ${active >= 0 ? 'on' : ''} ${pressed >= 0 ? 'is-press' : ''} ${parentOpen ? 'is-parent' : ''}`}
        style={{ top: hl.value, height: hSpring.value }} />
      {sections.map((sec, si) => (
        <div className="m-sec" role="group" aria-label={sec.label} key={si}>
          {si > 0 && <div className="m-rule" />}
          {sec.label && <div className="m-label" style={{ '--i': n + 1 }}>{sec.label}</div>}
          {sec.items.map((item) => {
            n += 1
            const i = n
            return <Row key={item.id} item={item} i={i} level={level} m={m} gutter={gutter} fx={rowFx(i)} active={active === i} pressed={pressed === i}
              parent={!!item.sub && parentOpen && active === i} rowRef={(el) => { rows.current[i] = el }} />
          })}
        </div>
      ))}
    </div>
  )
}

const flatten = (sections) => sections.flatMap((s) => s.items)

function Menu({ sections, cfg, auto, offset = 0, ctl, onActive }) {
  const flat = flatten(sections)
  const [open, setOpen] = useState(true)
  const [idx, setIdx] = useState(cfg.sticky ? 0 : -1)
  const [subIdx, setSubIdx] = useState(-1)
  const [subOpen, setSubOpen] = useState(false)
  const [pressed, setPressed] = useState(null) // { level, i }
  const [commit, setCommit] = useState(null) // level
  const [subTop, setSubTop] = useState(0)
  const rootRows = useRef([])
  const wrapRef = useRef(null)
  const lastSub = useRef(null)
  const timers = useRef({})
  const last = useRef({ x: 0, y: 0 })
  const busy = useRef(false)

  const parent = idx >= 0 ? flat[idx] : null
  if (parent?.sub) lastSub.current = parent.sub
  const subSections = lastSub.current || []
  const subFlat = flatten(subSections)

  const clear = (k) => clearTimeout(timers.current[k])
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  const place = (i) => { const el = rootRows.current[i]; if (el) setSubTop(topOf(el)) }
  const showSub = (i) => { place(i); setSubOpen(true); setSubIdx(-1) }

  const reset = () => { setIdx(cfg.sticky ? 0 : -1); setSubIdx(-1); setSubOpen(false); setPressed(null); setCommit(null); setOpen(true) }

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
      if (level === 1 && !cfg.sticky) setSubIdx(-1)
      else if (!subOpen && !cfg.sticky) setIdx(-1)
      setPressed(null)
    },
    press(level, i) { if (!busy.current) setPressed({ level, i }) },
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
        setPressed(null); setCommit(null) // the row stays hovered so the result can be seen
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
      if (inSub) { setSubIdx(-1); setSubOpen(false) } else reset()
    }
  }

  /* a device's physical buttons drive the same logic as the keyboard */
  const fake = (key) => onKeyDown({ key, preventDefault() {}, stopPropagation() {} })
  if (ctl) ctl.current = {
    key: fake,
    back: () => fake('Escape'),
    down() {
      const inSub = subOpen && subIdx >= 0
      if (!inSub && flat[idx]?.sub) { showSub(idx); setSubIdx(0); return }
      const cur = inSub ? subIdx : idx
      if (cur >= 0) m.press(inSub ? 1 : 0, cur)
    },
    up() { if (pressed) m.choose(pressed.level, pressed.i) },
    jump(id) { const i = flat.findIndex((it) => it.id === id); if (i >= 0) { setIdx(i); setSubOpen(false); m.press(0, i) } },
  }
  const activeItem = subOpen && subIdx >= 0 ? subFlat[subIdx] : flat[idx]
  const activeKey = activeItem?.id
  useEffect(() => { onActive?.(activeItem) }, [activeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ⌘ shortcuts press their row while the pointer or focus is on this menu */
  const shortcutRef = useRef()
  shortcutRef.current = { flat, m, setIdx, setSubOpen }
  useEffect(() => {
    if (auto) return
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return
      const el = wrapRef.current
      if (!el || !(el.matches(':hover') || el.contains(document.activeElement))) return
      const { flat: list, m: api, setIdx: si, setSubOpen: so } = shortcutRef.current
      const i = list.findIndex((it) => it.shortcut?.startsWith('⌘') && it.shortcut.slice(-1).toLowerCase() === e.key.toLowerCase())
      if (i < 0) return
      e.preventDefault()
      si(i); so(false); api.press(0, i)
      setTimeout(() => shortcutRef.current.m.choose(0, i), 90)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [auto]) // eslint-disable-line react-hooks/exhaustive-deps

  /* wall: the menu operates itself */
  const latest = useRef()
  latest.current = { flat, m, setIdx, setSubIdx, showSub, setPressed, reset }
  useEffect(() => {
    if (!auto) return
    let stop = false
    ;(async () => {
      await sleep(300 + offset * 370)
      let n = offset
      while (!stop) {
        openLoop: {
          latest.current.reset()
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
              await sleep(cfg.commitMs + 1100)
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

  return (
    <div ref={wrapRef} className={`menu-wrap ${commit != null ? 'is-impact' : ''} ${idx >= 0 ? 'has-hover' : ''} ${subOpen ? 'has-sub' : ''}`} tabIndex={0} aria-label="Menu" onKeyDown={onKeyDown}
      onFocus={(e) => { if (e.target.matches(':focus-visible') && idx < 0 && !auto) setIdx(nextOn(flat, -1, 1)) }}>
      <Panel sections={sections} flat={flat} open={open} level={0} m={m} className="menu-root" rowsRef={rootRows}
        active={flat[idx]?.disabled ? -1 : idx} pressed={pressed?.level === 0 ? pressed.i : -1} commit={commit === 0} parentOpen={subOpen} />
      <Panel sections={subSections} flat={subFlat} open={open && subOpen} level={1} m={m} className="menu-sub"
        style={{ '--sub-top': `${subTop}px` }} active={subFlat[subIdx]?.disabled ? -1 : subIdx} pressed={pressed?.level === 1 ? pressed.i : -1} commit={commit === 1} />
    </div>
  )
}

/* line icons */
const li = (d) => (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
)

/* arrows, Enter and Esc work while the pointer or focus is on the menu */
function useDevice(auto) {
  const ref = useRef(null)
  const ctl = useRef(null)
  const [held, setHeld] = useState('')
  const heldRef = useRef('')
  const press = (k) => {
    heldRef.current = k; setHeld(k)
    if (k === 'a') ctl.current?.down()
    else if (k.startsWith('row:')) ctl.current?.jump(k.slice(4))
    else if (k === 'b') ctl.current?.back()
    else ctl.current?.key(k)
  }
  const release = (k) => {
    if (heldRef.current !== k) return
    heldRef.current = ''; setHeld('')
    if (k === 'a' || k.startsWith('row:')) ctl.current?.up()
  }
  useEffect(() => {
    if (auto) return
    const map = { ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', Enter: 'a', ' ': 'a', Escape: 'b', Backspace: 'b' }
    const hot = () => ref.current?.matches(':hover') || ref.current?.contains(document.activeElement)
    const onDown = (e) => { const k = map[e.key]; if (!k || !hot() || e.metaKey || e.ctrlKey) return; e.preventDefault(); e.stopPropagation(); if (!e.repeat) press(k) }
    const onUp = (e) => { const k = map[e.key]; if (k) release(k) }
    window.addEventListener('keydown', onDown, true)
    window.addEventListener('keyup', onUp, true)
    return () => { window.removeEventListener('keydown', onDown, true); window.removeEventListener('keyup', onUp, true) }
  }, [auto]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ref, ctl }
}

/* ----- FUTURISTIC · Quick Access: no hardware, no panel. Each row is a small frame holding its icon, with the text outside it; one glowing ring snaps between the frames ----- */
const DECK_ICON = {
  home: li(['M3 9.500L10 3.500l7 6', 'M5 8.500V16.500h10V8.500', 'M8.500 16.500v-4.500h3v4.500']),
  globe: li(['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M3 10h14', 'M10 3c2 2 3 4.500 3 7s-1 5-3 7c-2-2-3-4.500-3-7s1-5 3-7z']),
  drop: li(['M10 2.500c3 3.500 5 6 5 8.500a5 5 0 0 1-10 0c0-2.500 2-5 5-8.500z']),
  lib: li(['M3 4h6v12H3z', 'M11 4h6v5h-6z', 'M11 11h6v5h-6z']),
  down: li(['M10 3v10', 'M6 9.500l4 4 4-4', 'M4 17h12']),
  wifi: li(['M2.500 8a11 11 0 0 1 15 0', 'M5.500 11a7 7 0 0 1 9 0', 'M8.500 14a2.500 2.500 0 0 1 3 0', 'M10 16.500v.100']),
  off: li(['M4 4l12 12', 'M5.500 11a7 7 0 0 1 3-1.700', 'M8.500 14a2.500 2.500 0 0 1 3 0']),
  check: li(['M5 10.500l3.500 3.500L15 6.500']),
}
const ACCENTS = [{ name: 'Signal Blue', c: '#1a9fff' }, { name: 'Violet', c: '#a06bff' }, { name: 'Mint', c: '#2fd6a6' }]
const DECK_CFG = { sticky: true, commitMs: 260, open: { damping: 0.9, response: 0.34 }, bar: { damping: 0.86, response: 0.2 } }

function DeckSet({ auto, offset }) {
  const d = useDevice(auto)
  const [accent, setAccent] = useState(0)
  const [wifi, setWifi] = useState(true)
  const [dl, setDl] = useState(2)
  const [home, setHome] = useState(false)
  const sections = [
    { label: 'Browse', items: [
      { id: 'home', label: home ? 'Back to Home' : 'Home', left: DECK_ICON.home, run: () => setHome((v) => !v) },
      { id: 'lib', label: 'Library', left: DECK_ICON.lib, shortcut: '⌘L' },
      { id: 'dl', label: 'Downloads', left: DECK_ICON.down, badge: dl || undefined, run: () => setDl(dl ? 0 : 2) },
    ] },
    { label: 'System', items: [
      { id: 'wifi', label: 'Wi-Fi', left: DECK_ICON.globe, right: wifi ? DECK_ICON.wifi : DECK_ICON.off, run: () => setWifi((v) => !v) },
      { id: 'accent', label: 'Accent Color', left: DECK_ICON.drop, sub: [{ items: ACCENTS.map((a, i) => ({ id: a.name, label: a.name, left: <i className="swatch" style={{ background: a.c }}>{accent === i && DECK_ICON.check}</i>, run: () => setAccent(i) })) }] },
    ] },
  ]
  return (
    <div className="stage" ref={d.ref} style={{ '--acc': ACCENTS[accent].c }}>
      <Menu sections={sections} cfg={DECK_CFG} auto={auto} offset={offset} ctl={d.ctl} />
    </div>
  )
}

/* ----- DRAMATIC · Full Turn: cards ride a semicircle on the left; whatever reaches the center takes over the screen ----- */
const RING_ICON = {
  sun: li(['M10 6.500a3.500 3.500 0 1 0 0 7 3.500 3.500 0 0 0 0-7z', 'M10 2v2M10 16v2M2 10h2M16 10h2M4.300 4.300l1.400 1.400M14.300 14.300l1.400 1.400M15.700 4.300l-1.400 1.400M5.700 14.300l-1.400 1.400']),
  dusk: li(['M4 14a6 6 0 0 1 12 0', 'M2 14h16', 'M6 17h8']),
  star: li(['M10 3l2 4.500 5 .500-3.700 3.300 1.100 5L10 13.700 5.600 16.300l1.100-5L3 8l5-.500z']),
  wave: li(['M2 8c2-2.500 4-2.500 6 0s4 2.500 6 0 2.500-2 4-1', 'M2 13c2-2.500 4-2.500 6 0s4 2.500 6 0 2.500-2 4-1']),
  still: li(['M3 10h14']),
  check: li(['M5 10.500l3.500 3.500L15 6.500']),
}
const WEATHER = ['Clear', 'Fog', 'Rain']
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 37.7) % 100, y: (i * 61.3) % 100, r: 1 + (i % 3) * 0.7 }))

const mod = (a, n) => ((a % n) + n) % n

function RingSet({ auto, offset = 0 }) {
  const holder = useRef(null)
  const stage = useRef(null)
  const [tide, setTide] = useState(true)
  const [wishes, setWishes] = useState(3)
  const [weather, setWeather] = useState(0)
  const [subFocus, setSubFocus] = useState(-1)

  const items = [
    { id: 'dawn', section: 'Day', label: 'Dawn', title: 'Dawn', line: 'The first light finds the edge of everything.' },
    { id: 'noon', label: 'Noon', left: RING_ICON.sun, shortcut: '⌘U', title: 'Noon', line: 'No shadows left to hide in.' },
    { id: 'tide', label: 'Tide', right: tide ? RING_ICON.wave : RING_ICON.still, title: 'Tide', line: tide ? 'It comes in. It goes out.' : 'The water holds its breath.', act: () => setTide((v) => !v) },
    { id: 'dusk', section: 'Night', label: 'Dusk', left: RING_ICON.dusk, shortcut: '⌘I', title: 'Dusk', line: 'Everything turns to silhouette.' },
    { id: 'stars', label: 'Stars', left: RING_ICON.star, badge: wishes, title: 'Stars', line: wishes ? `${wishes} wishes left. Press the card to spend one.` : 'Press the card to find three more.', act: () => setWishes((n) => (n > 0 ? n - 1 : 3)) },
    { id: 'weather', label: 'Weather', sub: WEATHER, title: WEATHER[weather], line: ['Nothing between you and the sky.', 'The horizon gives up.', 'It has been coming all day.'][weather] },
  ]
  const N = items.length

  // the wheel's position is continuous; whole numbers sit a card at the center
  const [target, setTarget] = useState(offset)
  const wheel = useSpring(target, { damping: 0.84, response: 0.52 })
  const active = mod(Math.round(target), N)
  const cur = items[active]

  // content wipes out from the card that was chosen
  const [layers, setLayers] = useState([{ i: mod(offset, N), key: 0 }])
  const seq = useRef(0)
  useEffect(() => {
    setLayers((v) => (v[v.length - 1].i === active ? v : [...v.slice(-1), { i: active, key: ++seq.current }]))
    setSubFocus(-1)
  }, [active])

  // full screen: the whole piece grows from its place on the page to the viewport
  const [full, setFull] = useState(false)
  const from = useRef(null)
  const grow = useSpring(full ? 1 : 0, { damping: 1, response: 0.6 })
  const g = grow.value
  const openFull = () => {
    if (auto || full) return
    from.current = holder.current.getBoundingClientRect()
    setFull(true)
  }
  useEffect(() => {
    if (!full) return
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    stage.current?.focus({ preventScroll: true })
    return () => { document.documentElement.style.overflow = prev }
  }, [full])

  // measure so the arc scales with whichever size it is showing at
  const [size, setSize] = useState({ W: 944, H: 620 })
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ W: e.contentRect.width, H: e.contentRect.height }))
    if (stage.current) ro.observe(stage.current)
    return () => ro.disconnect()
  }, [])
  const narrow = size.W < 640
  const k = Math.max(0.78, Math.min(1.5, size.H / 620))
  const cardW = (narrow ? 210 : 300) * k
  const cardH = 112 * k
  const xR = (narrow ? 150 : 360) * k
  const yR = 0.4 * size.H
  const cx = (narrow ? -70 : -60) * k
  const cy = size.H / 2
  const STEP = 36

  const spinTo = (i) => {
    let d = mod(i - target, N)
    if (d > N / 2) d -= N
    setTarget(Math.round(target + d))
  }

  /* pointer: drag rotates with momentum, a click selects */
  const drag = useRef(null)
  const [pressId, setPressId] = useState(null)
  const [hoverId, setHoverId] = useState(null)
  const onDown = (e, i) => {
    if (auto) return
    drag.current = { y: e.clientY, start: target, moved: false, i, lastY: e.clientY, lastT: performance.now(), v: 0 }
    setPressId(i)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d) return
    const dy = e.clientY - d.y
    if (Math.abs(dy) > 5) { d.moved = true; setPressId(null) }
    if (d.moved) setTarget(d.start - dy / (yR * 0.62))
    const now = performance.now()
    d.v = (e.clientY - d.lastY) / Math.max(1, now - d.lastT); d.lastY = e.clientY; d.lastT = now
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    setPressId(null)
    if (!d) return
    if (d.moved) { setTarget((t) => Math.round(t - d.v * 2.2)); return }
    const isCenter = mod(d.i, N) === active
    spinTo(d.i)
    if (!full) openFull()
    else if (isCenter) cur.act?.()
  }

  /* keyboard works while the pointer or focus is on it, or always when full screen */
  const latest = useRef()
  latest.current = { full, cur, subFocus, active, items }
  useEffect(() => {
    if (auto) return
    const onKey = (e) => {
      const { full: isFull, cur: c, subFocus: sf, items: list } = latest.current
      const el = stage.current
      if (!el || !(isFull || el.matches(':hover') || el.contains(document.activeElement))) return
      if (e.metaKey || e.ctrlKey) {
        const i = list.findIndex((it) => it.shortcut && it.shortcut.slice(-1).toLowerCase() === e.key.toLowerCase())
        if (i >= 0) { e.preventDefault(); spinToRef.current(i) }
        return
      }
      const stop = () => { e.preventDefault(); e.stopPropagation() }
      if (sf >= 0) {
        if (e.key === 'ArrowDown') { stop(); setSubFocus((v) => mod(v + 1, WEATHER.length)) }
        else if (e.key === 'ArrowUp') { stop(); setSubFocus((v) => mod(v - 1, WEATHER.length)) }
        else if (e.key === 'ArrowLeft' || e.key === 'Escape') { stop(); setSubFocus(-1) }
        else if (e.key === 'Enter' || e.key === ' ') { stop(); setWeather(sf) }
        return
      }
      if (e.key === 'ArrowDown') { stop(); setTarget((t) => Math.round(t) + 1) }
      else if (e.key === 'ArrowUp') { stop(); setTarget((t) => Math.round(t) - 1) }
      else if (e.key === 'ArrowRight' && c.sub) { stop(); setSubFocus(0) }
      else if (e.key === 'Enter' || e.key === ' ') { stop(); if (!isFull) openFullRef.current(); else if (c.sub) setSubFocus(0); else c.act?.() }
      else if (e.key === 'Escape' && isFull) { stop(); setFull(false) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [auto])
  const spinToRef = useRef(); spinToRef.current = spinTo
  const openFullRef = useRef(); openFullRef.current = openFull

  /* wall: it turns by itself */
  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => setTarget((v) => v + 1), 1900 + offset * 130)
    return () => clearInterval(t)
  }, [auto, offset])

  // draw the cards nearest the center, wrapping round the wheel
  const base = Math.round(wheel.value)
  const cards = []
  for (let n = -3; n <= 3; n++) {
    const slot = base + n
    const i = mod(slot, N)
    const off = slot - wheel.value
    const a = off * STEP * Math.PI / 180
    const near = Math.max(0, 1 - Math.abs(off))
    const it = items[i]
    const hovered = hoverId === slot && !near
    const scale = 0.78 + near * 0.22
    const x = cx + xR * Math.cos(a) + (hovered ? 16 : 0)
    const y = cy + yR * Math.sin(a) - (cardH / 2)
    const fade = Math.max(0, Math.min(1, 3 - Math.abs(off) * 1.05))
    cards.push(
      <div key={slot} role="menuitem" aria-current={near > 0.5 || undefined} aria-haspopup={it.sub ? 'menu' : undefined}
        className={`rc ${near > 0.5 ? 'is-on' : ''} ${pressId === slot ? 'is-press' : ''} ${hovered ? 'is-hover' : ''}`}
        style={{ width: cardW, height: cardH, opacity: fade, zIndex: 10 + Math.round(near * 10) - Math.abs(n),
          transform: `translate(${x}px, ${y}px) rotate(${off * 4}deg) scale(${scale * (pressId === slot ? 0.96 : 1)})`, '--near': near }}
        onPointerDown={(e) => onDown(e, slot)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onPointerEnter={() => setHoverId(slot)} onPointerLeave={() => setHoverId((v) => (v === slot ? null : v))}>
        {it.section && <span className="rc-sec">{it.section}</span>}
        {it.left && <span className="rc-left">{it.left}</span>}
        <span className="rc-label">{it.label}</span>
        {it.shortcut && <span className="rc-short">{it.shortcut}</span>}
        {it.badge != null && <span className="rc-badge">{it.badge}</span>}
        {it.right && <span className="rc-right">{it.right}</span>}
        {it.sub && <span className="rc-right"><Chevron /></span>}
      </div>,
    )
  }

  const layer = (l, top) => {
    const it = items[l.i]
    return (
      <div key={l.key} className={`ly ly-${it.id} w-${weather} ${top ? 'is-top' : ''}`}
        style={{ '--ox': `${cx + xR + cardW / 2}px`, '--oy': `${cy}px` }}>
        {it.id === 'stars' && STARS.map((s, n) => <i key={n} className="star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2, height: s.r * 2, animationDelay: `${(n % 7) * 0.4}s` }} />)}
        {it.id === 'tide' && <div className={`waves ${tide ? 'on' : ''}`}><i /><i /><i /></div>}
        {it.id === 'dawn' && <i className="orb o-dawn" />}
        {it.id === 'noon' && <i className="orb o-noon" />}
        {it.id === 'dusk' && <i className="orb o-dusk" />}
        {it.id === 'weather' && weather === 2 && <div className="rain" />}
        {it.id === 'weather' && weather === 1 && <div className="fog" />}
      </div>
    )
  }

  const r = from.current
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0
  const fixed = (full || g > 0.002) && r
  const box = fixed ? { position: 'fixed', zIndex: 900, left: r.left * (1 - g), top: r.top * (1 - g), width: r.width + (vw - r.width) * g, height: r.height + (vh - r.height) * g, borderRadius: 24 * (1 - g) } : {}

  return (
    <div className="ring-holder" ref={holder}>
      <div className="ring" ref={stage} tabIndex={0} role="menu" aria-label="Times of day" style={box}>
        {layers.map((l, n) => layer(l, n === layers.length - 1))}
        <div className="rw-copy" key={cur.id + cur.title}>
          <h3>{cur.title}</h3>
          <p>{cur.line}</p>
        </div>
        <div className="rw-arc" aria-hidden="true" style={{ left: cx + xR * 0.05, top: cy - yR * 1.1, width: xR * 2, height: yR * 2.2 }} />
        <div className="rw-cards">{cards}</div>
        <div className={`rw-sub ${cur.sub && !drag.current ? 'on' : ''}`} style={{ left: cx + xR + cardW + 18 * k, top: cy + 14 * k }}>
          {WEATHER.map((w, i) => (
            <button key={w} type="button" className={`rs ${weather === i ? 'is-sel' : ''} ${subFocus === i ? 'is-focus' : ''}`} tabIndex={-1}
              onClick={() => { setWeather(i); openFull() }}>
              <span className="rc-left">{weather === i && RING_ICON.check}</span>{w}
            </button>
          ))}
        </div>
        {g > 0.5 && <button type="button" className="rw-close" onClick={() => setFull(false)}>Close <kbd>Esc</kbd></button>}
      </div>
    </div>
  )
}

/* ================= page ================= */
const SETS = [
  { id: 'deck', tone: 'Futuristic, Quick Access', Body: DeckSet },
  { id: 'ring', tone: 'Dramatic, Full Turn', Body: RingSet },
]

/* Figma drawing + spec thumbnail: the enlarged copy is drawn above the page, so no section clips it */
const DRAFT_VERSION = 'spec-2'
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

/* wall (home page hover background): the menu operating itself, repeated to fill the screen */
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
  const [layout] = useState(() => ({ cols: Math.max(1, Math.round(window.innerWidth / 620)), rows: Math.ceil(window.innerHeight / 320) + 1 }))
  return (
    <div className="wall" aria-hidden="true">
      {active && Array.from({ length: layout.cols }, (_, c) => (
        <div key={c} className="wall-col">
          {Array.from({ length: layout.rows }, (_, r) => {
            const set = SETS[(c + r) % SETS.length]
            return <div key={r} className={`wall-tile s-${set.id}`}><div className={set.id === 'ring' ? '' : 'frame'}><set.Body auto offset={c * 2 + r} /></div></div>
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
          <div className={set.id === 'ring' ? '' : 'frame'}><set.Body /></div>
        </section>
      ))}
    </main>
  )
}
