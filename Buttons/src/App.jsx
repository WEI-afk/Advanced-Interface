import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const mod = (a, n) => ((a % n) + n) % n

/* ================= the button system =================
   Every button is the same structure: [icon] [label]. Three levels of emphasis (primary, secondary, tertiary),
   and the content can drop to text only or icon only. A button group is the same button, several in one container, one chosen. */
const li = (d, w = 1.5) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d.map((p, i) => <path key={i} d={p} />)}</svg>
)
const IC = {
  play: ['M6.500 4.500v11l9-5.500z'], pause: ['M7 4.500v11', 'M13 4.500v11'], plus: ['M10 4v12', 'M4 10h12'], check: ['M4.500 10.500l3.500 3.500 7.500-8'],
  more: ['M4.500 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2z', 'M10 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2z', 'M15.500 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2z'],
  download: ['M10 3.500v9', 'M6.500 9L10 12.500 13.500 9', 'M4 16h12'], info: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M10 9v4.500', 'M10 6.500v.010'],
  reset: ['M4 10a6 6 0 1 0 1.800-4.300', 'M4 4v3.500h3.500'], bolt: ['M11 2.500L4.500 11H10l-1 6.500L15.500 9H10z'],
  half: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M10 3v14'], spark: ['M10 2.500l1.800 5.700 5.700 1.800-5.700 1.800L10 17.500l-1.800-5.700L2.500 10l5.700-1.800z'],
  link: ['M8.500 11.500a3 3 0 0 0 4.200 0l2.500-2.500a3 3 0 0 0-4.200-4.200l-.800.800', 'M11.500 8.500a3 3 0 0 0-4.200 0L4.800 11a3 3 0 0 0 4.200 4.200l.800-.800'],
  close: ['M5.500 5.500l9 9', 'M14.500 5.500l-9 9'], undo: ['M7.500 11.500L4 8l3.500-3.500', 'M4 8h8.500a4 4 0 0 1 0 8H10'], redo: ['M12.500 11.500L16 8l-3.500-3.500', 'M16 8H7.500a4 4 0 0 0 0 8H10'],
  left: ['M3 4.500h14', 'M3 8.200h9', 'M3 11.800h14', 'M3 15.500h9'], center: ['M3 4.500h14', 'M5.500 8.200h9', 'M3 11.800h14', 'M5.500 15.500h9'], right: ['M3 4.500h14', 'M8 8.200h9', 'M3 11.800h14', 'M8 15.500h9'],
  reply: ['M8 5L3.500 9.500 8 14', 'M3.500 9.500H11a5.500 5.500 0 0 1 5.500 5.500'], reopen: ['M16 10a6 6 0 1 1-1.800-4.300', 'M16 4v3.500h-3.500'],
  flag: ['M5 17V3.500', 'M5 4h9.500l-2 3.500 2 3.500H5'], shield: ['M10 2.500l6 2.500v4.500c0 4-2.700 6.500-6 8-3.300-1.500-6-4-6-8V5z'],
  hammer: ['M12 3l5 5-2 2-5-5z', 'M11 7l-7.500 7.500 2 2L13 9'], leaf: ['M4 16c0-7 5-12 12-12 0 7-5 12-12 12z', 'M4 16l7-7'], back: ['M12 4.500L6.500 10l5.500 5.500'],
  one: ['M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M4.500 17a5.500 5.500 0 0 1 11 0'],
  two: ['M7.500 9a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z', 'M2.500 16a5 5 0 0 1 10 0', 'M13 4.200a2.500 2.500 0 0 1 0 4.700', 'M14.500 11.300a5 5 0 0 1 3 4.700'],
  three: ['M10 8a2.200 2.200 0 1 0 0-4.400 2.200 2.200 0 0 0 0 4.400z', 'M5 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M15 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M6 16.500a4 4 0 0 1 8 0', 'M1.500 16a3.500 3.500 0 0 1 3.800-3.500', 'M18.500 16a3.500 3.500 0 0 0-3.800-3.500'],
  send: ['M3 10l14-6.500-4.500 14L10 11z', 'M10 11l7-7.500'],
  mark: ['M5.500 3h9v14l-4.500-3.500L5.500 17z'], quote: ['M4 11h4v5H4z', 'M4 11c0-3 1.500-5 4-6', 'M12 11h4v5h-4z', 'M12 11c0-3 1.500-5 4-6'], arrow: ['M4 10h12', 'M11 5l5 5-5 5'],
  dawn: ['M3 14h14', 'M6 14a4 4 0 0 1 8 0', 'M10 4v3', 'M4.500 8l1.500 1.500', 'M15.500 8L14 9.500'],
  sun: ['M10 6.500a3.500 3.500 0 1 0 0 7 3.500 3.500 0 0 0 0-7z', 'M10 2v2', 'M10 16v2', 'M2 10h2', 'M16 10h2', 'M4.300 4.300l1.400 1.400', 'M14.300 14.300l1.400 1.400', 'M4.300 15.700l1.400-1.400', 'M14.300 5.700l1.400-1.400'],
  moon: ['M15.500 12.500A6 6 0 0 1 7.500 4.500a6 6 0 1 0 8 8z'], cal: ['M3.500 5h13v11.500h-13z', 'M3.500 8.500h13', 'M7 3v3.500', 'M13 3v3.500'],
  plan: ['M3.500 3.500h13v13h-13z', 'M3.500 10h7', 'M10.500 3.500v9', 'M13.500 10v6.500'], section: ['M3 16.500h14', 'M5 16.500V9l5-5.500 5 5.500v7.500', 'M8 16.500v-4h4v4'],
  elev: ['M3 16.500h14', 'M4.500 16.500V6h11v10.500', 'M7.500 9h2', 'M10.500 9h2', 'M7.500 12.500h2', 'M10.500 12.500h2'],
  archive: ['M3 4h14v4H3z', 'M4.500 8v8h11V8', 'M8 11h4'], bell: ['M5.500 13.500V9a4.500 4.500 0 0 1 9 0v4.500l1.500 2h-12z', 'M8.500 17.500a1.500 1.500 0 0 0 3 0'],
  prev: ['M14 5v10l-7-5z', 'M5 5v10'], next: ['M6 5v10l7-5z', 'M15 5v10'], chev: ['M6 8l4 4 4-4'], pen: ['M4 16l3-.500 9-9-2.500-2.500-9 9z', 'M12 5l2.500 2.500'],
  walk: ['M10.500 4.500a1.500 1.500 0 1 0 0-3 1.500 1.500 0 0 0 0 3z', 'M8 18l2-5.500 2.500 2.500V18', 'M6 10.500l3-4 3 1.500 1.500 3', 'M9 6.500l1.500 6'],
  bike: ['M5 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M15 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M5 12l3.500-6h4', 'M15 12l-3-6', 'M8.500 6l3 6H5'],
  car: ['M3.500 13.500V10l2-4.500h9l2 4.500v3.500z', 'M3.500 10h13', 'M6 13.500v2', 'M14 13.500v2'],
  note: ['M5 3h10v14H5z', 'M8 7h4', 'M8 10h4', 'M8 13h2'], list2: ['M8.500 5.500h8', 'M8.500 10h8', 'M8.500 14.500h8', 'M3.500 5.500l1 1 2-2', 'M3.500 10l1 1 2-2', 'M3.500 14.500l1 1 2-2'],
  photo: ['M3 5h14v11H3z', 'M3 13l4-4 3 3 2-2 5 5'], mic: ['M10 3a2 2 0 0 1 2 2v5a2 2 0 0 1-4 0V5a2 2 0 0 1 2-2z', 'M5.500 9.500a4.500 4.500 0 0 0 9 0', 'M10 14v3'],
  laptop: ['M4 5h12v8H4z', 'M2 15.500h16'], term: ['M3 4h14v12H3z', 'M6 8l2.500 2L6 12', 'M10 12.500h4'], copy: ['M7 7h9v9H7z', 'M13 7V4H4v9h3'],
  doc: ['M5 3h7l3 3v11H5z', 'M12 3v3h3', 'M7.500 10h5', 'M7.500 13h5'], clock: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M10 6v4l2.500 2'],
  invite: ['M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M2.500 17a5.500 5.500 0 0 1 11 0', 'M15.500 7v5', 'M13 9.500h5'], arc: ['M10 3a7 7 0 1 1-7 7'],
  print: ['M6 8V3.500h8V8', 'M6.500 14H4V8h12v6h-2.500', 'M6.500 11.500h7v5h-7z'], expand: ['M12 3.500h4.500V8', 'M16.500 3.500l-5 5', 'M8 16.500H3.500V12', 'M3.500 16.500l5-5'],
}
const CONTENT = ['Icon and text', 'Text only', 'Icon only']
const CMODE = ['both', 'text', 'icon']

// measure where an element sits inside its container, so one marker (ring or selection) can glide to it
function useMarker(boxRef, selector, deps) {
  const [box, setBox] = useState(null)
  const measure = () => {
    const root = boxRef.current
    const el = root && selector && root.querySelector(selector)
    if (!el) { setBox(null); return }
    // layout geometry, not the painted box: a pressed button is scaled down, and the marker must not shrink with it
    let x = 0, y = 0, n = el
    while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent }
    if (n !== root) { const a = el.getBoundingClientRect(), b = root.getBoundingClientRect(); x = a.left - b.left; y = a.top - b.top }
    setBox({ x, y, w: el.offsetWidth, h: el.offsetHeight })
  }
  useLayoutEffect(measure, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // fonts and wrapping can move buttons without the container changing size, so watch the buttons too
    const ro = new ResizeObserver(measure)
    if (boxRef.current) { ro.observe(boxRef.current); boxRef.current.querySelectorAll('.bt').forEach((c) => ro.observe(c)) }
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return box
}

function useNote(ms = 1600) {
  const [note, setNote] = useState(null)
  const timer = useRef()
  const say = (text) => { clearTimeout(timer.current); setNote(text); timer.current = setTimeout(() => setNote(null), ms) }
  useEffect(() => () => clearTimeout(timer.current), [])
  return [note, say]
}

// timers that die with the component
function useLater() {
  const ts = useRef([])
  useEffect(() => () => ts.current.forEach(clearTimeout), [])
  return (fn, ms) => { const t = setTimeout(fn, ms); ts.current.push(t); return t }
}

/* one button. Its label can change in place (Copied, Downloading 42%): every face it can show sits invisibly in the
   same cell, so the button is always as wide as its widest face and never pushes its neighbours */
function Btn({ sys, kind = 'pri', seg, icon, label, faces = [], content = 'both', face, className = '', ...rest }) {
  const iconOnly = content === 'icon', textOnly = content === 'text'
  const draw = (ic, t) => (
    <>
      {!textOnly && ic && <span className="bt-ic">{li(ic)}</span>}
      {!iconOnly && <span className="bt-t">{t}</span>}
    </>
  )
  return (
    <button type="button" className={`bt ${sys}-${seg ? 'seg' : 'b'} ${seg ? '' : `is-${kind}`} ${iconOnly ? 'is-icon' : ''} ${className}`}
      aria-label={iconOnly ? label : undefined} title={iconOnly ? label : undefined} {...rest}>
      <span className="bt-bg" aria-hidden="true" />
      <span className="bt-stack">
        {faces.map(([ic, t], i) => <span key={i} className="bt-v sz" aria-hidden="true">{draw(ic, t)}</span>)}
        <span key={face ?? label} className="bt-v on">{draw(icon, label)}</span>
      </span>
    </button>
  )
}

/* ================= FUTURISTIC · Couch Mode =================
   Buttons for a living-room screen, read from three meters away and driven by a controller. One focus ring glides
   between them: the D-pad moves it, A presses. Disabled buttons are skipped. */
const CM_EX = ['Game', 'Download', 'Display']
const MODES = [{ id: 'perf', label: 'Performance', icon: IC.bolt, fps: '60 fps' }, { id: 'bal', label: 'Balanced', icon: IC.half, fps: '45 fps' }, { id: 'qual', label: 'Quality', icon: IC.spark, fps: '30 fps' }]
const DL_FACES = [[IC.download, 'Download'], [IC.download, 'Downloading 100%'], [IC.play, 'Play']]
const FRESH_DL = { p: 0, on: false, paused: false }

// a group: the choices sit in one container, and one selection indicator moves and resizes between them
function CmGroup({ selId, deps, label, children }) {
  const box = useRef(null)
  const sel = useMarker(box, selId ? `[data-id="${selId}"]` : null, deps)
  return (
    <div className="cm-grp" ref={box} role="radiogroup" aria-label={label}>
      {sel && <i className="cm-sel" aria-hidden="true" style={{ transform: `translate(${sel.x}px, ${sel.y}px)`, width: sel.w, height: sel.h }} />}
      {children}
    </div>
  )
}

