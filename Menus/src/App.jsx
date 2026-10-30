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

function Menu({ sections, cfg, auto, offset = 0 }) {
  const flat = flatten(sections)
  // stays open by default; sets with cfg.returnMs close on a choice and come back, and enter when scrolled into view
  const [open, setOpen] = useState(!cfg.returnMs || !!auto)
  const [idx, setIdx] = useState(-1)
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

  const reset = () => { setIdx(-1); setSubIdx(-1); setSubOpen(false); setPressed(null); setCommit(null); setOpen(true) }
  useEffect(() => {
    if (!cfg.returnMs || auto || !wrapRef.current) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOpen(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(wrapRef.current)
    return () => io.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const rootSpring = useSpring(open ? 1 : 0, cfg.open)
  const subSpring = useSpring(open && subOpen ? 1 : 0, cfg.open)
  const [rootH, setRootH] = useState(0)
  useLayoutEffect(() => {
    if (!cfg.goo) return
    const el = wrapRef.current?.querySelector('.menu-root')
    if (el && rootSpring.value > 0.98 && el.offsetHeight !== rootH) setRootH(el.offsetHeight)
  })

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
        if (cfg.returnMs) {
          setOpen(false); setIdx(-1); setSubIdx(-1); setSubOpen(false)
          timers.current.back = setTimeout(() => setOpen(true), cfg.returnMs)
        }
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
      const i = list.findIndex((it) => it.shortcut && it.shortcut.slice(-1).toLowerCase() === e.key.toLowerCase())
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
              await sleep(cfg.commitMs + (cfg.returnMs || 0) + 1100)
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
    <div ref={wrapRef} className={`menu-wrap ${commit != null ? 'is-impact' : ''} ${idx >= 0 ? 'has-hover' : ''}`} tabIndex={0} aria-label="Menu" onKeyDown={onKeyDown}
      onFocus={(e) => { if (e.target.matches(':focus-visible') && idx < 0 && !auto) setIdx(nextOn(flat, -1, 1)) }}>
      {cfg.goo && (
        <div className="goo" aria-hidden="true" style={{ '--rp': rootSpring.value, '--sp': subSpring.value, '--root-h': `${rootH || 300}px`, '--sub-top': `${subTop}px`, '--sub-n': subFlat.length }}>
          <i className="g-root" /><i className="g-bud" /><i className="g-sub" />
        </div>
      )}
      <Panel sections={sections} flat={flat} open={open} level={0} m={m} className="menu-root" rowsRef={rootRows}
        active={flat[idx]?.disabled ? -1 : idx} pressed={pressed?.level === 0 ? pressed.i : -1} commit={commit === 0} parentOpen={subOpen} />
      <Panel sections={subSections} flat={subFlat} open={open && subOpen} level={1} m={m} className="menu-sub"
        style={{ '--sub-top': `${subTop}px` }} active={subIdx} pressed={pressed?.level === 1 ? pressed.i : -1} commit={commit === 1} />
    </div>
  )
}

/* ================= NOSTALGIC · Every Choice Inverts =================
   1-bit, 1984. One bar glides between rows and inverts everything it passes. */
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
}

const PATTERNS = ['Checker', 'Pinstripe', 'Bricks', 'Plain']
const CLASSIC_CFG = { commitMs: 300, open: { damping: 1, response: 0.2 }, bar: { damping: 1, response: 0.16 } }

function NostalgicSet({ auto, offset }) {
  const ref = useRef(null)
  const [pattern, setPattern] = useState(0)
  const [tidy, setTidy] = useState(false)
  const [trash, setTrash] = useState(3)
  const [muted, setMuted] = useState(false)
  const tidyUp = () => setTidy((v) => { if (v) setTrash(3); return !v })

  const sections = [
    { label: 'Desk', items: [
      { id: 'tidy', label: tidy ? 'Scatter Desk' : 'Clean Up Desk', shortcut: '⌘K', run: tidyUp },
      { id: 'note', label: 'Note Pad', left: PX.note, shortcut: '⌘J' },
      { id: 'trash', label: 'Empty Trash', left: PX.trash, badge: trash || undefined, disabled: trash === 0, run: () => setTrash(0) },
    ] },
    { items: [
      { id: 'sound', label: 'Sound', right: muted ? PX.mute : PX.sound, run: () => setMuted((v) => !v) },
      { id: 'pattern', label: 'Desktop Pattern', sub: [{ items: PATTERNS.map((name, i) => ({
        id: name, label: name, left: pattern === i ? PX.check : <span className="mi-blank" />, run: () => setPattern(i),
      })) }] },
    ] },
  ]

  return <div className="stage" ref={ref}><Menu sections={sections} cfg={CLASSIC_CFG} auto={auto} offset={offset} /></div>
}

/* ================= LUXURIOUS · At Your Service =================
   Nothing is hurried: a gold hairline moves between rows and a press gilds the row. */
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
  const drawCurtains = () => setCurtains((v) => !v)

  const sections = [
    { label: 'The Suite', items: [
      { id: 'curtains', label: curtains ? 'Open the Curtains' : 'Draw the Curtains', left: LI.curtain, shortcut: '⌘U', run: drawCurtains },
      { id: 'light', label: 'Lighting', left: LI.lamp, sub: [{ items: LIGHT.map((name, i) => ({
        id: name, label: name, left: light === i ? LI.check : <span className="mi-blank" />, run: () => setLight(i),
      })) }] },
      { id: 'dnd', label: 'Do Not Disturb', right: dnd ? LI.moon : <span className="mi-ring" />, run: () => setDnd((v) => !v) },
    ] },
    { label: 'Service', items: [
      { id: 'bottle', label: bottle ? 'Clear the Champagne' : 'Champagne on Ice', run: () => setBottle((v) => !v) },
      { id: 'letters', label: 'Correspondence', left: LI.letter, badge: letters || undefined, run: () => setLetters(letters ? 0 : 2) },
      { id: 'late', label: 'Late Departure', left: LI.bell, shortcut: '⌘I' },
    ] },
  ]

  return <div className="stage" ref={ref}><Menu sections={sections} cfg={LUX_CFG} auto={auto} offset={offset} /></div>
}

