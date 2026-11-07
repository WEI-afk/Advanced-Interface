import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const mod = (a, n) => ((a % n) + n) % n
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* ================= the toolbar system =================
   One bar, three groups: start, center, end. The groups spread across the bar, or all pack to the left, the center or the right.
   Every button is the same structure: [icon] [label], either one optional. */
const li = (d, w = 1) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d.map((p, i) => <path key={i} d={p} />)}</svg>
)
const IC = {
  back: ['M12 4.500L6.500 10l5.500 5.500'], search: ['M9 3.500a5.500 5.500 0 1 0 0 11 5.500 5.500 0 0 0 0-11z', 'M13 13l4 4'], filter: ['M3 5h14', 'M6 10h8', 'M8.500 15h3'],
  prev: ['M14 5v10l-7-5z', 'M5 5v10'], next: ['M6 5v10l7-5z', 'M15 5v10'], play: ['M6.500 4.500v11l9-5.500z'], pause: ['M7 4.500v11', 'M13 4.500v11'],
  list: ['M7 5h10', 'M7 10h10', 'M7 15h10', 'M3.500 5h.010', 'M3.500 10h.010', 'M3.500 15h.010'], cc: ['M3 5h14v10H3z', 'M8.500 8.500a2 2 0 1 0 0 3', 'M14 8.500a2 2 0 1 0 0 3'],
  vol: ['M3 8v4h3l4 3V5L6 8z', 'M13 7.500a3.500 3.500 0 0 1 0 5', 'M15 5.500a6.500 6.500 0 0 1 0 9'], mute: ['M3 8v4h3l4 3V5L6 8z', 'M13 8l4 4', 'M17 8l-4 4'],
  edit: ['M4 16l3-.500 9-9-2.500-2.500-9 9z', 'M12 5l2.500 2.500'], share: ['M10 3v10', 'M6.500 6.500L10 3l3.500 3.500', 'M4.500 11v5.500h11V11'], trash: ['M4 6h12', 'M8 6V4h4v2', 'M5.500 6l1 10h7l1-10'],
  heart: ['M10 16s-6-3.500-6-8a3.200 3.200 0 0 1 6-1.500A3.200 3.200 0 0 1 16 8c0 4.500-6 8-6 8z'], undo: ['M7.500 11.500L4 8l3.500-3.500', 'M4 8h8.500a4 4 0 0 1 0 8H10'], redo: ['M12.500 11.500L16 8l-3.500-3.500', 'M16 8H7.500a4 4 0 0 0 0 8H10'],
  bold: ['M6 4h5a3 3 0 0 1 0 6H6z', 'M6 10h6a3 3 0 0 1 0 6H6z'], italic: ['M9 4h6', 'M5 16h6', 'M12 4l-4 12'], link: ['M8.500 11.500a3 3 0 0 0 4.200 0l2.500-2.500a3 3 0 0 0-4.200-4.200l-.800.800', 'M11.500 8.500a3 3 0 0 0-4.200 0L4.800 11a3 3 0 0 0 4.200 4.200l.800-.800'],
  arrow: ['M4 10h12', 'M11 5l5 5-5 5'], plus: ['M10 4v12', 'M4 10h12'], rows: ['M4 5h12', 'M4 10h12', 'M4 15h12'], chev: ['M6 8l4 4 4-4'],
}
const GRID_FILLED = (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 4.500A1.500 1.500 0 0 1 4.500 3h3A1.500 1.500 0 0 1 9 4.500v3A1.500 1.500 0 0 1 7.500 9h-3A1.500 1.500 0 0 1 3 7.500zM11 4.500A1.500 1.500 0 0 1 12.500 3h3A1.500 1.500 0 0 1 17 4.500v3A1.500 1.500 0 0 1 15.500 9h-3A1.500 1.500 0 0 1 11 7.500zM3 12.500A1.500 1.500 0 0 1 4.500 11h3A1.500 1.500 0 0 1 9 12.500v3A1.500 1.500 0 0 1 7.500 17h-3A1.500 1.500 0 0 1 3 15.500zM11 12.500a1.500 1.500 0 0 1 1.500-1.500h3a1.500 1.500 0 0 1 1.500 1.500v3a1.500 1.500 0 0 1-1.500 1.500h-3a1.500 1.500 0 0 1-1.500-1.500z" /></svg>
)
const ALIGN = ['Spread', 'Left', 'Center', 'Right']

// measure where an element sits inside its bar, so one marker (ring or recess) can glide to it
function useMarker(barRef, selector, deps) {
  const [box, setBox] = useState(null)
  const measure = () => {
    const bar = barRef.current
    const el = bar && selector && bar.querySelector(selector)
    if (!el) { setBox(null); return }
    // layout geometry, not the painted box: a pressed button is scaled down, and the marker must not shrink with it
    let x = 0, y = 0, n = el
    while (n && n !== bar) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent }
    if (n !== bar) { const a = el.getBoundingClientRect(), b = bar.getBoundingClientRect(); x = a.left - b.left; y = a.top - b.top }
    setBox({ x, y, w: el.offsetWidth, h: el.offsetHeight })
  }
  useLayoutEffect(measure, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // groups can change width (labels hide, text changes) without the bar changing size, so watch them too
    const ro = new ResizeObserver(measure)
    if (barRef.current) { ro.observe(barRef.current); barRef.current.querySelectorAll('.tb-group').forEach((c) => ro.observe(c)) }
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return box
}