// the example's switchers are the set's own button group, with a ring that appears where you point
function CouchSwitch({ label, items, value, onChange }) {
  const box = useRef(null)
  const [hot, setHot] = useState(null)
  const [down, setDown] = useState(null)
  const ring = useMarker(box, hot != null ? `[data-id="s${hot}"]` : null, [hot, value])
  const keys = (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = mod(value + d, items.length)
    onChange(next)
    e.currentTarget.querySelector(`[data-id="s${next}"]`)?.focus()
  }
  return (
    <div className="sw">
      <span className="sw-k">{label}</span>
      <div className="sw-box" ref={box} onKeyDown={keys} onPointerLeave={() => { setHot(null); setDown(null) }}>
        {ring && <i className={`cm-ring sw-ring ${down === hot ? 'is-press' : ''}`} aria-hidden="true" style={{ translate: `${ring.x}px ${ring.y}px`, width: ring.w, height: ring.h }} />}
        <CmGroup selId={`s${value}`} deps={[value]} label={label}>
          {items.map((it, i) => (
            <Btn key={it} sys="cm" seg label={it} data-id={`s${i}`} role="radio" aria-checked={i === value} tabIndex={i === value ? 0 : -1}
              className={`${hot === i ? 'is-focus' : ''} ${i === value ? 'is-sel' : ''} ${down === i ? 'is-press' : ''}`}
              onPointerEnter={() => setHot(i)} onPointerDown={() => { setHot(i); setDown(i) }} onPointerUp={() => setDown(null)}
              onFocus={(e) => { if (e.target.matches(':focus-visible')) setHot(i) }} onBlur={() => setHot(null)} onClick={() => onChange(i)} />
          ))}
        </CmGroup>
      </div>
    </div>
  )
}

function CouchSet({ auto, offset = 0 }) {
  const stage = useRef(null)
  const row = useRef(null)
  const [ex, setEx] = useState(offset % 3)
  const [ci, setCi] = useState(0)
  const content = CMODE[ci]
  const [focus, setFocus] = useState(0)
  const [down, setDown] = useState(null)
  const [note, say] = useNote()
  const [inLib, setInLib] = useState(false)
  const [dl, setDl] = useState(FRESH_DL)
  const [mode, setMode] = useState(1)
  const [applied, setApplied] = useState(1)
  const done = dl.p >= 1

  // the download moves on by itself while it runs
  useEffect(() => {
    if (!dl.on || dl.paused || done) return
    const t = setInterval(() => setDl((d) => ({ ...d, p: Math.min(1, d.p + 0.01) })), 60)
    return () => clearInterval(t)
  }, [dl.on, dl.paused, done])

  const items = [
    [
      { id: 'play', kind: 'pri', icon: IC.play, label: 'Play' },
      { id: 'lib', kind: 'sec', icon: inLib ? IC.check : IC.plus, label: inLib ? 'In Library' : 'Add to Library', faces: [[IC.plus, 'Add to Library'], [IC.check, 'In Library']] },
      { id: 'more', kind: 'ter', icon: IC.more, label: 'More' },
    ],
    [
      done ? { id: 'get', kind: 'pri', icon: IC.play, label: 'Play', face: 'play', faces: DL_FACES }
        : dl.on ? { id: 'get', kind: 'pri', icon: IC.download, label: `Downloading ${Math.round(dl.p * 100)}%`, face: 'ing', faces: DL_FACES, disabled: true }
          : { id: 'get', kind: 'pri', icon: IC.download, label: 'Download', face: 'dl', faces: DL_FACES },
      { id: 'pause', kind: 'sec', icon: dl.paused ? IC.play : IC.pause, label: dl.paused ? 'Resume' : 'Pause', faces: [[IC.pause, 'Pause'], [IC.play, 'Resume']], disabled: !dl.on || done },
      { id: 'info', kind: 'ter', icon: IC.info, label: 'Details' },
    ],
    [
      ...MODES.map((m, i) => ({ id: m.id, seg: true, i, icon: m.icon, label: m.label })),
      { id: 'apply', kind: 'pri', icon: IC.check, label: 'Apply', disabled: mode === applied },
      { id: 'reset', kind: 'ter', icon: IC.reset, label: 'Reset', disabled: mode === 1 && applied === 1 },
    ],
  ][ex]
  const can = (i) => !!items[i] && !items[i].disabled
  // the next button that can be pressed, in direction d (disabled ones are skipped)
  const step = (from, d) => { for (let k = 1; k <= items.length; k++) { const i = mod(from + d * k, items.length); if (can(i)) return i } return from }
  const f = can(focus) ? focus : step(focus, 1)
  // a button that just became disabled hands the ring to the next one
  useEffect(() => { if (f !== focus) setFocus(f) }, [f, focus])

  const press = (b) => {
    if (!b || b.disabled) return
    if (b.seg) { setMode(b.i); return }
    if (b.id === 'play') say('Starting Hollow Pines…')
    else if (b.id === 'lib') setInLib((v) => !v)
    else if (b.id === 'more') say('More: manage, hide, uninstall')
    else if (b.id === 'get') { if (done) say('Starting Hollow Pines…'); else setDl({ ...FRESH_DL, on: true }) }
    else if (b.id === 'pause') setDl((d) => ({ ...d, paused: !d.paused }))
    else if (b.id === 'info') say('Hollow Pines · 24 GB · version 1.4.2')
    else if (b.id === 'apply') { setApplied(mode); say(`Applied ${MODES[mode].label}`) }
    else if (b.id === 'reset') { setMode(1); setApplied(1); say('Back to Balanced') }
  }
  const go = (d) => { setEx((v) => mod(v + d, 3)); setFocus(0); setDown(null); setDl(FRESH_DL) }

  /* input: keys while the pointer or focus is on the example, and a real controller any time */
  const latest = useRef()
  latest.current = { items, f, press, go, step }
  const input = (k, isDown) => {
    const L = latest.current
    if (!isDown) { if (k === 'a') { setDown(null); L.press(L.items[L.f]) } return }
    if (k === 'left') setFocus(L.step(L.f, -1))
    else if (k === 'right') setFocus(L.step(L.f, 1))
    else if (k === 'a') { if (!L.items[L.f]?.disabled) setDown(L.items[L.f]?.id) }
    else if (k === 'lb') L.go(-1)
    else if (k === 'rb') L.go(1)
    else if (k === 'cl') setCi((v) => mod(v - 1, 3))
    else if (k === 'cr') setCi((v) => mod(v + 1, 3))
  }
  const inputRef = useRef(); inputRef.current = input
  useEffect(() => {
    if (auto) return
    const map = { ArrowLeft: 'left', ArrowUp: 'left', ArrowRight: 'right', ArrowDown: 'right', Enter: 'a', ' ': 'a', q: 'lb', e: 'rb', z: 'cl', c: 'cr' }
    const hot = () => stage.current?.matches(':hover') || stage.current?.contains(document.activeElement)
    const kd = (e) => { const k = map[e.key]; if (!k || !hot() || e.metaKey || e.ctrlKey || e.target.closest?.('.sw')) return; e.preventDefault(); if (!e.repeat || k === 'left' || k === 'right') inputRef.current(k, true) }
    const ku = (e) => { const k = map[e.key]; if (k) inputRef.current(k, false) }
    window.addEventListener('keydown', kd, true)
    window.addEventListener('keyup', ku, true)
    // a real controller: buttons and the stick drive the same input, and directions repeat while held
    const BTN = { 0: 'a', 4: 'lb', 5: 'rb', 14: 'left', 15: 'right', 12: 'left', 13: 'right' }
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
    let k = offset
    const t = setInterval(() => {
      k++
      const s = k % 8
      if (s === 7) inputRef.current('rb', true)
      else if (s === 3 || s === 5) { inputRef.current('a', true); setTimeout(() => inputRef.current('a', false), 140) }
      else inputRef.current('right', true)
    }, 850)
    return () => clearInterval(t)
  }, [auto, offset])

  const fid = items[f]?.id
  const ring = useMarker(row, fid ? `[data-id="${fid}"]` : null, [fid, ex, content, inLib, dl.on, dl.paused, done, mode, applied])
  const status = note || [
    `Hollow Pines · ${inLib ? 'in your library' : 'not in your library'}`,
    done ? 'Hollow Pines · downloaded, ready to play' : dl.on ? `${dl.paused ? 'Paused' : 'Downloading'} · ${Math.round(dl.p * 100)}% of 24 GB` : 'Hollow Pines · 24 GB',
    `Applied: ${MODES[applied].label}, ${MODES[applied].fps}${mode !== applied ? ` · ${MODES[mode].label} not applied yet` : ''}`,
  ][ex]

  const btn = (b) => {
    const idx = items.indexOf(b)
    return (
      <Btn key={b.id} sys="cm" kind={b.kind} seg={b.seg} icon={b.icon} label={b.label} faces={b.faces} face={b.face} content={content} disabled={b.disabled}
        data-id={b.id} tabIndex={-1} role={b.seg ? 'radio' : undefined} aria-checked={b.seg ? mode === b.i : undefined}
        className={`${idx === f ? 'is-focus' : ''} ${down === b.id ? 'is-press' : ''} ${b.seg && mode === b.i ? 'is-sel' : ''}`}
        onPointerEnter={() => { if (!auto && !b.disabled) setFocus(idx) }} onPointerDown={() => { if (!auto && !b.disabled) { setFocus(idx); setDown(b.id) } }}
        onPointerUp={() => setDown(null)} onPointerLeave={() => setDown(null)} onClick={() => { if (!auto) press(b) }} />
    )
  }
  const segs = items.filter((b) => b.seg)
  return (
    <div className="ex">
      <div className="ex-stage" ref={stage} tabIndex={auto ? -1 : 0} aria-label="Couch Mode buttons. Arrow keys move, Enter presses, Q and E switch example, Z and C switch content.">
        <div className="bt-row cm-row" ref={row}>
          {ring && <i className={`cm-ring ${down === fid ? 'is-press' : ''}`} aria-hidden="true" style={{ translate: `${ring.x}px ${ring.y}px`, width: ring.w, height: ring.h }} />}
          {segs.length > 0 && <CmGroup selId={MODES[mode].id} deps={[mode, content, ex]} label="Display mode">{segs.map(btn)}</CmGroup>}
          {items.filter((b) => !b.seg).map(btn)}
        </div>
        {!auto && <p className="tb-status" aria-live="polite">{status}</p>}
      </div>
      {!auto && (
        <div className="ex-controls">
          <CouchSwitch label="Example" items={CM_EX} value={ex} onChange={(i) => { setEx(i); setFocus(0); setDown(null); setDl(FRESH_DL) }} />
          <CouchSwitch label="Content" items={CONTENT} value={ci} onChange={setCi} />
        </div>
      )}
    </div>
  )
}

/* ================= ELEGANT · Clear =================
   Buttons for a design canvas, in the frosted warm glass of the Clear tool bar: matte, no rim light, thin line icons.
   A group's choice is a fill that grows where it is; nothing slides. */
const CL_EX = ['Export', 'Text', 'Comment']
const ALIGNS = [{ id: 'left', label: 'Left', icon: IC.left }, { id: 'center', label: 'Center', icon: IC.center }, { id: 'right', label: 'Right', icon: IC.right }]

// a group: one container, each choice owns its fill; arrow keys move the choice
function ClGroup({ label, items, value, onChange, content = 'both', className = '' }) {
  const keys = (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = mod(value + d, items.length)
    onChange(next)
    e.currentTarget.querySelector(`[data-i="${next}"]`)?.focus()
  }
  return (
    <div className={`cl-grp ${className}`} role="radiogroup" aria-label={label} onKeyDown={keys}>
      {items.map((it, i) => (
        <Btn key={it.label} sys="cl" seg icon={it.icon} label={it.label} content={it.icon ? content : 'text'} data-i={i} role="radio" aria-checked={i === value}
          tabIndex={i === value ? 0 : -1} className={i === value ? 'is-sel' : ''} onClick={() => onChange(i)} />
      ))}
    </div>
  )
}

function ClearSwitch({ label, items, value, onChange }) {
  return (
    <div className="sw">
      <span className="sw-k">{label}</span>
      <ClGroup label={label} items={items.map((t) => ({ label: t }))} value={value} onChange={onChange} />
    </div>
  )
}