/* ================= ENERGETIC · Final Attack! =================
   A shonen battle command menu. Rows slam in, the shard snaps with overshoot, a press is an impact frame. */
const BOLD = {
  shield: li(['M10 2l7 3v5c0 4-3 6.5-7 8-4-1.5-7-4-7-8V5z']),
  potion: li(['M8 2h4', 'M8.5 2v5L4 15a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-4.5-8V2', 'M6 12h8']),
  eye: li(['M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z', 'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z']),
  closed: li(['M2 9s3 5 8 5 8-5 8-5', 'M5 13l-1.500 2M15 13l1.500 2M10 14v2.500']),
  check: li(['M4 10.500l4 4L16 5.500']),
}
const TECH = ['Flame Fang', 'Thunder Step', 'Void Slash']
const ANIME_CFG = { commitMs: 520, returnMs: 620, open: { damping: 0.82, response: 0.42 }, bar: { damping: 0.58, response: 0.24 } }

function AnimeSet({ auto, offset }) {
  const ref = useRef(null)
  const [tech, setTech] = useState(0)
  const [items, setItems] = useState(3)
  const [focus, setFocus] = useState(false)
  const sections = [
    { label: 'コマンド · Command', items: [
      { id: 'strike', label: 'Strike', shortcut: '⌘E', sfx: 'ドン!' },
      { id: 'guard', label: 'Guard', left: BOLD.shield, shortcut: '⌘G', sfx: 'ガキン!' },
      { id: 'items', label: 'Items', left: BOLD.potion, badge: items, sfx: 'シュッ!', run: () => setItems((n) => (n > 0 ? n - 1 : 3)) },
    ] },
    { label: '必殺 · Special', items: [
      { id: 'focus', label: 'Focus', right: focus ? BOLD.eye : BOLD.closed, sfx: 'ゴゴゴ', run: () => setFocus((v) => !v) },
      { id: 'tech', label: 'Technique', sub: [{ items: TECH.map((name, i) => ({
        id: name, label: name, sfx: 'ズバッ!', left: tech === i ? BOLD.check : <span className="mi-blank" />, run: () => setTech(i),
      })) }] },
    ] },
  ]
  return <div className="stage" ref={ref}><Menu sections={sections} cfg={ANIME_CFG} auto={auto} offset={offset} /></div>
}

/* ================= MYSTERIOUS · Ink Divides =================
   The menu is one body of ink. A paper bead stretches as it travels; the submenu buds off like a cell. */
const INK = {
  cards: li(['M4 4l7-1.500 3 12-7 1.500z', 'M14 5l3 1-3 11-4-1']),
  ear: li(['M6 8a4.500 4.500 0 1 1 8 3c-1.500 1.500-2 2-2 3.500a2.500 2.500 0 0 1-5 .500', 'M8.500 8a2 2 0 0 1 3.500 1']),
  lock: li(['M5 9h10v8H5z', 'M7 9V6.500a3 3 0 0 1 6 0V9']),
  open: li(['M5 9h10v8H5z', 'M7 9V6.500a3 3 0 0 1 5.800-1']),
  check: li(['M5 10.500l3.500 3.500L15 6.500']),
}
const FAMILIARS = ['Moth', 'Raven', 'Fox']
const INK_CFG = { goo: true, commitMs: 380, returnMs: 700, open: { damping: 0.74, response: 0.62 }, bar: { damping: 0.62, response: 0.42 } }