function useNarrow(ref, at = 640) {
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => { if (ref.current) setNarrow(ref.current.offsetWidth < at) }, [at]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < at))
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [at]) // eslint-disable-line react-hooks/exhaustive-deps
  return narrow
}

// changing the alignment moves whole groups: slide them from where they visibly were, so the bar never jumps
function useGroupSlide(barRef, key) {
  const from = useRef(null)
  const capture = () => {
    const bar = barRef.current
    if (!bar) return
    const b = bar.getBoundingClientRect().left
    from.current = [...bar.querySelectorAll('.tb-group')].map((g) => g.getBoundingClientRect().left - b)
  }
  useLayoutEffect(() => {
    const bar = barRef.current, prev = from.current
    from.current = null
    if (!bar || !prev || reduced()) return
    const b = bar.getBoundingClientRect().left
    const groups = [...bar.querySelectorAll('.tb-group')]
    if (groups.length !== prev.length) return
    groups.forEach((g) => g.getAnimations().forEach((a) => a.cancel()))
    groups.forEach((g, i) => {
      const dx = prev[i] - (g.getBoundingClientRect().left - b)
      if (Math.abs(dx) > 0.5) g.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(0.2, 0, 0, 1)' })
    })
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return capture
}

// a short message that replaces the status line for a moment, then lets it return
function useNote() {
  const [note, setNote] = useState(null)
  const timer = useRef()
  const say = (text) => { clearTimeout(timer.current); setNote(text); timer.current = setTimeout(() => setNote(null), 1400) }
  useEffect(() => () => clearTimeout(timer.current), [])
  return [note, say]
}

/* example switchers: outside the toolbar, plain text */
function Switch({ label, items, value, onChange }) {
  return (
    <div className="sw" role="radiogroup" aria-label={label}>
      <span className="sw-k">{label}</span>
      {items.map((it, i) => <button key={it} type="button" role="radio" aria-checked={i === value} className={i === value ? 'on' : ''} onClick={() => onChange(i)}>{it}</button>)}
    </div>
  )
}

/* ----- FUTURISTIC · Couch Mode: the toolbar of a living-room screen, read from three meters away and driven by a controller.
   One ring holds the focus; the D-pad walks it along the bar, A presses, B goes back, LB / RB switch to the next example ----- */
const COUCH = ['Library', 'Player', 'Capture']
const SHELF = { all: ['All', 10], inst: ['Installed', 4], fav: ['Favorites', 3] }
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function CouchSet({ auto, offset = 0 }) {
  const stage = useRef(null)
  const barRef = useRef(null)
  const narrow = useNarrow(stage)
  const [si, setSi] = useState(offset % 3)
  const [al, setAl] = useState(0)
  const [focus, setFocus] = useState(1)
  const [down, setDown] = useState(null)
  const [note, say] = useNote()
  const [shelf, setShelf] = useState('all')
  const [sort, setSort] = useState(false)
  const [play, setPlay] = useState({ on: false, t: 0.42, ep: 4, cc: false, mute: false })
  const [cap, setCap] = useState({ n: 3, total: 24, fav: false, edit: false, shared: false })
  const slide = useGroupSlide(barRef, al)

  const groups = [
    [[{ id: 'back', i: 'back', opt: true }],
      [{ id: 'all', t: 'All', excl: true, sel: shelf === 'all' }, { id: 'inst', t: 'Installed', excl: true, sel: shelf === 'inst' }, { id: 'fav', t: 'Favorites', excl: true, sel: shelf === 'fav' }],
      [{ id: 'sort', i: 'filter', t: 'Sort', lab: true, sel: sort }, { id: 'search', i: 'search', opt: true }]],
    [[{ id: 'eps', i: 'list', t: 'Episodes', lab: true }],
      [{ id: 'prev', i: 'prev' }, { id: 'play', i: play.on ? 'pause' : 'play' }, { id: 'next', i: 'next' }],
      [{ id: 'cc', i: 'cc', t: 'Subtitles', lab: true, sel: play.cc }, { id: 'vol', i: play.mute ? 'mute' : 'vol', opt: true }]],
    [[{ id: 'back', i: 'back' }],
      [{ id: 'edit', i: 'edit', t: cap.edit ? 'Done' : 'Edit', lab: true, sel: cap.edit }, { id: 'share', i: 'share', t: cap.shared ? 'Shared' : 'Share', lab: true }, { id: 'trash', i: 'trash', t: 'Delete', lab: true }],
      [{ id: 'fav', i: 'heart', sel: cap.fav }]],
  ][si].map((g) => g.filter((b) => !(narrow && b.opt)))
  const flat = groups.flat()
  const f = Math.min(focus, flat.length - 1)

  const go = (d) => { setSi((v) => mod(v + d, 3)); setFocus(narrow ? 0 : 1); setDown(null) }
  const press = (b) => {
    if (!b) return
    const id = b.id
    if (si === 0) {
      if (SHELF[id]) setShelf(id)
      else if (id === 'sort') setSort((v) => !v)
      else if (id === 'back') say('Back to Home')
      else if (id === 'search') say('Search opened')
    }
    if (si === 1) {
      if (id === 'play') setPlay((p) => ({ ...p, on: !p.on }))
      else if (id === 'prev') setPlay((p) => ({ ...p, ep: Math.max(1, p.ep - 1), t: 0 }))
      else if (id === 'next') setPlay((p) => ({ ...p, ep: p.ep + 1, t: 0 }))
      else if (id === 'cc') setPlay((p) => ({ ...p, cc: !p.cc }))
      else if (id === 'vol') setPlay((p) => ({ ...p, mute: !p.mute }))
      else if (id === 'eps') say('Episode list opened')
    }
    if (si === 2) {
      if (id === 'back') say('Back to Album')
      else if (id === 'edit') setCap((c) => ({ ...c, edit: !c.edit }))
      else if (id === 'share') { setCap((c) => ({ ...c, shared: true })); setTimeout(() => setCap((c) => ({ ...c, shared: false })), 1400) }
      else if (id === 'trash') setCap((c) => ({ ...c, total: Math.max(1, c.total - 1), n: Math.min(c.n, c.total - 1) }))
      else if (id === 'fav') setCap((c) => ({ ...c, fav: !c.fav }))
    }
  }

  // playing moves the time on
  useEffect(() => {
    if (!play.on) return
    const t = setInterval(() => setPlay((p) => ({ ...p, t: p.t >= 1 ? 0 : p.t + 0.002 })), 100)
    return () => clearInterval(t)
  }, [play.on])

  /* input: keys while the pointer or focus is on the example, and a real controller any time */
  const latest = useRef()
  latest.current = { flat, f, press, go }
  const input = (k, isDown) => {
    const L = latest.current
    if (!isDown) { if (k === 'a') { setDown(null); L.press(L.flat[L.f]) } return }
    if (k === 'left') setFocus(mod(L.f - 1, L.flat.length))
    else if (k === 'right') setFocus(mod(L.f + 1, L.flat.length))
    else if (k === 'a') setDown(L.flat[L.f]?.id)
    else if (k === 'b') { const back = L.flat.findIndex((x) => x.id === 'back'); if (back >= 0) { setFocus(back); L.press(L.flat[back]) } }
    else if (k === 'lb') L.go(-1)
    else if (k === 'rb') L.go(1)
  }
  const inputRef = useRef(); inputRef.current = input
  useEffect(() => {
    if (auto) return
    const map = { ArrowLeft: 'left', ArrowRight: 'right', Enter: 'a', ' ': 'a', Escape: 'b', Backspace: 'b', q: 'lb', e: 'rb' }
    const hot = () => stage.current?.matches(':hover') || stage.current?.contains(document.activeElement)
    const kd = (e) => { const k = map[e.key]; if (!k || !hot() || e.metaKey || e.ctrlKey || e.target.closest?.('.sw')) return; e.preventDefault(); if (!e.repeat || k === 'left' || k === 'right') inputRef.current(k, true) }
    const ku = (e) => { const k = map[e.key]; if (k) inputRef.current(k, false) }
    window.addEventListener('keydown', kd, true)
    window.addEventListener('keyup', ku, true)
    // a real controller: buttons and the stick drive the same input, and directions repeat while held
    const BTN = { 0: 'a', 1: 'b', 4: 'lb', 5: 'rb', 14: 'left', 15: 'right' }
    const was = {}, rep = {}
    let raf
    const loop = (now) => {
      const g = navigator.getGamepads && [...navigator.getGamepads()].find(Boolean)
      if (g && !document.hidden) {
        const dn = {}
        for (const [i, k] of Object.entries(BTN)) if (g.buttons[i]?.pressed) dn[k] = true
        if ((g.axes[0] || 0) < -0.55) dn.left = true
        if ((g.axes[0] || 0) > 0.55) dn.right = true
        for (const k of new Set([...Object.keys(dn), ...Object.keys(was)])) {
          if (dn[k] && !was[k]) { inputRef.current(k, true); rep[k] = now + 380 }
          else if (!dn[k] && was[k]) inputRef.current(k, false)
          else if (dn[k] && (k === 'left' || k === 'right') && now > rep[k]) { inputRef.current(k, true); rep[k] = now + 130 }
        }
        Object.keys(was).forEach((k) => delete was[k]); Object.assign(was, dn)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true); cancelAnimationFrame(raf) }
  }, [auto])

  /* wall: it drives itself */
  useEffect(() => {
    if (!auto) return
    let k = 0
    const t = setInterval(() => { k++; const step = k % 6; if (step === 5) inputRef.current('rb', true); else if (step === 3) { inputRef.current('a', true); setTimeout(() => inputRef.current('a', false), 140) } else inputRef.current('right', true) }, 800)
    return () => clearInterval(t)
  }, [auto])

  const fid = flat[f]?.id
  const ring = useMarker(barRef, fid ? `[data-id="${fid}"] .cm-target` : null, [fid, si, al, narrow, play.on, play.mute, cap.edit, cap.shared, sort])
  const sel = useMarker(barRef, si === 0 ? `[data-id="${shelf}"] .cm-target` : null, [shelf, si, al, narrow, sort])

  const status = note || [
    `${SHELF[shelf][0]} · ${SHELF[shelf][1]} games${sort ? ' · sorted A–Z' : ''}`,
    `Episode ${play.ep} · ${play.on ? 'playing' : 'paused'} ${clock(play.t * 2650)} / 44:10${play.cc ? ' · subtitles on' : ''}${play.mute ? ' · muted' : ''}`,
    `Photo ${cap.n} of ${cap.total}${cap.fav ? ' · favorite' : ''}${cap.edit ? ' · editing' : ''}${cap.shared ? ' · shared' : ''}`,
  ][si]

  return (
    <div className="ex">
      {!auto && (
        <div className="ex-controls">
          <Switch label="Example" items={COUCH} value={si} onChange={(i) => { setSi(i); setFocus(narrow ? 0 : 1); setDown(null) }} />
          <Switch label="Alignment" items={ALIGN} value={al} onChange={(i) => { slide(); setAl(i) }} />
        </div>
      )}
      <div className="ex-stage" ref={stage} tabIndex={auto ? -1 : 0} aria-label="Couch Mode toolbar. Arrow keys move, Enter presses, Escape goes back, Q and E switch example.">
        <div className={`tb cm-bar al-${al}`} ref={barRef} role="toolbar" aria-label={`${COUCH[si]} toolbar`}>
          {sel && <i key={`sel${si}`} className="cm-sel" aria-hidden="true" style={{ transform: `translate(${sel.x}px, ${sel.y}px)`, width: sel.w, height: sel.h }} />}
          {ring && <i className={`cm-ring ${down === fid ? 'is-press' : ''}`} aria-hidden="true" style={{ transform: `translate(${ring.x}px, ${ring.y}px)`, width: ring.w, height: ring.h }} />}
          <div className="cm-groups" key={si}>
            {groups.map((g, gi) => (
              <div key={gi} className="tb-group">
                {g.map((b) => {
                  const idx = flat.indexOf(b)
                  return (
                    <button key={b.id} type="button" tabIndex={-1} data-id={b.id} aria-label={b.t ? undefined : b.id} aria-pressed={b.sel != null ? !!b.sel : undefined}
                      className={`tb-btn cm-btn ${idx === f ? 'is-focus' : ''} ${b.sel ? 'is-sel' : ''} ${b.excl ? 'is-excl' : ''} ${down === b.id ? 'is-press' : ''}`}
                      onPointerEnter={() => !auto && setFocus(idx)} onPointerDown={() => { if (!auto) { setFocus(idx); setDown(b.id) } }} onPointerUp={() => setDown(null)} onPointerLeave={() => setDown(null)}
                      onClick={() => { if (!auto) { setFocus(idx); press(b) } }}>
                      {b.i ? <span className="cm-frame cm-target">{li(IC[b.i])}</span> : <span className="cm-target cm-textframe">{b.t}</span>}
                      {b.i && b.t && <span className={`tb-label ${b.lab ? 'opt' : ''}`}>{b.t}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        {!auto && <p className="tb-status" aria-live="polite">{status}</p>}
      </div>
    </div>
  )
}

/* ----- ELEGANT · Clear: a floating glass tool bar for a design canvas. At rest it is one circle holding the current tool.
   Pressing it opens the bar out of that point into the full tool set; the circle's icon turns into close. Search finds any tool or action ----- */
const TOOLS = {
  move: { name: 'Move', key: 'V', d: ['M5.500 3.500l9.500 5.800-4.300 1.200-2 4.500z'] },
  frame: { name: 'Frame', key: 'F', d: ['M7 3v14', 'M13 3v14', 'M3 7h14', 'M3 13h14'] },
  rect: { name: 'Rectangle', key: 'R', d: ['M4 5h12v10H4z'] },
  ellipse: { name: 'Ellipse', key: 'O', d: ['M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12z'] },
  pen: { name: 'Pen', key: 'P', d: ['M10 3l4.500 6.500L10 17l-4.500-7.500z', 'M10 10v.010'] },
  text: { name: 'Text', key: 'T', d: ['M4.500 5.500V4h11v1.500', 'M10 4v12', 'M7.500 16h5'] },
  comment: { name: 'Comment', key: 'C', d: ['M4 16V5.500A2.500 2.500 0 0 1 6.500 3h7A2.500 2.500 0 0 1 16 5.500v5a2.500 2.500 0 0 1-2.500 2.500H7z'] },
}
const FX_IC = {
  close: ['M5.500 5.500l9 9', 'M14.500 5.500l-9 9'], fit: ['M3 7V3h4', 'M13 3h4v4', 'M17 13v4h-4', 'M7 17H3v-4'],
  zoom: ['M9 3.500a5.500 5.500 0 1 0 0 11 5.500 5.500 0 0 0 0-11z', 'M13 13l4 4', 'M9 6.500v5', 'M6.500 9h5'], dup: ['M7 7h10v10H7z', 'M13 7V3H3v10h4'],
}
const ACTIONS = [
  ...Object.entries(TOOLS).map(([id, t]) => ({ id, name: t.name, key: t.key, d: t.d, tool: true })),
  { id: 'fit', name: 'Zoom to fit', key: '⇧1', d: FX_IC.fit },
  { id: 'z100', name: 'Zoom to 100%', key: '⇧0', d: FX_IC.zoom },
  { id: 'export', name: 'Export', key: '⇧⌘E', d: IC.share },
  { id: 'dup', name: 'Duplicate', key: '⌘D', d: FX_IC.dup },
]
const SUGGEST = ['ellipse', 'fit']
const ZOOMS = ['50%', '100%', '200%', 'Fit']
const ANCHOR = ['Left', 'Center', 'Right']

function ClearSet({ auto, offset = 0 }) {
  const stage = useRef(null)
  const rowRef = useRef(null)
  const bodyRef = useRef(null)
  const inputRef = useRef(null)
  const narrow = useNarrow(stage)
  const [anchor, setAnchor] = useState(2)
  const [open, setOpen] = useState(!!auto && offset % 2 === 0)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [tool, setTool] = useState('move')
  const [shape, setShape] = useState('rect')
  const [z, setZ] = useState(1)
  const [hot, setHot] = useState(null)
  const [note, say] = useNote()
  const [bodyW, setBodyW] = useState(0)
  const [rowW, setRowW] = useState(720)

  const q = query.trim().toLowerCase()
  const results = (q ? ACTIONS.filter((a) => a.name.toLowerCase().includes(q)) : SUGGEST.map((id) => ACTIONS.find((a) => a.id === id))).slice(0, narrow ? 1 : 2)

  const run = (a) => {
    if (!a) return
    if (a.tool) { if (a.id === 'rect' || a.id === 'ellipse') setShape(a.id); setTool(a.id) }
    else if (a.id === 'fit') setZ(3)
    else if (a.id === 'z100') setZ(1)
    else if (a.id === 'export') say('Exported 2 frames')
    else if (a.id === 'dup') say('Duplicated selection')
    setSearching(false); setQuery('')
  }
  const pickTool = (id) => { if (id === 'rect' || id === 'ellipse') setShape(id); setTool(id) }
  const toggle = () => { setOpen((v) => !v); setSearching(false); setQuery('') }
  const startSearch = () => { setOpen(true); setSearching(true) }
  const press = (id) => {
    if (TOOLS[id]) pickTool(id)
    else if (id === 'zoom') setZ((v) => (v + 1) % ZOOMS.length)
    else if (id === 'search') startSearch()
    else if (id === 'share') say('Share link copied')
    else if (id === 'exit') { setSearching(false); setQuery('') }
  }

  // the search field takes the keyboard as soon as it appears; stepping back hands focus to the control that opened it
  const was = useRef({ searching, open })
  useEffect(() => {
    const prev = was.current
    was.current = { searching, open }
    if (auto) return
    const lost = !stage.current?.contains(document.activeElement)
    if (searching) inputRef.current?.focus({ preventScroll: true })
    else if (prev.searching && open && lost) stage.current?.querySelector('[data-id="search"]')?.focus({ preventScroll: true })
    else if (prev.open && !open && (lost || bodyRef.current?.contains(document.activeElement))) stage.current?.querySelector('.fx-handle')?.focus({ preventScroll: true })
  }, [searching, open, auto])

  /* keys while the pointer or focus is on the example: tool letters, / or ⌘K to search, Esc to step back */
  const latest = useRef()
  latest.current = { open, searching, results, run, pickTool, startSearch }
  useEffect(() => {
    if (auto) return
    const onKey = (e) => {
      const el = stage.current
      if (!el || !(el.matches(':hover') || el.contains(document.activeElement))) return
      const L = latest.current
      const inField = e.target === inputRef.current
      if (e.key === 'Escape') {
        if (L.searching) { e.preventDefault(); setSearching(false); setQuery('') }
        else if (L.open) { e.preventDefault(); setOpen(false) }
        return
      }
      if (inField) { if (e.key === 'Enter') { e.preventDefault(); L.run(L.results[0]) } return }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); L.startSearch(); return }
      if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('.sw')) return
      if (e.key === '/') { e.preventDefault(); L.startSearch(); return }
      const t = Object.entries(TOOLS).find(([, v]) => v.key.toLowerCase() === e.key.toLowerCase())
      if (t) { e.preventDefault(); L.pickTool(t[0]) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [auto])

  /* wall: it runs itself */
  useEffect(() => {
    if (!auto) return
    let k = offset
    const script = ['open', 'frame', 'text', 'pen', 'search', 'el', 'run', 'close']
    const t = setInterval(() => {
      const L = latest.current
      const step = script[k++ % script.length]
      if (step === 'open') setOpen(true)
      else if (step === 'close') { setOpen(false); setSearching(false); setQuery('') }
      else if (step === 'search') L.startSearch()
      else if (step === 'el') setQuery('el')
      else if (step === 'run') L.run(L.results[0])
      else { setHot(step); L.pickTool(step) }
    }, 1000)
    return () => clearInterval(t)
  }, [auto, offset])

  // the bar is exactly as wide as what it holds, so it can grow out of the circle and back
  const PAD = narrow ? 6 : 8, H = narrow ? 58 : 64, GAP = narrow ? 4 : 12, HANDLE = narrow ? 44 : 48
  useLayoutEffect(() => {
    if (bodyRef.current) setBodyW(bodyRef.current.offsetWidth)
    if (rowRef.current) setRowW(rowRef.current.offsetWidth)
  }, [open, searching, query, tool, shape, z, narrow, results.length])
  useEffect(() => {
    const ro = new ResizeObserver(() => { if (bodyRef.current) setBodyW(bodyRef.current.offsetWidth); if (rowRef.current) setRowW(rowRef.current.offsetWidth) })
    if (bodyRef.current) ro.observe(bodyRef.current)
    if (rowRef.current) ro.observe(rowRef.current)
    return () => ro.disconnect()
  }, [])
  const width = open ? Math.min(rowW, PAD * 2 + bodyW + GAP + HANDLE) : H

  const shapeSlot = shape
  const groups = searching ? null : [
    ['move', 'frame', shapeSlot, 'pen', 'text', 'comment'].map((id) => ({ id, d: TOOLS[id].d, excl: true, sel: tool === id, opt: id === 'pen' || id === 'comment' || id === shapeSlot, title: `${TOOLS[id].name} (${TOOLS[id].key})` })),
    [{ id: 'zoom', t: ZOOMS[z], opt: true }],
    [{ id: 'search', d: IC.search, t: 'Search', lab: true }, { id: 'share', t: 'Share', prim: true }],
  ].map((g) => g.filter((b) => !(narrow && b.opt)))
  const pill = useMarker(bodyRef, !searching && open ? `[data-id="${tool}"]` : null, [tool, shape, searching, open, narrow])

  const btn = (b) => (
    <button key={b.id} type="button" data-id={b.id} title={b.title} aria-label={b.t ? undefined : (b.title || b.id)} aria-current={b.excl && b.sel ? 'true' : undefined}
      className={`tb-btn cl-btn ${b.t ? 'has-label' : ''} ${b.prim ? 'is-prim' : ''} ${b.excl && b.sel ? 'is-excl' : ''} ${hot === b.id ? 'is-hot' : ''}`}
      onClick={() => press(b.id)}>
      {b.d && <span className="tb-ic">{li(b.d, 2)}</span>}
      {b.t && <span className={`tb-label ${b.lab ? 'opt' : ''}`}>{b.t}</span>}
    </button>
  )
  const handle = (
    <button type="button" className={`tb-btn cl-btn fx-handle ${open ? 'is-open' : ''}`} aria-expanded={open} aria-controls={`fx-body-${offset}`}
      aria-label={open ? 'Close tools' : `Open tools, ${TOOLS[tool].name} selected`} title={open ? 'Close (Esc)' : 'Open tools'} onClick={toggle}>
      <span className="tb-ic fx-a">{li(TOOLS[tool].d, 2)}</span>
      <span className="tb-ic fx-b">{li(FX_IC.close, 2)}</span>
    </button>
  )
  const status = note || (searching
    ? (results.length ? `Search · Enter runs “${results[0].name}”` : 'Search · no match')
    : open ? `${TOOLS[tool].name} tool · zoom ${ZOOMS[z]}` : `Collapsed · ${TOOLS[tool].name} tool`)

  return (
    <div className="ex">
      {!auto && (
        <div className="ex-controls">
          <Switch label="Alignment" items={ANCHOR} value={anchor} onChange={setAnchor} />
        </div>
      )}
      <div className="ex-stage fx-stage" ref={stage}>
        <div className={`fx-row at-${anchor}`} ref={rowRef}>
          <div className={`tb cl-bar fx ${open ? 'open' : ''}`} role="toolbar" aria-label="Design tools" style={{ width, height: H }}>
            {anchor === 0 && handle}
            <div className="fx-body" id={`fx-body-${offset}`} ref={bodyRef} inert={open ? undefined : ''}>
              {pill && <i key={`pill${searching}`} className="cl-pill" aria-hidden="true" style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h }} />}
              {searching ? (
                <div className="fx-mode" key="search">
                  {!narrow && <div className="tb-group">{btn({ id: 'exit', d: IC.back, title: 'Exit search (Esc)' })}</div>}
                  <label className="fx-field">
                    <span className="tb-ic">{li(IC.search, 2)}</span>
                    <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={narrow ? 'Search' : 'Search tools'} aria-label="Search tools and actions" spellCheck={false} />
                  </label>
                  <div className="tb-group">
                    {results.map((a, i) => (
                      <button key={a.id} type="button" className={`tb-btn cl-btn has-label ${i === 0 ? 'is-hot' : ''}`} onClick={() => run(a)}>
                        <span className="tb-ic">{li(a.d, 2)}</span><span className="tb-label">{a.name}</span>{!narrow && <span className="fx-key">{a.key}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="fx-mode" key="tools">
                  {groups.map((g, gi) => <div key={gi} className="tb-group">{g.map(btn)}</div>)}
                </div>
              )}
            </div>
            {anchor !== 0 && handle}
          </div>
        </div>
        {!auto && <p className="tb-status" aria-live="polite">{status}</p>}
      </div>
    </div>
  )
}

/* ================= static samples: the same parts, frozen in one configuration or state ================= */
function Sample({ label, children }) {
  return (
    <figure className="sample">
      <figcaption>{label}</figcaption>
      <div className="sample-body" inert="" aria-hidden="true">{children}</div>
    </figure>
  )
}

function CouchStatic({ groups, align = 0, hug }) {
  return (
    <div className={`tb cm-bar al-${align} ${hug ? 'hug' : ''}`}>
      {groups.map((g, gi) => (
        <div key={gi} className="tb-group">
          {g.map((b, bi) => (
            <span key={bi} className={`tb-btn cm-btn ${b.st ? 'is-focus st-' + b.st : ''} ${b.st === 'press' ? 'is-press' : ''} ${b.sel ? 'is-sel st-sel' : ''}`}>
              {b.i ? <span className="cm-frame cm-target">{li(IC[b.i])}</span> : <span className="cm-target cm-textframe">{b.t}</span>}
              {b.i && b.t && <span className="tb-label">{b.t}</span>}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function ClearStatic({ groups = [], anchor = 0, collapsed, noHandle, tool = 'move' }) {
  const handle = !noHandle && (
    <span className={`tb-btn cl-btn fx-handle ${collapsed ? '' : 'is-open'}`}>
      <span className="tb-ic fx-a">{li(TOOLS[tool].d, 2)}</span>
      <span className="tb-ic fx-b">{li(FX_IC.close, 2)}</span>
    </span>
  )
  return (
    <div className={`fx-row at-${anchor}`}>
      <div className={`tb cl-bar fx static ${collapsed ? '' : 'open'}`}>
        {anchor === 0 && handle}
        {!collapsed && (
          <div className="fx-body">
            <div className="fx-mode">
              {groups.map((g, gi) => (
                <div key={gi} className="tb-group">
                  {g.map((b, bi) => b.field ? (
                    <span key={bi} className="fx-field"><span className="tb-ic">{li(IC.search, 2)}</span><span className="fx-ph">Search tools</span></span>
                  ) : (
                    <span key={bi} className={`tb-btn cl-btn ${b.t ? 'has-label' : ''} ${b.prim ? 'is-prim' : ''} ${b.sel ? 'is-sel' : ''} ${b.st === 'hover' ? 'is-hot' : ''} ${b.st === 'press' ? 'is-down' : ''}`}>
                      {b.d && <span className="tb-ic">{li(b.d, 2)}</span>}
                      {b.t && <span className="tb-label">{b.t}</span>}
                      {b.k && <span className="fx-key">{b.k}</span>}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {anchor !== 0 && handle}
      </div>
    </div>
  )
}

/* ================= the two sets: what each page shows ================= */
const LIB = [[{ i: 'back' }], [{ t: 'All', sel: true }, { t: 'Installed' }, { t: 'Favorites' }], [{ i: 'filter', t: 'Sort' }, { i: 'search' }]]
const FIGMA_TOOLS = [[{ d: TOOLS.move.d, sel: true }, { d: TOOLS.frame.d }, { d: TOOLS.rect.d }, { d: TOOLS.pen.d }, { d: TOOLS.text.d }, { d: TOOLS.comment.d }], [{ t: '100%' }], [{ d: IC.search, t: 'Search' }, { t: 'Share', prim: true }]]

const SETS = [
  {
    id: 'couch', tone: 'Futuristic, Couch Mode', Body: CouchSet, figma: 'https://www.figma.com/design/1T1LVdRyfNJDmR3xVa8pDS?node-id=14-2',
    about: 'A controller-first toolbar for a living-room screen. One focus ring walks the bar: the D-pad moves it, A presses, B goes back, LB / RB switch the example.',
    configs: [
      ['Spread: left, center and right groups', <CouchStatic groups={LIB} align={0} />],
      ['Left aligned', <CouchStatic groups={LIB} align={1} />],
      ['Center aligned', <CouchStatic groups={LIB} align={2} />],
      ['Right aligned', <CouchStatic groups={LIB} align={3} />],
      ['Icon-only buttons', <CouchStatic hug groups={[[{ i: 'back' }], [{ i: 'prev' }, { i: 'play' }, { i: 'next' }], [{ i: 'vol' }, { i: 'heart' }]]} />],
      ['Text-only buttons', <CouchStatic hug groups={[[{ t: 'All', sel: true }, { t: 'Installed' }, { t: 'Favorites' }]]} />],
      ['Icon and text buttons', <CouchStatic hug groups={[[{ i: 'list', t: 'Episodes' }], [{ i: 'filter', t: 'Sort' }, { i: 'cc', t: 'Subtitles' }]]} />],
    ],
    states: [
      ['Enabled', <CouchStatic hug groups={[[{ i: 'filter', t: 'Sort' }]]} />],
      ['Hover and focus: the ring arrives', <CouchStatic hug groups={[[{ i: 'filter', t: 'Sort', st: 'hover' }]]} />],
      ['Pressed: frame .94, fills accent', <CouchStatic hug groups={[[{ i: 'filter', t: 'Sort', st: 'press' }]]} />],
      ['Selected', <CouchStatic hug groups={[[{ t: 'Installed', sel: true }]]} />],
    ],
    spec: [
      ['Toolbar size', '800 × 64, narrows with its container'],
      ['Toolbar padding', '0 × 10'],
      ['Group spacing', '16'],
      ['Button spacing', '4'],
      ['Button size', '64 high hit area · icon frame 40 × 40 · text frame 40 high'],
      ['Button padding', '0 × 6 · text frame 0 × 14'],
      ['Icon to label', '12, the label sits outside the frame'],
      ['Icon', '20 × 20 · stroke 1'],
      ['Font', 'Inter Medium'],
      ['Font size / line height', '15 / 20'],
      ['Corner radius', 'toolbar 16 · frame 8 · focus ring 8 · selection 8'],
      ['Stroke width', 'toolbar 1 · frame 1 · focus ring 2 · selection 1.5'],
      ['Color', 'toolbar #0F141B · stroke #1D232B · frame #2A313A · label #98A2AD, focused #FFFFFF · focus glow #1A9FFF 12 / 28'],
      ['Motion', 'feedback 120 ms ease-out · ring and selection 220 ms cubic-bezier(0.2, 0, 0, 1) · alignment 240 ms'],
      ['Input', 'arrows or D-pad move · Enter or A press · Esc or B back · Q / E or LB / RB switch example'],
      ['Phone', 'frame 36 · text 14 · Back, Search, Volume and secondary labels hide'],
    ],
  },
  {
    id: 'clear', tone: 'Elegant, Clear', Body: ClearSet, figma: 'https://www.figma.com/design/1T1LVdRyfNJDmR3xVa8pDS?node-id=15-2',
    about: 'A floating glass tool bar for a design canvas. One circle holds the current tool and opens out of itself into the full set; search finds any tool or action.',
    configs: [
      ['Collapsed: one circle holding the current tool', <ClearStatic collapsed anchor={0} />],
      ['Expanded: the circle becomes close', <ClearStatic groups={FIGMA_TOOLS} anchor={2} />],
      ['Search: Enter runs the first result', <ClearStatic anchor={2} groups={[[{ d: IC.back }], [{ field: true }], [{ d: TOOLS.ellipse.d, t: 'Ellipse', k: 'O', st: 'hover' }, { d: FX_IC.fit, t: 'Zoom to fit', k: '⇧1' }]]} />],
      ['Left aligned: anchored left, opens to the right', <ClearStatic groups={FIGMA_TOOLS} anchor={0} />],
      ['Center aligned: opens both ways', <ClearStatic groups={FIGMA_TOOLS} anchor={1} />],
      ['Right aligned: anchored right, opens to the left', <ClearStatic groups={FIGMA_TOOLS} anchor={2} />],
      ['Icon-only buttons', <ClearStatic noHandle groups={[FIGMA_TOOLS[0]]} />],
      ['Text-only buttons', <ClearStatic noHandle groups={[[{ t: '100%' }], [{ t: 'Share', prim: true }]]} />],
      ['Icon and text buttons', <ClearStatic noHandle groups={[[{ d: IC.search, t: 'Search' }], [{ d: TOOLS.ellipse.d, t: 'Ellipse' }, { d: FX_IC.fit, t: 'Zoom to fit' }]]} />],
    ],
    states: [
      ['Enabled', <ClearStatic noHandle groups={[[{ d: IC.search, t: 'Search' }]]} />],
      ['Hover: white 16%', <ClearStatic noHandle groups={[[{ d: IC.search, t: 'Search', st: 'hover' }]]} />],
      ['Pressed: light recess, .97', <ClearStatic noHandle groups={[[{ d: IC.search, t: 'Search', st: 'press' }]]} />],
      ['Selected', <ClearStatic noHandle groups={[[{ d: TOOLS.frame.d, sel: true }]]} />],
      ['Primary', <ClearStatic noHandle groups={[[{ t: 'Share', prim: true }]]} />],
    ],
    spec: [
      ['Toolbar size', 'collapsed 64 × 64 · expanded hugs its content, up to 720 × 64'],
      ['Toolbar padding', '0 × 8'],
      ['Group spacing', '12'],
      ['Button spacing', '4'],
      ['Button size', '48 high · icon only 48 × 48'],
      ['Button padding', '0 × 18 with a label · 0 icon only'],
      ['Icon to label', '8'],
      ['Icon', '22 × 22 · stroke 2'],
      ['Font', 'Geist Medium, −0.5% tracking · shortcut hints Geist Mono'],
      ['Font size / line height', '15 / 20 · hints 12 / 16'],
      ['Corner radius', 'toolbar 32 · buttons 24 · search field 20'],
      ['Stroke width', 'toolbar 1 · top highlight 1'],
      ['Search field', '200 × 40 (130 on phones) · black 12% recess · two results (one on phones)'],
      ['Color', 'glass #8E939A to #74787E at 72%, blur 24 · white glyphs · hover white 16% · selected #282C32 16% recess · primary white 88% on #3A3A3A'],
      ['Motion', 'expand 280 ms cubic-bezier(0.2, 0, 0, 1), contents unblur 200 ms · collapse 180 ms ease-in · icon to close 120 ms · recess 220 ms'],
      ['Input', 'the circle opens · Esc closes search, then the bar · V F R O P T C pick tools · / or ⌘K search · Enter runs the first result'],
      ['Phone', 'toolbar 58 high · buttons 44 · Pen, Comment, shape and zoom hide'],
    ],
  },
]

/* wall (home page hover background): the toolbars operating themselves, repeated to fill the screen */
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
  const [layout] = useState(() => ({ cols: Math.max(1, Math.round(window.innerWidth / 820)), rows: Math.ceil(window.innerHeight / 110) + 1 }))
  return (
    <div className="wall" aria-hidden="true">
      {active && Array.from({ length: layout.cols }, (_, c) => (
        <div key={c} className="wall-col">
          {Array.from({ length: layout.rows }, (_, r) => {
            const set = SETS[(c + r) % SETS.length]
            return <div key={r} className="wall-tile"><set.Body auto offset={c * 2 + r} /></div>
          })}
        </div>
      ))}
    </div>
  )
}

function SetPage({ set }) {
  useEffect(() => { document.title = `${set.tone} · Toolbars` }, [set])
  return (
    <main>
      <a className="up" href="./">Toolbars</a>
      <h1>{set.tone}</h1>
      <p className="about">{set.about}</p>
      <section className="set" aria-labelledby="ex-h">
        <h2 id="ex-h">Example</h2>
        <set.Body />
      </section>
      <section className="set" aria-labelledby="cf-h">
        <h2 id="cf-h">Configurations</h2>
        {set.configs.map(([label, node]) => <Sample key={label} label={label}>{node}</Sample>)}
      </section>
      <section className="set" aria-labelledby="st-h">
        <h2 id="st-h">States</h2>
        <div className="states">{set.states.map(([label, node]) => <Sample key={label} label={label}>{node}</Sample>)}</div>
      </section>
      <section className="spec" aria-labelledby="sp-h">
        <h2 id="sp-h">Specifications</h2>
        <table>
          <tbody>{set.spec.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody>
        </table>
        <p className="spec-note">All values in px. <a href={set.figma} target="_blank" rel="noreferrer">Figma drawing</a></p>
      </section>
    </main>
  )
}

function Index() {
  return (
    <main>
      <h1>Toolbars</h1>
      <ul className="index">
        {SETS.map((s) => <li key={s.id}><a href={`?set=${s.id}`}>{s.tone}</a><p>{s.about}</p></li>)}
      </ul>
    </main>
  )
}

export default function App() {
  const params = new URLSearchParams(window.location.search)
  if (params.has('wall')) return <Wall />
  const set = SETS.find((s) => s.id === params.get('set'))
  return set ? <SetPage set={set} /> : <Index />
}