function ClearSet({ auto, offset = 0 }) {
  const [ex, setEx] = useState(offset % 3)
  const [ci, setCi] = useState(0)
  const content = CMODE[ci]
  const [note, say] = useNote()
  const later = useLater()
  const [exp, setExp] = useState('idle') // idle · busy · done
  const [copied, setCopied] = useState(false)
  const [align, setAlign] = useState(0)
  const [past, setPast] = useState([])
  const [future, setFuture] = useState([])
  const [resolved, setResolved] = useState(false)
  const busyT = useRef()

  const exportNow = () => {
    setExp('busy')
    busyT.current = later(() => { setExp('done'); busyT.current = later(() => setExp('idle'), 1400) }, 1200)
  }
  const cancel = () => { clearTimeout(busyT.current); setExp('idle'); say('Export cancelled') }
  const copy = () => { setCopied(true); later(() => setCopied(false), 1400) }
  const pickAlign = (i) => { if (i === align) return; setPast((p) => [...p, align]); setFuture([]); setAlign(i) }
  const undo = () => { if (!past.length) return; setFuture((f) => [align, ...f]); setAlign(past[past.length - 1]); setPast((p) => p.slice(0, -1)) }
  const redo = () => { if (!future.length) return; setPast((p) => [...p, align]); setAlign(future[0]); setFuture((f) => f.slice(1)) }

  /* wall: it runs itself */
  const latest = useRef(); latest.current = { exportNow, copy, pickAlign, setResolved, align }
  useEffect(() => {
    if (!auto) return
    let k = offset
    const t = setInterval(() => {
      const L = latest.current
      const s = k++ % 6
      if (s === 0) L.exportNow()
      else if (s === 2) L.copy()
      else if (s === 3) L.pickAlign((L.align + 1) % 3)
      else if (s === 4) L.setResolved((v) => !v)
      else setEx((v) => (v + 1) % 3)
    }, 1300)
    return () => clearInterval(t)
  }, [auto, offset])

  const b = ({ key, ...props }) => <Btn key={key} sys="cl" content={content} {...props} />
  const exportFaces = [[IC.download, 'Export'], [IC.download, 'Exporting…'], [IC.check, 'Exported']]
  const views = [
    <>
      {b({ key: 'cancel', kind: 'ter', icon: IC.close, label: 'Cancel', disabled: exp !== 'busy', onClick: cancel })}
      {b({ key: 'copy', kind: 'sec', icon: copied ? IC.check : IC.link, label: copied ? 'Copied' : 'Copy link', faces: [[IC.link, 'Copy link'], [IC.check, 'Copied']], onClick: copy })}
      {b({ key: 'export', kind: 'pri', icon: exp === 'done' ? IC.check : IC.download, label: { idle: 'Export', busy: 'Exporting…', done: 'Exported' }[exp], faces: exportFaces, disabled: exp !== 'idle', onClick: exportNow })}
    </>,
    <>
      <ClGroup label="Text alignment" items={ALIGNS} value={align} onChange={pickAlign} content={content} />
      {b({ key: 'undo', kind: 'ter', icon: IC.undo, label: 'Undo', disabled: !past.length, onClick: undo })}
      {b({ key: 'redo', kind: 'ter', icon: IC.redo, label: 'Redo', disabled: !future.length, onClick: redo })}
      {b({ key: 'done', kind: 'pri', icon: IC.check, label: 'Done', onClick: () => say('Text style saved') })}
    </>,
    <>
      {b({ key: 'reopen', kind: 'ter', icon: IC.reopen, label: 'Reopen', disabled: !resolved, onClick: () => setResolved(false) })}
      {b({ key: 'reply', kind: 'sec', icon: IC.reply, label: 'Reply', onClick: () => say('Reply box opened') })}
      {b({ key: 'resolve', kind: 'pri', icon: IC.check, label: resolved ? 'Resolved' : 'Resolve', faces: [[IC.check, 'Resolve'], [IC.check, 'Resolved']], disabled: resolved, onClick: () => setResolved(true) })}
    </>,
  ]
  const status = note || [
    exp === 'busy' ? 'Exporting 2 frames…' : exp === 'done' ? 'Exported 2 frames as PNG' : copied ? 'Link copied' : '2 frames selected',
    `Aligned ${ALIGNS[align].id} · ${past.length ? `${past.length} change${past.length > 1 ? 's' : ''} to undo` : 'nothing to undo'}`,
    resolved ? 'Resolved · hidden from the canvas' : 'Open comment · 2 replies',
  ][ex]

  return (
    <div className="ex">
      <div className="ex-stage">
        <div className="bt-row cl-row">{views[ex]}</div>
        {!auto && <p className="tb-status" aria-live="polite">{status}</p>}
      </div>
      {!auto && (
        <div className="ex-controls">
          <ClearSwitch label="Example" items={CL_EX} value={ex} onChange={setEx} />
          <ClearSwitch label="Content" items={CONTENT} value={ci} onChange={setCi} />
        </div>
      )}
    </div>
  )
}

/* a group with one indicator that moves between the choices; nothing chosen yet is allowed (value null) */
function SlideGroup({ sys, label, items, value, onChange, content = 'both' }) {
  const box = useRef(null)
  const sel = useMarker(box, value != null ? `[data-i="${value}"]` : null, [value, content, items.length])
  const keys = (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = mod((value ?? -d) + d, items.length)
    onChange(next)
    e.currentTarget.querySelector(`[data-i="${next}"]`)?.focus()
  }
  return (
    <div className={`${sys}-grp`} ref={box} role="radiogroup" aria-label={label} onKeyDown={keys}>
      {sel && <i className={`${sys}-sel`} aria-hidden="true" style={{ transform: `translate(${sel.x}px, ${sel.y}px)`, width: sel.w, height: sel.h }} />}
      {items.map((it, i) => (
        <Btn key={it.label} sys={sys} seg icon={it.icon} label={it.label} content={it.icon ? content : 'text'} data-i={i} role="radio" aria-checked={i === value}
          tabIndex={i === (value ?? 0) ? 0 : -1} className={i === value ? 'is-sel' : ''} onClick={() => onChange(i)} />
      ))}
    </div>
  )
}
function SlideSwitch({ sys, label, items, value, onChange }) {
  return (
    <div className="sw">
      <span className="sw-k">{label}</span>
      <SlideGroup sys={sys} label={label} items={items.map((t) => ({ label: t }))} value={value} onChange={onChange} />
    </div>
  )
}

/* ================= REBELLIOUS · Base Camp =================
   Buttons for a hunter's camp, in the Persona-style language of the Base Camp menu: cut slabs that lean, a plate peeking from
   behind, letters in Anton. A hovered button steps forward with a snap; a pressed one inverts. */
const BC_EX = ['Quest', 'Forge', 'Party']
const PARTY = [{ label: 'Solo', icon: IC.one }, { label: 'Duo', icon: IC.two }, { label: 'Squad', icon: IC.three }]

function CampSet({ auto, offset = 0 }) {
  const [ex, setEx] = useState(offset % 3)
  const [ci, setCi] = useState(0)
  const content = CMODE[ci]
  const [note, say] = useNote()
  const later = useLater()
  const [quest, setQuest] = useState('idle') // idle · going · out
  const [mats, setMats] = useState(0)
  const [party, setParty] = useState(0)
  const [posted, setPosted] = useState(false)
  const depart = () => { setQuest('going'); later(() => setQuest('out'), 1200) }
  const abandon = () => { setQuest('idle'); say('Quest abandoned · back at camp') }
  const forge = () => { setMats(0); say('Forged: Rathalos Blade') }
  const post = () => { setPosted(true); later(() => setPosted(false), 1400) }

  const latest = useRef(); latest.current = { depart, abandon, quest, mats, forge }
  useEffect(() => {
    if (!auto) return
    let k = offset
    const t = setInterval(() => {
      const L = latest.current
      const s = k++ % 6
      if (s === 0) { if (L.quest === 'out') L.abandon(); else L.depart() }
      else if (s === 2) { if (L.mats >= 3) L.forge(); else setMats((m) => m + 1) }
      else if (s === 3) setParty((v) => (v + 1) % 3)
      else if (s === 4) post()
      else setEx((v) => (v + 1) % 3)
    }, 1300)
    return () => clearInterval(t)
  }, [auto, offset]) // eslint-disable-line react-hooks/exhaustive-deps

  const b = ({ key, ...props }) => <Btn key={key} sys="bc" content={content} {...props} />
  const views = [
    <>
      {b({ key: 'depart', kind: 'pri', icon: IC.flag, label: { idle: 'Depart', going: 'Departing…', out: 'On the Hunt' }[quest], faces: [[IC.flag, 'Depart'], [IC.flag, 'Departing…'], [IC.flag, 'On the Hunt']], disabled: quest !== 'idle', onClick: depart })}
      {b({ key: 'equip', kind: 'sec', icon: IC.shield, label: 'Equipment', onClick: () => say('Equipment box opened') })}
      {b({ key: 'abandon', kind: 'ter', icon: IC.close, label: 'Abandon', disabled: quest !== 'out', onClick: abandon })}
    </>,
    <>
      {b({ key: 'forge', kind: 'pri', icon: IC.hammer, label: 'Forge', disabled: mats < 3, onClick: forge })}
      {b({ key: 'gather', kind: 'sec', icon: IC.leaf, label: `Gather ${mats}/3`, face: 'gather', faces: [[IC.leaf, 'Gather 0/3']], disabled: mats >= 3, onClick: () => setMats((m) => Math.min(3, m + 1)) })}
      {b({ key: 'back', kind: 'ter', icon: IC.back, label: 'Back', onClick: () => say('Back to camp') })}
    </>,
    <>
      <SlideGroup sys="bc" label="Party size" items={PARTY} value={party} onChange={setParty} content={content} />
      {b({ key: 'post', kind: 'pri', icon: posted ? IC.check : IC.send, label: posted ? 'Posted' : 'Post Quest', faces: [[IC.send, 'Post Quest'], [IC.check, 'Posted']], onClick: post })}
      {b({ key: 'reset', kind: 'ter', icon: IC.reset, label: 'Reset', disabled: party === 0, onClick: () => setParty(0) })}
    </>,
  ]
  const status = note || [
    { idle: 'Hunt: Rathalos · Ancient Forest', going: 'Departing for the Ancient Forest…', out: 'On the hunt · 50:00 left' }[quest],
    `Materials ${mats} of 3${mats >= 3 ? ' · ready to forge' : ''}`,
    `Party: ${PARTY[party].label}${posted ? ' · quest posted to the board' : ''}`,
  ][ex]
  return (
    <div className="ex">
      <div className="ex-stage">
        <div className="bt-row bc-row">{views[ex]}</div>
        {!auto && <p className="tb-status" aria-live="polite">{status}</p>}
      </div>
      {!auto && (
        <div className="ex-controls">
          <SlideSwitch sys="bc" label="Example" items={BC_EX} value={ex} onChange={setEx} />
          <SlideSwitch sys="bc" label="Content" items={CONTENT} value={ci} onChange={setCi} />
        </div>
      )}
    </div>
  )
}

/* ================= MONUMENTAL · The Index =================
   Buttons for an archive of structures, cut like carved lettering: square, heavy, ruled. A slab wipes in from the left on
   hover, the way the Index rows fill, and a press turns it rust. */
const IX_EX = ['Record', 'Visit', 'Drawings']
const SLOTS = [{ label: 'Morning', icon: IC.dawn }, { label: 'Midday', icon: IC.sun }, { label: 'Evening', icon: IC.moon }]
const DRAW = [{ label: 'Plan', icon: IC.plan }, { label: 'Section', icon: IC.section }, { label: 'Elevation', icon: IC.elev }]

function IndexSet({ auto, offset = 0 }) {
  const [ex, setEx] = useState(offset % 3)
  const [ci, setCi] = useState(0)
  const content = CMODE[ci]
  const [note, say] = useNote()
  const later = useLater()
  const [saved, setSaved] = useState(false)
  const [slot, setSlot] = useState(null)
  const [booked, setBooked] = useState(false)
  const [d, setD] = useState(0)
  const [print, setPrint] = useState('idle') // idle · busy · done
  const printNow = () => { setPrint('busy'); later(() => { setPrint('done'); later(() => setPrint('idle'), 1400) }, 1200) }
  const pickSlot = (i) => { setSlot(i); setBooked(false) }

  const latest = useRef(); latest.current = { slot, printNow }
  useEffect(() => {
    if (!auto) return
    let k = offset
    const t = setInterval(() => {
      const L = latest.current
      const s = k++ % 6
      if (s === 0) setSaved((v) => !v)
      else if (s === 2) { if (L.slot == null) pickSlot(1); else setBooked(true) }
      else if (s === 3) setD((v) => (v + 1) % 3)
      else if (s === 4) L.printNow()
      else setEx((v) => (v + 1) % 3)
    }, 1300)
    return () => clearInterval(t)
  }, [auto, offset])

  const b = ({ key, ...props }) => <Btn key={key} sys="ix" content={content} {...props} />
  const views = [
    <>
      {b({ key: 'view', kind: 'pri', icon: IC.arrow, label: 'View plans', onClick: () => say('Plans of the Pantheon opened') })}
      {b({ key: 'save', kind: 'sec', icon: saved ? IC.check : IC.mark, label: saved ? 'Saved' : 'Save', faces: [[IC.mark, 'Save'], [IC.check, 'Saved']], onClick: () => setSaved((v) => !v) })}
      {b({ key: 'cite', kind: 'ter', icon: IC.quote, label: 'Cite', onClick: () => say('Citation copied') })}
    </>,
    <>
      <SlideGroup sys="ix" label="Visiting time" items={SLOTS} value={slot} onChange={pickSlot} content={content} />
      {b({ key: 'book', kind: 'pri', icon: booked ? IC.check : IC.cal, label: booked ? 'Booked' : 'Book', faces: [[IC.cal, 'Book'], [IC.check, 'Booked']], disabled: slot == null || booked, onClick: () => setBooked(true) })}
      {b({ key: 'clear', kind: 'ter', icon: IC.close, label: 'Clear', disabled: slot == null, onClick: () => { setSlot(null); setBooked(false) } })}
    </>,
    <>
      <SlideGroup sys="ix" label="Drawing" items={DRAW} value={d} onChange={setD} content={content} />
      {b({ key: 'print', kind: 'pri', icon: print === 'done' ? IC.check : IC.print, label: { idle: 'Print', busy: 'Printing…', done: 'Printed' }[print], faces: [[IC.print, 'Print'], [IC.print, 'Printing…'], [IC.check, 'Printed']], disabled: print !== 'idle', onClick: printNow })}
      {b({ key: 'enlarge', kind: 'ter', icon: IC.expand, label: 'Enlarge', onClick: () => say(`${DRAW[d].label} at full size`) })}
    </>,
  ]
  const status = note || [
    `Pantheon · 126 AD${saved ? ' · saved to your index' : ''}`,
    slot == null ? 'Pick a time to visit' : booked ? `Booked · Saturday, ${SLOTS[slot].label.toLowerCase()}` : `${SLOTS[slot].label} · not booked yet`,
    print === 'busy' ? `Printing the ${DRAW[d].label.toLowerCase()}…` : print === 'done' ? 'Printed · A1 at 1:200' : `${DRAW[d].label} · Pantheon, 1:200`,
  ][ex]
  return (
    <div className="ex">
      <div className="ex-stage">
        <div className="bt-row ix-row">{views[ex]}</div>
        {!auto && <p className="tb-status" aria-live="polite">{status}</p>}
      </div>
      {!auto && (
        <div className="ex-controls">
          <SlideSwitch sys="ix" label="Example" items={IX_EX} value={ex} onChange={setEx} />
          <SlideSwitch sys="ix" label="Content" items={CONTENT} value={ci} onChange={setCi} />
        </div>
      )}
    </div>
  )
}