function InkSet({ auto, offset }) {
  const ref = useRef(null)
  const [lit, setLit] = useState(false)
  const [sealed, setSealed] = useState(true)
  const [whispers, setWhispers] = useState(7)
  const [fam, setFam] = useState(0)
  const sections = [
    { label: 'The Ritual', items: [
      { id: 'candle', label: lit ? 'Snuff the Candle' : 'Light the Candle', run: () => setLit((v) => !v) },
      { id: 'cards', label: 'Read the Cards', left: INK.cards, shortcut: '⌘E' },
      { id: 'whisper', label: 'Whispers', left: INK.ear, badge: whispers || undefined, run: () => setWhispers(whispers ? 0 : 7) },
    ] },
    { label: 'The Door', items: [
      { id: 'seal', label: sealed ? 'Unseal the Door' : 'Seal the Door', right: sealed ? INK.lock : INK.open, run: () => setSealed((v) => !v) },
      { id: 'summon', label: 'Summon', sub: [{ items: FAMILIARS.map((name, i) => ({
        id: name, label: name, left: fam === i ? INK.check : <span className="mi-blank" />, run: () => setFam(i),
      })) }] },
    ] },
  ]
  return (
    <div className="stage" ref={ref}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="ink-goo" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="9" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" />
        </filter>
      </svg>
      <Menu sections={sections} cfg={INK_CFG} auto={auto} offset={offset} />
    </div>
  )
}

/* ================= SERENE · Paper Unfolds =================
   A strip of folded washi. Every row is a fold: it opens in 3D, tilts in a wave around the pointer, creases when pressed. */
const WASHI = {
  leaf: li(['M4 16C4 8 9 4 17 3c0 8-4 13-11 13', 'M4 16l7-7']),
  cup: li(['M4 8h10v4a5 5 0 0 1-10 0z', 'M14 9h1.500a2 2 0 0 1 0 4H14', 'M7 2.500c-1 1.500 1 2 0 3.500M10.500 2.500c-1 1.500 1 2 0 3.500']),
  hush: li(['M15.500 12.500A6.500 6.500 0 0 1 7.500 4.500a6.500 6.500 0 1 0 8 8z']),
  sound: li(['M3 10c1.500-3 3-3 4.500 0s3 3 4.500 0 3-3 4.500 0']),
  check: li(['M5 10.500l3.500 3.500L15 6.500']),
}
const SEASONS = ['Spring', 'Rain', 'Snow']
const WASHI_CFG = { commitMs: 420, returnMs: 900, open: { damping: 1, response: 0.95 }, bar: { damping: 1, response: 0.5 } }

function WashiSet({ auto, offset }) {
  const ref = useRef(null)
  const [boiled, setBoiled] = useState(false)
  const [cups, setCups] = useState(2)
  const [quiet, setQuiet] = useState(false)
  const [season, setSeason] = useState(1)
  const sections = [
    { label: 'Tea', items: [
      { id: 'boil', label: boiled ? 'Let the Water Rest' : 'Boil the Water', run: () => setBoiled((v) => !v) },
      { id: 'steep', label: 'Steep Sencha', left: WASHI.leaf, shortcut: '⌘E' },
      { id: 'cups', label: 'Pour', left: WASHI.cup, badge: cups, run: () => setCups((n) => (n > 0 ? n - 1 : 2)) },
    ] },
    { label: 'The Room', items: [
      { id: 'quiet', label: 'Quiet', right: quiet ? WASHI.hush : WASHI.sound, run: () => setQuiet((v) => !v) },
      { id: 'season', label: 'Season', sub: [{ items: SEASONS.map((name, i) => ({
        id: name, label: name, left: season === i ? WASHI.check : <span className="mi-blank" />, run: () => setSeason(i),
      })) }] },
    ] },
  ]
  return <div className="stage" ref={ref}><Menu sections={sections} cfg={WASHI_CFG} auto={auto} offset={offset} /></div>
}

/* ================= page ================= */
const SETS = [
  { id: 'classic', tone: 'Nostalgic, Every Choice Inverts', Body: NostalgicSet },
  { id: 'lux', tone: 'Luxurious, At Your Service', Body: LuxuriousSet },
  { id: 'anime', tone: 'Energetic, Final Attack!', Body: AnimeSet },
  { id: 'ink', tone: 'Mysterious, Ink Divides', Body: InkSet },
  { id: 'washi', tone: 'Serene, Paper Unfolds', Body: WashiSet },
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
  const [layout] = useState(() => ({ cols: Math.max(1, Math.round(window.innerWidth / 620)), rows: Math.ceil(window.innerHeight / 320) + 1 }))
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