/* ================= MATTER-OF-FACT · Heads Up =================
   After the trycoffee download button (Are.na 25471305): a button that tells you what will happen before you press it, and what
   happened after. Its content rides on a strip seen through the button: at rest [icon][label]; hover or focus slides the strip so the
   label stays and the next piece of information comes in ([label][what happens]); after the press the strip lifts away and the result
   rises in. The button is as wide as its widest frame, so it never changes size. */
function HuBtn({ kind = 'pri', seg, icon, label, labelSize, next, result = [], done = null, content = 'both', mono, size, shape, fill, fluid, onMeasured, className = '', style, ...rest }) {
  const btn = useRef(null), strip = useRef(null), res = useRef(null)
  const [geo, setGeo] = useState(null)
  const [ready, setReady] = useState(false)
  // placed without motion the first time; it only slides once it has been seen in place
  useEffect(() => { if (!geo) return; onMeasured?.(); if (!ready) { const r = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(r) } }, [geo]) // eslint-disable-line react-hooks/exhaustive-deps
  const showIcon = content !== 'text', showText = content !== 'icon'
  const A = showIcon && icon, B = showText && label
  const nT = showText && next?.text, nI = next?.icon && (showIcon || !next?.text)
  const measure = () => {
    const s = strip.current, b = btn.current
    if (!s || !b) return
    const box = (p) => { const el = s.querySelector(`[data-p="${p}"]`); return el && { l: el.offsetLeft, r: el.offsetLeft + el.offsetWidth } }
    const a = box('a'), t = box('b'), c = box('c')
    const f0 = [a || t, t || a], f1 = c ? [t || c, c] : f0
    if (!f0[0]) return
    const w0 = f0[1].r - f0[0].l, w1 = f1[1].r - f1[0].l
    const wr = Math.max(0, ...[...res.current.children].map((el) => el.offsetWidth))
    const pad = parseFloat(getComputedStyle(b).getPropertyValue('--pad')) || 20
    const W = content === 'icon' ? b.offsetHeight : Math.ceil(Math.max(w0, w1, wr) + 2 * pad)
    setGeo((g) => (g && g.W === W && Math.abs(g.o0 - ((W - w0) / 2 - f0[0].l)) < .5 && Math.abs(g.o1 - ((W - w1) / 2 - f1[0].l)) < .5 ? g : { W, o0: (W - w0) / 2 - f0[0].l, o1: (W - w1) / 2 - f1[0].l }))
  }
  useLayoutEffect(measure, [label, labelSize, icon, next?.text, next?.size, next?.icon, content, size, result.map((r) => r.text).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.fonts?.ready.then(measure) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <button ref={btn} type="button" className={`bt hu-${seg ? 'seg' : 'b'} ${seg ? '' : `is-${kind}`} ${content === 'icon' ? 'is-icon' : ''} ${done != null ? 'is-done' : ''} ${nT || nI ? 'has-next' : ''} ${size ? `sz sz-${size}` : ''} ${shape ? `shape-${shape}` : ''} ${fluid ? 'is-fluid' : ''} ${ready ? '' : 'is-measuring'} ${className}`}
      aria-label={content === 'icon' ? label : undefined} title={content === 'icon' ? label : undefined}
      style={{ width: fluid ? undefined : geo?.W, '--o0': `${geo?.o0 ?? 0}px`, '--o1': `${geo?.o1 ?? 0}px`, ...style }} {...rest}>
      <span className="hu-strip" ref={strip} aria-hidden={done != null ? true : undefined}>
        {A && <span data-p="a" className={`hu-p hu-ic ${fill ? 'is-fill' : ''}`}>{li(icon)}</span>}
        {B && <span data-p="b" className={`hu-p ${mono ? 'is-mono' : ''}`}>{labelSize ? <span className="hu-stack"><span className="sz">{labelSize}</span><span>{label}</span></span> : label}</span>}
        {(nT || nI) && <span data-p="c" className="hu-p hu-next" aria-hidden="true">{nT && <span className="hu-stack"><span className="sz">{next.size || next.text}</span><span>{next.text}</span></span>}{nI && <span className="hu-ic">{li(next.icon)}</span>}</span>}
      </span>
      <span className="hu-res" ref={res} aria-live="polite">
        {result.map((r, i) => (
          <span key={i} className={`hu-p hu-face ${i === done ? 'on' : ''}`} aria-hidden={i === done ? undefined : true}>
            {showIcon && r.icon && <span className={`hu-ic ${r.spin ? 'hu-spin' : ''}`}>{li(r.icon)}</span>}{(showText || !r.icon) && <span>{r.text}</span>}
          </span>
        ))}
      </span>
    </button>
  )
}

// a group: one indicator slides to the choice, and the choice keeps its extra information showing
function HuGroup({ label, items, value, onChange, content = 'both', className = '' }) {
  const box = useRef(null)
  const [sized, setSized] = useState(0)
  const [live, setLive] = useState(false)
  const sel = useMarker(box, value != null ? `[data-i="${value}"]` : null, [value, content, sized, items.map((it) => it.info).join()])
  // the indicator is placed, not flown in: it only starts gliding once the choices have their widths
  useEffect(() => {
    if (!sized || live) return
    let r = requestAnimationFrame(() => { r = requestAnimationFrame(() => setLive(true)) })
    return () => cancelAnimationFrame(r)
  }, [sized]) // eslint-disable-line react-hooks/exhaustive-deps
  const keys = (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = mod((value ?? -d) + d, items.length)
    onChange(n)
    e.currentTarget.querySelector(`[data-i="${n}"]`)?.focus()
  }
  return (
    <div className={`hu-grp ${className}`} ref={box} role="radiogroup" aria-label={label} onKeyDown={keys}>
      {sel && <i className={`hu-sel ${live ? '' : 'is-still'}`} aria-hidden="true" style={{ transform: `translate(${sel.x}px, ${sel.y}px)`, width: sel.w, height: sel.h }} />}
      {items.map((it, i) => (
        <HuBtn key={it.label} seg icon={it.icon} label={it.label} next={it.info ? { text: it.info } : null} content={it.icon ? content : 'text'} data-i={i} role="radio" aria-checked={i === value}
          tabIndex={i === (value ?? 0) ? 0 : -1} className={`${i === value ? 'is-sel' : ''} ${it.cls || ''}`} onClick={() => onChange(i)} onMeasured={() => setSized((n) => n + 1)} />
      ))}
    </div>
  )
}
function HuSwitch({ label, items, value, onChange }) {
  return (
    <div className="sw">
      <span className="sw-k">{label}</span>
      <HuGroup label={label} items={items.map((t) => ({ label: t }))} value={value} onChange={onChange} />
    </div>
  )
}

const HU_EX = ['Download', 'Plans', 'Team']
const BILLING = [{ label: 'Monthly', icon: IC.cal, info: '$10' }, { label: 'Yearly', icon: IC.reset, info: '−20%' }]

function HeadsSet({ auto, offset = 0 }) {
  const [ex, setEx] = useState(offset % 3)
  const [ci, setCi] = useState(0)
  const content = CMODE[ci]
  const [note, say] = useNote()
  const later = useLater()
  const [dl, setDl] = useState(null) // null · 0 downloading · 1 downloaded
  const [copied, setCopied] = useState(null)
  const [opening, setOpening] = useState(null)
  const [yearly, setYearly] = useState(0)
  const [pro, setPro] = useState(false)
  const [proDone, setProDone] = useState(null)
  const [cancelDone, setCancelDone] = useState(null)
  const [seats, setSeats] = useState(3)
  const [sent, setSent] = useState(null)
  const [linked, setLinked] = useState(null)
  const [removed, setRemoved] = useState(null)
  const flash = (set, ms = 1500, after) => { set(0); later(() => { set(null); after?.() }, ms) }

  const download = () => { setDl(0); later(() => { setDl(1); later(() => setDl(null), 1500) }, 1400) }
  const getPro = () => { setProDone(0); setPro(true) }
  const cancel = () => flash(setCancelDone, 1300, () => { setPro(false); setProDone(null) })
  const invite = () => { setSeats((n) => n - 1); flash(setSent, 1300) }
  const remove = () => { setSeats((n) => n + 1); flash(setRemoved, 1300) }

  const latest = useRef(); latest.current = { download, invite, remove, seats, pro, getPro, cancel }
  useEffect(() => {
    if (!auto) return
    let k = offset
    const t = setInterval(() => {
      const L = latest.current
      const s = k++ % 6
      if (s === 0) L.download()
      else if (s === 2) flash(setCopied, 1300)
      else if (s === 3) { if (L.pro) L.cancel(); else L.getPro() }
      else if (s === 4) { if (L.seats > 0) L.invite(); else L.remove() }
      else setEx((v) => (v + 1) % 3)
    }, 1500)
    return () => clearInterval(t)
  }, [auto, offset]) // eslint-disable-line react-hooks/exhaustive-deps

  const b = ({ key, ...p }) => <HuBtn key={key} content={content} {...p} />
  const price = yearly ? '$96 / yr' : '$10 / mo'
  const views = [
    <>
      {b({ key: 'dl', kind: 'pri', icon: IC.laptop, label: 'Download for Mac', next: { text: '92 MB', icon: IC.download },
        result: [{ icon: IC.arc, spin: true, text: 'Downloading…' }, { icon: IC.check, text: 'Downloaded' }], done: dl, disabled: dl === 0, onClick: download })}
      {b({ key: 'brew', kind: 'sec', icon: IC.term, label: 'brew install coffee', mono: true, next: { text: 'Copy', icon: IC.copy },
        result: [{ icon: IC.check, text: 'Copied' }], done: copied, onClick: () => flash(setCopied) })}
      {b({ key: 'notes', kind: 'ter', icon: IC.doc, label: 'Release notes', next: { text: 'v2.4', icon: IC.arrow },
        result: [{ icon: IC.arc, spin: true, text: 'Opening…' }], done: opening, onClick: () => flash(setOpening, 1100, () => say('Release notes 2.4 opened')) })}
    </>,
    <>
      <HuGroup label="Billing" items={BILLING} value={yearly} onChange={setYearly} content={content} />
      {b({ key: 'pro', kind: 'pri', icon: IC.spark, label: 'Get Pro', next: { text: price, size: '$96 / yr', icon: IC.arrow },
        result: [{ icon: IC.check, text: 'You\'re on Pro' }], done: proDone, disabled: pro, onClick: getPro })}
      {b({ key: 'cancel', kind: 'ter', icon: IC.close, label: 'Cancel plan', next: { text: 'ends 31 Dec' },
        result: [{ icon: IC.check, text: 'Cancelled' }], done: cancelDone, disabled: !pro, onClick: cancel })}
    </>,
    <>
      {b({ key: 'invite', kind: 'pri', icon: IC.invite, label: 'Invite', next: { text: seats === 0 ? 'No seats left' : seats === 1 ? '1 seat left' : `${seats} seats left`, size: 'No seats left' },
        result: [{ icon: IC.check, text: 'Invite sent' }], done: sent, disabled: seats === 0 && sent == null, onClick: invite })}
      {b({ key: 'link', kind: 'sec', icon: IC.link, label: 'Copy invite link', next: { text: '7 days', icon: IC.clock },
        result: [{ icon: IC.check, text: 'Link copied' }], done: linked, onClick: () => flash(setLinked) })}
      {b({ key: 'remove', kind: 'ter', icon: IC.close, label: 'Remove', next: { text: 'last invite' },
        result: [{ icon: IC.check, text: 'Removed' }], done: removed, disabled: seats === 3 && removed == null, onClick: remove })}
    </>,
  ]
  const status = note || [
    dl === 0 ? 'Downloading Coffee 2.4 for Mac…' : dl === 1 ? 'Downloaded · drag Coffee to Applications' : copied != null ? 'Install command copied' : 'Coffee 2.4 · macOS 13 or later',
    pro ? `On Pro, billed ${yearly ? 'yearly' : 'monthly'}` : `Free plan · Pro is ${price}${yearly ? ', 20% less than monthly' : ''}`,
    seats === 0 ? 'All 3 seats used · remove someone to invite again' : `${3 - seats} of 3 seats used`,
  ][ex]
  return (
    <div className="ex">
      <div className="ex-stage">
        <div className="bt-row hu-row">{views[ex]}</div>
        {!auto && <p className="tb-status" aria-live="polite">{status}</p>}
      </div>
      {!auto && (
        <div className="ex-controls">
          <HuSwitch label="Example" items={HU_EX} value={ex} onChange={setEx} />
          <HuSwitch label="Content" items={CONTENT} value={ci} onChange={setCi} />
        </div>
      )}
    </div>
  )
}

/* ================= MATTER-OF-FACT · Every Button =================
   The Heads Up idea carried through Material 3's whole button catalogue: every type says what will happen before the press and what
   happened after. Five sizes (XS 32, S 40, M 56, L 96, XL 136), square or round, and the shape changes when pressed or turned on. */
const SIZES = ['xs', 's', 'm', 'l', 'xl']
const SIZE_H = { xs: 32, s: 40, m: 56, l: 96, xl: 136 }

// icon buttons have no room for the next fact, so a tooltip says it
function HuIcon({ tip, kind = 'tonal', icon, label, size = 's', shape, width = 'default', on, fill, className = '', ...rest }) {
  return (
    <span className={`hu-wrap ${className}`}>
      <HuBtn kind={kind} icon={icon} label={label} content="icon" size={size} shape={shape} fill={fill} fluid
        className={`hu-ib w-${width} ${on != null ? 'is-toggle' : ''} ${on ? 'is-on' : ''} ${className}`} aria-pressed={on} {...rest} />
      {tip && <span className="hu-tip" role="tooltip">{tip}</span>}
    </span>
  )
}

// split button: the main action, 2 apart from a menu button whose chevron turns and whose corners round while the menu is open
function HuSplit({ size = 's', kind = 'filled', shape, lead, menu, onPick, open: forced, className = '' }) {
  const [openState, setOpen] = useState(false)
  const open = forced ?? openState
  const box = useRef(null)
  useEffect(() => {
    if (!openState) return
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [openState])
  return (
    <span className={`hu-split sz-${size} ${open ? 'is-open' : ''} ${className}`} ref={box}>
      <HuBtn kind={kind} size={size} shape={shape} {...lead} className={`hu-lead ${lead.className || ''}`} />
      <button type="button" className={`bt hu-b hu-trail is-${kind} sz sz-${size} ${shape ? `shape-${shape}` : ''}`} aria-haspopup="menu" aria-expanded={open} disabled={lead.disabled}
        aria-label={`More ways to ${lead.label.toLowerCase()}`} onClick={() => setOpen((v) => !v)}>
        <span className="hu-ic hu-chev">{li(IC.chev)}</span>
      </button>
      {open && (
        <span className="hu-menu" role="menu">
          {menu.map((it) => (
            <button key={it.label} type="button" role="menuitem" className="hu-mi" onClick={() => { setOpen(false); onPick?.(it) }}>
              <span className="hu-ic">{li(it.icon)}</span><span className="hu-mi-l">{it.label}</span><span className="hu-mi-i">{it.info}</span>
            </button>
          ))}
        </span>
      )}
    </span>
  )
}

// standard button group: pressing a button widens it and its neighbours give way; the group keeps its width
function HuStdGroup({ size = 's', shape, items, label }) {
  const H = SIZE_H[size]
  const base = items.map((it) => Math.round(H * ({ narrow: 0.8, wide: 1.3 }[it.width] || 1)))
  const [down, setDown] = useState(null)
  const d = Math.round(H * 0.15)
  const widths = base.map((w, i) => {
    if (down == null) return w
    if (i === down) return w + d
    const n = (down > 0 ? 1 : 0) + (down < items.length - 1 ? 1 : 0)
    return Math.abs(i - down) === 1 ? w - d / n : w
  })
  return (
    <span className={`hu-std sz-${size}`} role="group" aria-label={label} onPointerLeave={() => setDown(null)}>
      {items.map((it, i) => (
        <HuIcon key={it.label} {...it} size={size} shape={shape} style={{ width: widths[i] }}
          onPointerDown={() => setDown(i)} onPointerUp={() => setDown(null)} />
      ))}
    </span>
  )
}

// connected button group: choices 2 apart; the chosen one fills, turns fully round, and keeps its extra fact showing
function HuConnected({ size = 's', items, value, onChange, label }) {
  const keys = (e) => {
    const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!k) return
    e.preventDefault()
    const n = mod(value + k, items.length)
    onChange(n)
    e.currentTarget.querySelector(`[data-i="${n}"]`)?.focus()
  }
  return (
    <span className={`hu-con sz-${size}`} role="radiogroup" aria-label={label} onKeyDown={keys}>
      {items.map((it, i) => (
        <HuBtn key={it.label} kind={i === value ? 'filled' : 'tonal'} size={size} icon={it.icon} label={it.label} next={{ text: it.info }} data-i={i}
          role="radio" aria-checked={i === value} tabIndex={i === value ? 0 : -1} className={`hu-ci ${i === value ? 'is-sel' : ''}`} onClick={() => onChange(i)} />
      ))}
    </span>
  )
}

// FAB menu: opens from the FAB, in its place, with 2–6 related actions; the FAB becomes a round close button
function HuFabMenu({ items, onPick, open: forced, label = 'New', fab = 's', round }) {
  const [openState, setOpen] = useState(false)
  const open = forced ?? openState
  return (
    <span className={`hu-fabm ${open ? 'is-open' : ''}`}>
      {open && (
        <span className="hu-fabm-list" role="menu">
          {items.map((it, i) => (
            <button key={it.label} type="button" role="menuitem" className="hu-fabm-item" style={{ '--k': items.length - 1 - i }} onClick={() => { setOpen(false); onPick?.(it) }}>
              <span className="hu-ic">{li(it.icon)}</span><span>{it.label}</span><span className="hu-mi-i">{it.info}</span>
            </button>
          ))}
        </span>
      )}
      <button type="button" className={`bt hu-fab fab-${fab} ${round ? 'is-round' : ''}`} aria-expanded={open} aria-label={open ? 'Close' : label} onClick={() => setOpen((v) => !v)}>
        <span className="hu-ic hu-fab-x">{li(IC.plus)}</span>
      </button>
    </span>
  )
}

const EB_EX = ['Split', 'Toggle', 'Groups', 'FAB']
const SEND_MENU = [{ icon: IC.clock, label: 'Send later', info: 'tomorrow 9:00' }, { icon: IC.doc, label: 'Send as PDF', info: '1 page' }, { icon: IC.cal, label: 'Schedule', info: 'pick a time' }]
const ROUTE = [{ label: 'Walk', icon: IC.walk, info: '25 min' }, { label: 'Bike', icon: IC.bike, info: '9 min' }, { label: 'Drive', icon: IC.car, info: '6 min' }]
const NEW_ITEMS = [{ icon: IC.note, label: 'Note', info: '⌘N' }, { icon: IC.list2, label: 'Checklist', info: '⌘L' }, { icon: IC.photo, label: 'Photo', info: '⌘P' }, { icon: IC.mic, label: 'Voice memo', info: '⌘R' }]

function EveryButtonSet({ auto, offset = 0 }) {
  const [ex, setEx] = useState(offset % 4)
  const [si, setSi] = useState(1)
  const [round, setRound] = useState(0)
  const size = SIZES[si], shape = round ? 'round' : 'square'
  const fab = { l: 'm', xl: 'l' }[size] || 's' // FABs come in three sizes: 56, 80, 96
  const [note, say] = useNote()
  const later = useLater()
  const [sent, setSent] = useState(null)
  const [archived, setArchived] = useState(null)
  const [follow, setFollow] = useState(false)
  const [notify, setNotify] = useState(false)
  const [saved, setSaved] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [track, setTrack] = useState(3)
  const [route, setRoute] = useState(1)
  const [drafted, setDrafted] = useState(null)
  const flash = (set, ms = 1500) => { set(0); later(() => set(null), ms) }
  const SENT = ['Sent', 'Scheduled', 'Sent as PDF']
  const send = (i = 0) => { setSent(i); later(() => setSent(null), 1500) }

  const latest = useRef(); latest.current = { send }
  useEffect(() => {
    if (!auto) return
    let k = offset
    const t = setInterval(() => {
      const s = k++ % 6
      if (s === 0) latest.current.send()
      else if (s === 2) setFollow((v) => !v)
      else if (s === 3) setPlaying((v) => !v)
      else if (s === 4) setRoute((v) => (v + 1) % 3)
      else setEx((v) => (v + 1) % 4)
    }, 1500)
    return () => clearInterval(t)
  }, [auto, offset])

  const views = [
    <>
      <HuSplit size={size} shape={shape} lead={{ icon: IC.send, label: 'Send', next: { text: 'to Tanya' }, result: [{ icon: IC.check, text: SENT[0] }, { icon: IC.clock, text: SENT[1] }, { icon: IC.doc, text: SENT[2] }], done: sent, onClick: () => send(0) }}
        menu={SEND_MENU} onPick={(it) => send({ 'Send later': 1, 'Send as PDF': 2, Schedule: 1 }[it.label])} />
      <HuBtn kind="tonal" size={size} shape={shape} icon={IC.archive} label="Archive" next={{ text: '⌘E' }} result={[{ icon: IC.check, text: 'Archived' }]} done={archived} onClick={() => flash(setArchived)} />
      <HuBtn kind="text" size={size} shape={shape} icon={IC.close} label="Discard" next={{ text: 'can’t undo' }} result={[{ icon: IC.check, text: 'Discarded' }]} onClick={() => say('Draft discarded')} />
    </>,
    <>
      <HuBtn kind="filled" size={size} shape={shape} className={`is-toggle ${follow ? 'is-on' : ''}`} aria-pressed={follow} icon={follow ? IC.check : IC.plus} label={follow ? 'Following' : 'Follow'} labelSize="Following"
        next={{ text: follow ? 'Unfollow' : 'weekly digest', size: 'weekly digest' }} onClick={() => setFollow((v) => !v)} />
      <HuIcon size={size} shape={shape} kind="tonal" icon={IC.bell} label={notify ? 'Mute' : 'Notify'} on={notify} fill={notify} tip={notify ? 'Mute · no more alerts' : 'Notify · each new post'} onClick={() => setNotify((v) => !v)} />
      <HuIcon size={size} shape={shape} kind="tonal" icon={IC.mark} label={saved ? 'Unsave' : 'Save'} on={saved} fill={saved} tip={saved ? 'Remove · from Reading list' : 'Save · to Reading list'} onClick={() => setSaved((v) => !v)} />
      <HuIcon size={size} shape={shape} kind="text" icon={IC.more} label="More" tip="More · share, report" onClick={() => say('More: share, copy link, report')} />
    </>,
    <>
      <HuStdGroup size={size} shape={shape} label="Player" items={[
        { kind: 'tonal', icon: IC.prev, label: 'Previous', tip: `Back · track ${track - 1 || 12}`, onClick: () => setTrack((t) => (t + 10) % 12 + 1) },
        { kind: 'filled', icon: playing ? IC.pause : IC.play, label: playing ? 'Pause' : 'Play', width: 'wide', on: playing, tip: playing ? 'Pause' : `Play · track ${track}`, onClick: () => setPlaying((v) => !v) },
        { kind: 'tonal', icon: IC.next, label: 'Next', tip: `Next · track ${track % 12 + 1}`, onClick: () => setTrack((t) => t % 12 + 1) },
      ]} />
      <HuConnected size={size} label="Route" items={ROUTE} value={route} onChange={setRoute} />
    </>,
    <>
      <HuBtn kind="filled" className={`hu-xfab xfab-${fab} ${round ? 'is-round' : ''}`} icon={IC.pen} label="Compose" next={{ text: 'new draft' }} result={[{ icon: IC.check, text: 'Draft created' }]} done={drafted} onClick={() => flash(setDrafted)} />
      <HuFabMenu items={NEW_ITEMS} fab={fab} round={round} onPick={(it) => say(`New ${it.label.toLowerCase()} created`)} />
    </>,
  ]
  const status = note || [
    sent != null ? `${SENT[sent]} · to Tanya${sent === 1 ? ', tomorrow 9:00' : ''}` : archived != null ? 'Archived · find it under All mail' : 'Draft to Tanya · 2 attachments',
    `${follow ? 'Following' : 'Not following'} · alerts ${notify ? 'on' : 'off'} · ${saved ? 'saved' : 'not saved'}`,
    `Track ${track} of 12 · ${playing ? 'playing' : 'paused'} · ${ROUTE[route].label.toLowerCase()}, ${ROUTE[route].info}`,
    drafted != null ? 'Draft created · 4 notes' : '4 notes · last edited 2 min ago',
  ][ex]
  return (
    <div className="ex">
      <div className={`ex-stage ${ex === 3 ? 'eb-fab-stage' : ''}`}>
        <div className={`bt-row eb-row ${ex === 3 ? 'is-fab' : ''}`}>{views[ex]}</div>
        {!auto && <p className="tb-status" aria-live="polite">{status}</p>}
      </div>
      {!auto && (
        <div className="ex-controls">
          <HuSwitch label="Example" items={EB_EX} value={ex} onChange={setEx} />
          <HuSwitch label="Size" items={['XS', 'S', 'M', 'L', 'XL']} value={si} onChange={setSi} />
          <HuSwitch label="Shape" items={['Square', 'Round']} value={round} onChange={setRound} />
        </div>
      )}
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
const Row = ({ children }) => <div className="bt-row">{children}</div>

// a frozen group: the chosen one drawn in place (no live indicator to measure)
function StaticGroup({ sys, items, sel = 0, content = 'both', st, off }) {
  return (
    <div className={`${sys}-grp`}>
      {items.map((it, i) => <Btn key={it.label} sys={sys} seg icon={it.icon} label={it.label} content={content} disabled={i === off} className={`${i === sel ? 'is-sel st-sel' : ''} ${st && i === st[0] ? st[1] : ''}`} />)}
    </div>
  )
}

// states: one row per emphasis, one column per state
function StateGrid({ cols, rows }) {
  return (
    <div className="sg-wrap">
      <div className="sg" style={{ '--cols': cols.length }} inert="" aria-hidden="true">
        <span />
        {cols.map((c) => <span key={c} className="sg-h">{c}</span>)}
        {rows.map(([k, cells]) => [
          <span key={k} className="sg-k">{k}</span>,
          ...cells.map((n, i) => <div key={`${k}${i}`} className="sg-c">{n}</div>),
        ])}
      </div>
    </div>
  )
}

const CM = (p) => <Btn sys="cm" {...p} />
const CL = (p) => <Btn sys="cl" {...p} />
const CM_TRIO = [{ kind: 'pri', icon: IC.play, label: 'Play' }, { kind: 'sec', icon: IC.plus, label: 'Add to Library' }, { kind: 'ter', icon: IC.info, label: 'Details' }]
const CL_TRIO = [{ kind: 'pri', icon: IC.download, label: 'Export' }, { kind: 'sec', icon: IC.link, label: 'Copy link' }, { kind: 'ter', icon: IC.close, label: 'Cancel' }]
const BC = (p) => <Btn sys="bc" {...p} />
const IX = (p) => <Btn sys="ix" {...p} />
const BC_TRIO = [{ kind: 'pri', icon: IC.flag, label: 'Depart' }, { kind: 'sec', icon: IC.shield, label: 'Equipment' }, { kind: 'ter', icon: IC.close, label: 'Abandon' }]
const BC_STATE = [BC_TRIO[0], { kind: 'sec', icon: IC.shield, label: 'Equip' }, { kind: 'ter', icon: IC.close, label: 'Quit' }]
const IX_TRIO = [{ kind: 'pri', icon: IC.arrow, label: 'View plans' }, { kind: 'sec', icon: IC.mark, label: 'Save' }, { kind: 'ter', icon: IC.quote, label: 'Cite' }]
const IX_STATE = [{ kind: 'pri', icon: IC.arrow, label: 'View' }, IX_TRIO[1], IX_TRIO[2]]
const HU = (p) => <HuBtn {...p} />
const HU_TRIO = [
  { kind: 'pri', icon: IC.laptop, label: 'Download for Mac', next: { text: '92 MB', icon: IC.download }, result: [{ icon: IC.check, text: 'Downloaded' }] },
  { kind: 'sec', icon: IC.term, label: 'brew install coffee', mono: true, next: { text: 'Copy', icon: IC.copy }, result: [{ icon: IC.check, text: 'Copied' }] },
  { kind: 'ter', icon: IC.doc, label: 'Release notes', next: { text: 'v2.4', icon: IC.arrow }, result: [{ icon: IC.arrow, text: 'Opening' }] },
]
const HU_STATE = [
  { kind: 'pri', icon: IC.spark, label: 'Get Pro', next: { text: '$10 / mo' }, result: [{ icon: IC.check, text: 'On Pro' }] },
  { kind: 'sec', icon: IC.link, label: 'Copy link', next: { text: '7 days' }, result: [{ icon: IC.check, text: 'Copied' }] },
  { kind: 'ter', icon: IC.close, label: 'Remove', next: { text: 'Tanya' }, result: [{ icon: IC.check, text: 'Removed' }] },
]
const EB_SEND = { icon: IC.send, label: 'Send', next: { text: 'to Tanya' }, result: [{ icon: IC.check, text: 'Sent' }] }
const ebColor = (kind, label) => <HuBtn kind={kind} size="s" icon={IC.send} label={label} next={{ text: 'to Tanya' }} />
const trio = (Make, list, content) => <Row>{list.map((p) => <Make key={p.kind} {...p} content={content} />)}</Row>
const CM_STATE = [CM_TRIO[0], { kind: 'sec', icon: IC.plus, label: 'Library' }, CM_TRIO[2]]
const stateCells = (Make, p, hover) => [
  <Make {...p} />, <Make {...p} className={hover} />, <Make {...p} className={`${hover} is-press st-press`} />, <Make {...p} disabled />,
]

const SETS = [
  {
    id: 'couch', tone: 'Futuristic, Couch Mode',
    about: 'Buttons for a living-room screen, read from across the room and driven by a controller. One focus ring glides between them; disabled buttons are skipped.',
    keys: [
      { d: 'Move', k: [['←', '→']], or: 'or point' },
      { d: 'Press', k: [['Enter']], or: 'or click' },
      { d: 'Switch example', k: [['Q', 'E'], ['LB', 'RB']] },
      { d: 'Switch content', k: [['Z', 'C']] },
    ],
    Body: CouchSet,
    configs: [
      { title: 'Emphasis', row: true, items: CM_TRIO.map((p, i) => [['Primary: filled light', 'Secondary: dark fill and edge', 'Tertiary: edge only'][i], <CM {...p} />]) },
      { title: 'Content', items: [
        ['Icon and text', trio(CM, CM_TRIO, 'both')],
        ['Text only', trio(CM, CM_TRIO, 'text')],
        ['Icon only: 48 × 48, the label moves to the accessible name', trio(CM, CM_TRIO, 'icon')],
      ] },
      { title: 'Button group · single selection', items: [
        ['Icon and text: one indicator moves between the choices', <StaticGroup sys="cm" items={MODES} sel={1} />],
        ['Text only', <StaticGroup sys="cm" items={MODES} sel={1} content="text" />],
        ['Icon only', <StaticGroup sys="cm" items={MODES} sel={1} content="icon" />],
      ] },
    ],
    states: <StateGrid cols={['Enabled', 'Focus (hover)', 'Pressed', 'Disabled']} rows={[
      ...CM_STATE.map((p, i) => [['Primary', 'Secondary', 'Tertiary'][i], stateCells(CM, p, 'is-focus st-focus')]),
      ['Group choice', [
        <StaticGroup sys="cm" items={MODES} sel={0} content="icon" />,
        <StaticGroup sys="cm" items={MODES} sel={0} content="icon" st={[1, 'is-focus st-focus']} />,
        <StaticGroup sys="cm" items={MODES} sel={0} content="icon" st={[1, 'is-focus st-focus is-press st-press']} />,
        <StaticGroup sys="cm" items={MODES} sel={0} content="icon" off={1} />,
      ]],
    ]} />,
    spec: [
      ['Button', [['Height', '48 · icon only 48 × 48'], ['Padding', '0 × 20'], ['Icon to label', '10'], ['Icon', '20 × 20 · line 1.5'], ['Buttons apart', '12']]],
      ['Group', [['Container', '48 high · padding 4 · radius 12'], ['Choice', '40 high · padding 0 × 16 · icon only 40 × 40'], ['Choices apart', '2']]],
      ['Type', [['Font', 'Inter Medium'], ['Size / line height', '15 / 20'], ['Numbers', 'tabular, so a counting label holds still']]],
      ['Shape', [['Corner radius', 'buttons 8 · group 12 · choices 8 · rings 8'], ['Stroke width', 'edge 1 · focus ring 2 · selection 1.5']]],
      ['Color', [['Primary', '#E6EBF0 · ink #0F141B'], ['Secondary', '#1D232B · edge #2A313A · text #E6EBF0'], ['Tertiary', 'no fill · edge #2A313A · text #98A2AD'], ['Accent', '#1A9FFF']]],
      ['States', [['Focus (hover)', 'the ring glides here: white 2 + glow #1A9FFF 12 / 28'], ['Pressed', '.94 · fill mixes 35% accent'], ['Disabled', '35% opacity · the ring skips it'], ['Group choice', 'white 8% + 1.5 edge, one indicator slides between']]],
      ['Motion', [['Press, colour', '120 ms ease-out'], ['Ring, indicator', '220 ms cubic-bezier(0.2, 0, 0, 1)'], ['Label change', 'the new face fades in, 150 ms · width never changes']]],
      ['Input', [['Move', 'arrows · D-pad · stick'], ['Press', 'Enter · A'], ['Example', 'Q / E · LB / RB'], ['Content', 'Z / C']]],
    ],
  },
  {
    id: 'clear', tone: 'Elegant, Clear',
    about: 'Buttons for a design canvas in the soft, frosted warm glass of the Clear tool bar: matte, thin line icons, and a choice that fills in place.',
    Body: ClearSet,
    configs: [
      { title: 'Emphasis', row: true, items: CL_TRIO.map((p, i) => [['Primary: light fill', 'Secondary: frosted glass', 'Tertiary: outline only'][i], <CL {...p} />]) },
      { title: 'Content', items: [
        ['Icon and text', trio(CL, CL_TRIO, 'both')],
        ['Text only', trio(CL, CL_TRIO, 'text')],
        ['Icon only: 40 × 40, the label moves to the accessible name', trio(CL, CL_TRIO, 'icon')],
      ] },
      { title: 'Button group · single selection', items: [
        ['Icon and text: the choice fills where it is', <StaticGroup sys="cl" items={ALIGNS} sel={0} />],
        ['Text only', <StaticGroup sys="cl" items={ALIGNS} sel={0} content="text" />],
        ['Icon only', <StaticGroup sys="cl" items={ALIGNS} sel={0} content="icon" />],
      ] },
    ],
    states: <StateGrid cols={['Enabled', 'Hover', 'Pressed', 'Disabled']} rows={[
      ...CL_TRIO.map((p, i) => [['Primary', 'Secondary', 'Tertiary'][i], stateCells(CL, p, 'st-hover')]),
      ['Group choice', [
        <StaticGroup sys="cl" items={ALIGNS} sel={0} content="icon" />,
        <StaticGroup sys="cl" items={ALIGNS} sel={0} content="icon" st={[1, 'st-hover']} />,
        <StaticGroup sys="cl" items={ALIGNS} sel={0} content="icon" st={[1, 'st-hover st-press']} />,
        <StaticGroup sys="cl" items={ALIGNS} sel={0} content="icon" off={1} />,
      ]],
    ]} />,
    spec: [
      ['Button', [['Height', '40 · icon only 40 × 40'], ['Padding', '0 × 16'], ['Icon to label', '8'], ['Icon', '20 × 20 · line 1.5'], ['Buttons apart', '8']]],
      ['Group', [['Container', '40 high · padding 4 · radius 12, frosted'], ['Choice', '32 high · padding 0 × 12 · icon only 32 × 32'], ['Choices apart', '2']]],
      ['Type', [['Font', 'Inter Regular'], ['Size / line height', '15 / 20'], ['Text', 'white 90% · on primary #3A3734']]],
      ['Shape', [['Corner radius', 'buttons 12 · group 12 · choices 8'], ['Stroke width', 'tertiary outline 1 · glass edge 1 · focus 2']]],
      ['Material', [['Primary', 'white 90%'], ['Secondary', 'frosted warm glass #76726F to #686562 at 86% · blur 32 · edge white 10%'], ['Tertiary', 'no fill · outline white 24%'], ['Shadow', 'secondary and group 0 6 16, black 30%']]],
      ['States', [['Hover', 'primary turns white · secondary +8% light · tertiary white 8% fill'], ['Pressed', '.97 · primary white 80% · others +18% light'], ['Disabled', '38% opacity'], ['Group choice', 'white 14% fill, grows in place']]],
      ['Motion', [['Hover, press', '120 ms ease-out'], ['Choice', 'grows from 0.85, 240 ms cubic-bezier(0.2, 0, 0, 1) · the old one fades 150 ms ease-in'], ['Label change', 'the new face fades in, 150 ms · width never changes']]],
      ['Focus', [['Keyboard', 'outline 2 white 85%, offset 2'], ['Group', 'arrow keys move the choice']]],
    ],
  },
  {
    id: 'camp', tone: 'Rebellious, Base Camp',
    about: 'Buttons for a hunter\'s camp in the Persona-style language of the Base Camp menu: cut slabs that lean, a plate peeking from behind, and a snap when you reach for one.',
    Body: CampSet,
    configs: [
      { title: 'Emphasis', row: true, items: BC_TRIO.map((p, i) => [['Primary: red slab, paper plate behind', 'Secondary: paper slab', 'Tertiary: a red slash under the word'][i], <BC {...p} />]) },
      { title: 'Content', items: [
        ['Icon and text', trio(BC, BC_TRIO, 'both')],
        ['Text only', trio(BC, BC_TRIO, 'text')],
        ['Icon only: 52 × 48, the label moves to the accessible name', trio(BC, BC_TRIO, 'icon')],
      ] },
      { title: 'Button group · single selection', items: [
        ['Icon and text: one white shard jumps to the choice, which leans and grows', <StaticGroup sys="bc" items={PARTY} sel={1} />],
        ['Text only', <StaticGroup sys="bc" items={PARTY} sel={1} content="text" />],
        ['Icon only', <StaticGroup sys="bc" items={PARTY} sel={1} content="icon" />],
      ] },
    ],
    states: <StateGrid cols={['Enabled', 'Hover', 'Pressed', 'Disabled']} rows={[
      ...BC_STATE.map((p, i) => [['Primary', 'Secondary', 'Tertiary'][i], stateCells(BC, p, 'st-hover')]),
      ['Group choice', [
        <StaticGroup sys="bc" items={PARTY.slice(0, 2)} sel={0} content="icon" />,
        <StaticGroup sys="bc" items={PARTY.slice(0, 2)} sel={0} content="icon" st={[1, 'st-hover']} />,
        <StaticGroup sys="bc" items={PARTY.slice(0, 2)} sel={0} content="icon" st={[1, 'st-hover st-press']} />,
        <StaticGroup sys="bc" items={PARTY.slice(0, 2)} sel={0} content="icon" off={1} />,
      ]],
    ]} />,
    spec: [
      ['Button', [['Height', '48 · icon only 52 × 48'], ['Padding', '0 × 22'], ['Icon to label', '10'], ['Icon', '20 × 20 · line 2'], ['Buttons apart', '20']]],
      ['Group', [['Choice', '44 high · padding 0 × 16 · icon only 48'], ['Choices apart', '4'], ['Chosen', 'white shard behind · label ink · leans −3° and grows to 1.08']]],
      ['Type', [['Font', 'Anton, uppercase, +3%'], ['Size / line height', '20 / 24']]],
      ['Shape', [['Corners', 'none: cut slabs, polygon 0 8%, 100% 0, 98% 100%, 2% 92%'], ['Lean', 'every button −2°'], ['Plate', 'offset 5, 5 behind the slab']]],
      ['Color', [['Red', '#D90416'], ['Ink', '#0B0B0B'], ['Paper', '#F3F0EA'], ['Primary', 'red slab, white letters, paper plate'], ['Secondary', 'paper slab, ink letters'], ['Tertiary', 'white letters on a red slash']]],
      ['States', [['Hover', 'steps 6 forward and leans −3° · secondary shows a red plate · the slash fills to a slab'], ['Pressed', '.95 · the slab inverts: primary paper with red letters, secondary red'], ['Disabled', 'grey, 40%']]],
      ['Motion', [['Step, lean', '140 ms cubic-bezier(.3, 1.6, .5, 1), the Base Camp snap'], ['Colour', '100 ms ease-out'], ['Group shard', 'jumps 240 ms cubic-bezier(.3, 1.5, .5, 1)'], ['Label change', 'the new face fades in, 150 ms · width never changes']]],
      ['Focus', [['Keyboard', 'dashed outline 2 white, offset 5'], ['Group', 'arrow keys move the choice']]],
      ['Phone', [['Button', '44 high · padding 0 × 16 · Anton 17 / 22'], ['Choice', '40 high · padding 0 × 10']]],
    ],
  },
  {
    id: 'index', tone: 'Monumental, The Index',
    about: 'Buttons for an archive of structures, cut like carved lettering: square, heavy and ruled. A slab wipes in from the left on hover, the way the Index rows fill.',
    Body: IndexSet,
    configs: [
      { title: 'Emphasis', row: true, items: IX_TRIO.map((p, i) => [['Primary: bone slab', 'Secondary: 3 rule frame', 'Tertiary: 3 rule under the word'][i], <IX {...p} />]) },
      { title: 'Content', items: [
        ['Icon and text', trio(IX, IX_TRIO, 'both')],
        ['Text only', trio(IX, IX_TRIO, 'text')],
        ['Icon only: 56 × 56, the label moves to the accessible name', trio(IX, IX_TRIO, 'icon')],
      ] },
      { title: 'Button group · single selection', items: [
        ['Icon and text: one bone block slides under the choice', <StaticGroup sys="ix" items={DRAW} sel={1} />],
        ['Text only', <StaticGroup sys="ix" items={DRAW} sel={1} content="text" />],
        ['Icon only', <StaticGroup sys="ix" items={DRAW} sel={1} content="icon" />],
      ] },
    ],
    states: <StateGrid cols={['Enabled', 'Hover', 'Pressed', 'Disabled']} rows={[
      ...IX_STATE.map((p, i) => [['Primary', 'Secondary', 'Tertiary'][i], stateCells(IX, p, 'st-hover')]),
      ['Group choice', [
        <StaticGroup sys="ix" items={DRAW.slice(0, 2)} sel={0} content="icon" />,
        <StaticGroup sys="ix" items={DRAW.slice(0, 2)} sel={0} content="icon" st={[1, 'st-hover']} />,
        <StaticGroup sys="ix" items={DRAW.slice(0, 2)} sel={0} content="icon" st={[1, 'st-hover st-press']} />,
        <StaticGroup sys="ix" items={DRAW.slice(0, 2)} sel={0} content="icon" off={1} />,
      ]],
    ]} />,
    spec: [
      ['Button', [['Height', '56 · icon only 56 × 56'], ['Padding', '0 × 24'], ['Icon to label', '12'], ['Icon', '24 × 24 · line 2'], ['Buttons apart', '16']]],
      ['Group', [['Container', '56 high · 3 rule along the bottom'], ['Choice', '56 high · padding 0 × 20 · icon only 56'], ['Chosen', 'one bone block slides under it, letters turn ink']]],
      ['Type', [['Font', 'Big Shoulders Display ExtraBold, uppercase'], ['Size / line height', '26 / 28']]],
      ['Shape', [['Corners', 'square, radius 0'], ['Rules', '3: secondary frame, tertiary underline, group baseline']]],
      ['Color', [['Bone', '#E6E1D7'], ['Ink', '#1A1815'], ['Rust', '#6B2C1C, pressed'], ['Dim', '#827B6F, disabled and unchosen']]],
      ['States', [['Hover', 'a slab wipes in from the left: ink over the primary (it keeps a bone frame), bone under the others'], ['Pressed', '.98 · the slab turns rust, letters bone'], ['Disabled', 'letters and rules dim #827B6F · primary slab #2B2925']]],
      ['Motion', [['Wipe', '320 ms cubic-bezier(.2, .9, .2, 1), from the left edge'], ['Press', '120 ms ease-out'], ['Group block', '260 ms cubic-bezier(0.2, 0, 0, 1)'], ['Label change', 'the new face fades in, 150 ms · width never changes']]],
      ['Focus', [['Keyboard', 'outline 2 bone, offset 4'], ['Group', 'arrow keys move the choice']]],
      ['Phone', [['Button', '48 high · padding 0 × 16 · 20 / 24 · icon 20'], ['Choice', '48 high · padding 0 × 12 · 18 / 22']]],
    ],
  },
  {
    id: 'heads', tone: 'Matter-of-fact, Heads Up',
    about: 'Buttons that tell you what happens before you press, and what happened after. Hover keeps the label and slides in the consequence; a press lifts it away and the result rises in. After the trycoffee download button.',
    Body: HeadsSet,
    configs: [
      { title: 'Sequence · rest, hover, after the press', items: HU_TRIO.map((p, i) => [
        ['Primary: the size comes in, then the download is done', 'Secondary: what gets copied, then confirmed', 'Tertiary: where it leads, then on the way'][i],
        <Row><HU {...p} /><HU {...p} className="st-hover" /><HU {...p} done={0} /></Row>,
      ]) },
      { title: 'Emphasis', row: true, items: HU_TRIO.map((p, i) => [['Primary: light slab', 'Secondary: dark slab', 'Tertiary: outline'][i], <HU {...p} />]) },
      { title: 'Content', items: [
        ['Icon and text: hover keeps the label, the icon leaves, the next fact comes in', trio(HU, HU_TRIO, 'both')],
        ['Text only: the label shifts over for the next fact', trio(HU, HU_TRIO, 'text')],
        ['Icon only: 52 × 52, the icon swaps for the next one', trio(HU, HU_TRIO, 'icon')],
      ] },
      { title: 'Button group · single selection', items: [
        ['The choice keeps its extra fact showing; hover previews it on the others', <HuGroup label="Billing" items={BILLING} value={1} onChange={() => {}} />],
        ['Text only', <HuGroup label="Billing" items={BILLING} value={1} onChange={() => {}} content="text" />],
        ['Icon only: the fact needs words, so it stays out', <HuGroup label="Billing" items={BILLING} value={1} onChange={() => {}} content="icon" />],
      ] },
    ],
    states: <StateGrid cols={['Primary', 'Secondary', 'Tertiary']} rows={[
      ['Enabled', HU_STATE.map((p) => <HU {...p} />)],
      ['Hover', HU_STATE.map((p) => <HU {...p} className="st-hover" />)],
      ['Pressed', HU_STATE.map((p) => <HU {...p} className="st-hover st-press" />)],
      ['After press', HU_STATE.map((p) => <HU {...p} done={0} />)],
      ['Disabled', HU_STATE.map((p) => <HU {...p} disabled />)],
    ]} />,
    spec: [
      ['Button', [['Height', '52 · icon only 52 × 52'], ['Padding', '0 × 20'], ['Gaps', 'icon to label 10 · label to next 10'], ['Icon', '20 × 20 · line 1.5'], ['Width', 'its widest frame (rest, hover, result), so it never resizes']]],
      ['Frames', [['Rest', '[icon] [label]'], ['Hover, focus', 'the strip slides: the label stays, the icon leaves past the edge, the next fact comes in'], ['After press', 'the strip lifts away, the result rises in'], ['Clip', 'the whole button, so content enters and leaves at its rounded edge']]],
      ['Group', [['Container', '52 high · padding 4 · radius 14 · #1A1A19'], ['Choice', '44 high · padding 0 × 16 · radius 10'], ['Chosen', 'one light block slides to it and its extra fact stays out']]],
      ['Type', [['Label', 'Inter Semi Bold 16 / 20'], ['Next fact', 'Inter Medium 16 / 20, 55% of the label colour'], ['Command', 'Geist Mono 15 / 20']]],
      ['Shape', [['Corner radius', 'buttons 14 · group 14 · choices 10'], ['Stroke width', 'tertiary outline 1 · secondary edge 1']]],
      ['Color', [['Primary', '#F4F4F2 · ink #111111 · next #6E6E6A'], ['Secondary', '#1E1E1D · text #F4F4F2 · next #8E8E8A'], ['Tertiary', 'no fill · outline white 20%'], ['Shadow', 'primary 0 10 30, black 45%']]],
      ['States', [['Hover', 'next frame · primary turns white, secondary #262625, tertiary white 6% fill'], ['Pressed', '.97'], ['After press', 'the result, held 1.3–1.5 s, then back'], ['Disabled', '40% · no preview']]],
      ['Motion', [['Slide', '280 ms cubic-bezier(0.2, 0, 0, 1)'], ['Lift, rise', '260 ms, same curve · the strip fades 200 ms'], ['Return', 'the same path back'], ['Press', '120 ms ease-out']]],
      ['Scenarios', [['Download', 'size before, done after'], ['Price', 'cost before, plan after'], ['Copy', 'what is copied, then confirmed'], ['Seats, links', 'what is left, where it goes']]],
    ],
  },
  {
    id: 'every', tone: 'Matter-of-fact, Every Button',
    about: 'The Heads Up idea carried through Material 3\'s whole button catalogue: split buttons, toggles, icon buttons, standard and connected groups, FABs and the FAB menu. Each one says what will happen before the press and what happened after.',
    Body: EveryButtonSet,
    configs: [
      { title: 'Color styles · by emphasis', row: true, items: [
        ['Filled: final or unblocking actions', ebColor('filled', 'Send')], ['Tonal: supporting', ebColor('tonal', 'Send')], ['Elevated: over busy backgrounds', ebColor('elevated', 'Send')],
        ['Outlined: secondary, or a way out', ebColor('outlined', 'Send')], ['Text: not essential', ebColor('text', 'Send')],
      ] },
      { title: 'Sizes · XS 32, S 40, M 56, L 96, XL 136', items: SIZES.map((z) => [`${z.toUpperCase()} · ${SIZE_H[z]} high`, <HuBtn kind="filled" size={z} {...EB_SEND} />]) },
      { title: 'Shape · square or round, squarer when pressed', row: true, items: [
        ['Square', <HuBtn kind="filled" size="m" shape="square" {...EB_SEND} />], ['Square, pressed', <HuBtn kind="filled" size="m" shape="square" {...EB_SEND} className="st-press" />],
        ['Round', <HuBtn kind="filled" size="m" shape="round" {...EB_SEND} />], ['Round, pressed', <HuBtn kind="filled" size="m" shape="round" {...EB_SEND} className="st-press" />],
      ] },
      { title: 'Toggle button · off, on (fills and turns round), hover when on', row: true, items: [
        ['Off', <HuBtn kind="filled" size="m" className="is-toggle" icon={IC.plus} label="Follow" labelSize="Following" next={{ text: 'weekly digest' }} />],
        ['On', <HuBtn kind="filled" size="m" className="is-toggle is-on" icon={IC.check} label="Following" labelSize="Following" next={{ text: 'Unfollow', size: 'weekly digest' }} />],
        ['On, hover: says what pressing again does', <HuBtn kind="filled" size="m" className="is-toggle is-on st-hover" icon={IC.check} label="Following" labelSize="Following" next={{ text: 'Unfollow', size: 'weekly digest' }} />],
      ] },
      { title: 'Icon buttons · standard, filled, tonal, outlined; narrow, default, wide; toggle', row: true, items: [
        ['Standard', <HuIcon kind="text" size="m" icon={IC.mark} label="Save" />], ['Filled', <HuIcon kind="filled" size="m" icon={IC.mark} label="Save" />],
        ['Tonal', <HuIcon kind="tonal" size="m" icon={IC.mark} label="Save" />], ['Outlined', <HuIcon kind="outlined" size="m" icon={IC.mark} label="Save" />],
        ['Narrow', <HuIcon kind="tonal" size="m" width="narrow" icon={IC.mark} label="Save" />], ['Wide', <HuIcon kind="tonal" size="m" width="wide" icon={IC.mark} label="Save" />],
        ['Toggle off', <HuIcon kind="tonal" size="m" icon={IC.bell} label="Notify" on={false} />], ['Toggle on: filled icon, round', <HuIcon kind="tonal" size="m" icon={IC.bell} label="Notify" on fill />],
        ['Hover: the tooltip says what happens', <span className="eb-tip-sample"><HuIcon kind="tonal" size="m" icon={IC.bell} label="Notify" tip="Notify · each new post" className="st-hover" /></span>],
      ] },
      { title: 'Split button · leading action, 2 apart from the menu button', row: true, items: [
        ['Closed', <HuSplit size="m" lead={EB_SEND} menu={SEND_MENU} open={false} />],
        ['Hover on the action: who it goes to', <HuSplit size="m" lead={{ ...EB_SEND, className: 'st-hover' }} menu={SEND_MENU} open={false} />],
        ['Open: chevron turned, menu button round, menu 4 below', <HuSplit size="m" lead={EB_SEND} menu={SEND_MENU} open className="is-sample-open" />],
      ] },
      { title: 'Button groups', row: true, items: [
        ['Standard: the pressed one widens, neighbours give way', <HuStdGroup size="m" label="Player" items={[{ kind: 'tonal', icon: IC.prev, label: 'Previous' }, { kind: 'filled', icon: IC.play, label: 'Play', width: 'wide' }, { kind: 'tonal', icon: IC.next, label: 'Next' }]} />],
        ['Connected: 2 apart, the choice fills and rounds', <HuConnected size="m" label="Route" items={ROUTE} value={1} onChange={() => {}} />],
      ] },
      { title: 'FAB · FAB, extended FAB, FAB menu', row: true, items: [
        ['FAB 56 · 80 · 96', <Row><button className="bt hu-fab fab-s" type="button"><span className="hu-ic">{li(IC.pen)}</span></button><button className="bt hu-fab fab-m" type="button"><span className="hu-ic">{li(IC.pen)}</span></button><button className="bt hu-fab fab-l" type="button"><span className="hu-ic">{li(IC.pen)}</span></button></Row>],
        ['Extended FAB: hover says what it makes', <Row><HuBtn kind="filled" className="hu-xfab xfab-s" icon={IC.pen} label="Compose" next={{ text: 'new draft' }} /><HuBtn kind="filled" className="hu-xfab xfab-s st-hover" icon={IC.pen} label="Compose" next={{ text: 'new draft' }} /></Row>],
        ['FAB menu: 2–6 related items, the FAB becomes close', <span className="eb-fab-sample"><HuFabMenu items={NEW_ITEMS} open /></span>],
      ] },
    ],
    states: <StateGrid cols={['Button', 'Toggle, on', 'Icon button', 'Split button', 'FAB']} rows={[
      ['Enabled', [<HuBtn kind="filled" size="xs" {...EB_SEND} />, <HuBtn kind="filled" size="xs" className="is-toggle is-on" icon={IC.check} label="Following" next={{ text: 'Unfollow' }} />, <HuIcon kind="tonal" size="xs" icon={IC.mark} label="Save" />, <HuSplit size="xs" lead={EB_SEND} menu={SEND_MENU} open={false} />, <button className="bt hu-fab fab-s" type="button"><span className="hu-ic">{li(IC.pen)}</span></button>]],
      ['Hover', [<HuBtn kind="filled" size="xs" {...EB_SEND} className="st-hover" />, <HuBtn kind="filled" size="xs" className="is-toggle is-on st-hover" icon={IC.check} label="Following" next={{ text: 'Unfollow' }} />, <HuIcon kind="tonal" size="xs" icon={IC.mark} label="Save" className="st-hover" />, <HuSplit size="xs" lead={{ ...EB_SEND, className: 'st-hover' }} menu={SEND_MENU} open={false} />, <button className="bt hu-fab fab-s st-hover" type="button"><span className="hu-ic">{li(IC.pen)}</span></button>]],
      ['Pressed', [<HuBtn kind="filled" size="xs" {...EB_SEND} className="st-hover st-press" />, <HuBtn kind="filled" size="xs" className="is-toggle is-on st-hover st-press" icon={IC.check} label="Following" next={{ text: 'Unfollow' }} />, <HuIcon kind="tonal" size="xs" icon={IC.mark} label="Save" className="st-hover st-press" />, <HuSplit size="xs" lead={{ ...EB_SEND, className: 'st-hover st-press' }} menu={SEND_MENU} open={false} />, <button className="bt hu-fab fab-s st-press" type="button"><span className="hu-ic">{li(IC.pen)}</span></button>]],
      ['After press', [<HuBtn kind="filled" size="xs" {...EB_SEND} done={0} />, <HuBtn kind="filled" size="xs" className="is-toggle" icon={IC.plus} label="Follow" next={{ text: 'weekly digest' }} />, <HuIcon kind="tonal" size="xs" icon={IC.mark} label="Save" on fill />, <HuSplit size="xs" lead={{ ...EB_SEND, done: 0 }} menu={SEND_MENU} open={false} />, <span />]],
      ['Disabled', [<HuBtn kind="filled" size="xs" {...EB_SEND} disabled />, <HuBtn kind="filled" size="xs" className="is-toggle is-on" icon={IC.check} label="Following" next={{ text: 'Unfollow' }} disabled />, <HuIcon kind="tonal" size="xs" icon={IC.mark} label="Save" disabled />, <HuSplit size="xs" lead={{ ...EB_SEND, disabled: true }} menu={SEND_MENU} open={false} className="is-off" />, <button className="bt hu-fab fab-s" type="button" disabled><span className="hu-ic">{li(IC.pen)}</span></button>]],
    ]} />,
    spec: [
      ['Choosing', [['High emphasis', 'FAB, extended FAB, FAB menu, filled, split, standard group · one per screen'], ['Medium', 'tonal, elevated (busy backgrounds only), outlined'], ['Low', 'connected group, text, icon button']]],
      ['Sizes', [['XS', '32 high · padding 12 · icon 20 · 14 / 20'], ['S', '40 · padding 16 · icon 20 · 14 / 20'], ['M', '56 · padding 24 · icon 24 · 16 / 24'], ['L', '96 · padding 48 · icon 32 · 24 / 32'], ['XL', '136 · padding 64 · icon 40 · 32 / 40'], ['Target', 'XS and S still answer to 48 × 48']]],
      ['Shape', [['Round', 'fully rounded'], ['Square', 'radius 12 · 12 · 16 · 28 · 28'], ['Pressed', 'squarer: 8 · 8 · 12 · 16 · 16'], ['Toggle on', 'square turns round, round turns square']]],
      ['Heads Up', [['Rest', '[icon] [label]'], ['Hover, focus', 'the label stays, the next fact slides in'], ['After press', 'the result rises in, then back'], ['Width', 'the widest frame, never resizes']]],
      ['Toggle', [['Off', 'tonal colours, outline icon'], ['On', 'filled colours, filled icon, shape flips'], ['Hover when on', 'says what pressing again does: Unfollow']]],
      ['Icon button', [['Widths', 'narrow 0.8 · default 1 · wide 1.3 × height'], ['Styles', 'standard, filled, tonal, outlined'], ['Tooltip', '8 above · #262625 · Inter 13 / 18 · says the consequence']]],
      ['Split button', [['Space', '2 between action and menu button'], ['Inner corners', '4 for XS–M · 8 L · 12 XL'], ['Open', 'chevron turns 180° · menu button turns round'], ['Menu', '4 below, aligned to the menu button · items show their consequence']]],
      ['Groups', [['Standard', 'pressed button +15% width, neighbours share the loss, group width holds'], ['Connected', '2 apart · inner corners 8 · the choice fills, rounds and shows its fact']]],
      ['FAB', [['FAB', '56 · 80 · 96 · radius 16 · 20 · 28 · icon 24 · 28 · 36'], ['Extended FAB', '56 high · padding 16 · Inter 600 16'], ['FAB menu', '2–6 items, 56 high pills, 4 apart, rise in 22 ms apart · the FAB turns into a round close']]],
      ['Motion', [['Slide, lift', '280 / 260 ms cubic-bezier(0.2, 0, 0, 1)'], ['Shape, width', '200 ms, same curve'], ['Press', '120 ms ease-out'], ['Chevron, close', '200 ms rotation']]],
      ['Phone', [['Large sizes', 'L steps down to 72, XL to 88, so a whole button fits the width'], ['FAB', '56 · 80 · 96 follow the Size switcher: XS–M 56, L 80, XL 96']]],
    ],
  },
]

/* the example's controls: each action, then its keys as keycaps; alternatives are split by "or" */
function KeyHints({ items }) {
  return (
    <ul className="keys" aria-label="Controls">
      {items.map((it) => (
        <li key={it.d}>
          <span className="keys-d">{it.d}</span>
          {(it.k || []).map((g, gi) => (
            <span key={gi} className="keys-g">{gi > 0 && <i>or</i>}{g.map((k) => <kbd key={k}>{k}</kbd>)}</span>
          ))}
          {it.or && <i>{it.or}</i>}
        </li>
      ))}
    </ul>
  )
}

/* wall (home page hover background): the buttons operating themselves, repeated to fill the screen */
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
  const [layout] = useState(() => ({ cols: Math.max(1, Math.round(window.innerWidth / 560)), rows: Math.ceil(window.innerHeight / 96) + 1 }))
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

const SECTIONS = [['example', 'Example'], ['configurations', 'Configurations'], ['states', 'States'], ['specifications', 'Specifications']]

function SetPage({ set }) {
  const [active, setActive] = useState('example')
  useEffect(() => { document.title = `${set.tone} · Buttons` }, [set])
  // the outline marks the section you are reading
  useEffect(() => {
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean)
    const io = new IntersectionObserver((entries) => {
      const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (seen[0]) setActive(seen[0].target.id)
    }, { rootMargin: '-20% 0px -60% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  const head = (n, title, note) => (
    <header className="sec-head">
      <span className="sec-n">{String(n).padStart(2, '0')}</span>
      <h2>{title}</h2>
      {note && (typeof note === 'string' ? <p>{note}</p> : note)}
    </header>
  )
  return (
    <div className={`page page-${set.id}`}>
      <aside className="rail">
        <a className="up" href="./">Buttons</a>
        <h1>{set.tone}</h1>
        <p className="about">{set.about}</p>
        <nav className="toc" aria-label="On this page">
          {SECTIONS.map(([id, label], i) => (
            <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined}>
              <span>{String(i + 1).padStart(2, '0')}</span>{label}
            </a>
          ))}
        </nav>
        {set.figma && <a className="figma" href={set.figma} target="_blank" rel="noreferrer">Figma drawing ↗</a>}
      </aside>
      <main className="content">
        <section className="sec" id="example">
          {head(1, 'Example', set.keys && <KeyHints items={set.keys} />)}
          <set.Body />
        </section>
        <section className="sec" id="configurations">
          {head(2, 'Configurations', 'Frozen copies of the same parts, one per required case.')}
          {set.configs.map((g) => (
            <div key={g.title} className={`group ${g.row ? 'row' : ''}`}>
              <h3 className="group-k">{g.title}</h3>
              <div className="group-items">{g.items.map(([label, node]) => <Sample key={label} label={label}>{node}</Sample>)}</div>
            </div>
          ))}
        </section>
        <section className="sec" id="states">
          {head(3, 'States')}
          {set.states}
        </section>
        <section className="sec" id="specifications">
          {head(4, 'Specifications', 'All values in px.')}
          <div className="spec-grid">
            {set.spec.map(([title, rows]) => (
              <div key={title} className="spec-group">
                <h3 className="group-k">{title}</h3>
                <dl>{rows.map(([k, v]) => <div key={k} className="spec-row"><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function Index() {
  return (
    <main className="index-page">
      <h1>Buttons</h1>
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
