import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/* ================= spring physics =================
   Apple-style springs described by damping ratio + response (seconds), not duration.
   Every value animates from where it is right now, so motion can be interrupted and reversed. */
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function stepSpring(s, damping, response, dt) {
  const k = (2 * Math.PI / response) ** 2
  const c = (4 * Math.PI * damping) / response
  const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n
  for (let i = 0; i < n; i++) {
    s.v += (-k * (s.x - s.target) - c * s.v) * h
    s.x += s.v * h
  }
}

function useSpring(target, { damping = 1, response = 0.35 } = {}) {
  const s = useRef({ x: target, v: 0, target })
  const cfg = useRef({ damping, response })
  cfg.current = { damping, response }
  const [, redraw] = useState(0)
  const raf = useRef()
  const run = useCallback(() => {
    cancelAnimationFrame(raf.current)
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const st = s.current
      stepSpring(st, cfg.current.damping, cfg.current.response, dt)
      if (Math.abs(st.x - st.target) < 1e-4 && Math.abs(st.v) < 1e-3) { st.x = st.target; st.v = 0; redraw((n) => n + 1); return }
      redraw((n) => n + 1)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [])
  useEffect(() => {
    s.current.target = target
    if (reducedMotion()) { s.current.x = target; s.current.v = 0; redraw((n) => n + 1); return }
    run()
  }, [target, run])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return {
    value: s.current.x,
    // drag: follow the pointer 1:1 (no spring), remembering velocity for the hand-off
    hold(x) { cancelAnimationFrame(raf.current); s.current.x = x; redraw((n) => n + 1) },
    // release: continue from the current position at the pointer's velocity
    release(v) { s.current.v = v; if (reducedMotion()) { s.current.x = s.current.target; s.current.v = 0; redraw((n) => n + 1) } else run() },
  }
}

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
// soft boundary: the further past the edge, the less it follows
const rubber = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))

/* ================= controls ================= */
// tracks the pointer inside a row as --mx / --my, used for the visionOS-style hover light
const glow = (e) => {
  const el = e.currentTarget, r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}

const RowText = ({ label, detail }) => (
  <span className="row-text"><span className="label">{label}</span>{detail && <span className="detail">{detail}</span>}</span>
)

function Switch({ checked, onChange, label, detail, icon, tag, t }) {
  const v = t.variant
  const pos = useSpring(checked ? 1 : 0, t.spring)
  const [pressed, setPressed] = useState(false)
  const press = useSpring(pressed ? 1 : 0, { damping: 1, response: 0.2 })
  const drag = useRef(null)
  const travel = t.swW - t.thW - 2 * t.inset

  const down = (e) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setPressed(true) // feedback on press, not on release
    drag.current = { x0: e.clientX, p0: pos.value, moved: false, hist: [[e.clientX, e.timeStamp]] }
  }
  const move = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x0
    if (Math.abs(dx) > 4) d.moved = true
    if (!d.moved) return
    pos.hold((d.p0 * travel + dx) / travel) // raw position; the soft ends are applied when drawing
    d.hist.push([e.clientX, e.timeStamp]); if (d.hist.length > 5) d.hist.shift()
  }
  const up = () => {
    const d = drag.current
    drag.current = null
    setPressed(false)
    if (!d) return
    if (!d.moved) { onChange(!checked); return }
    const [a, b] = [d.hist[0], d.hist[d.hist.length - 1]]
    const vel = b[1] > a[1] ? (b[0] - a[0]) / ((b[1] - a[1]) / 1000) / travel : 0 // track-widths per second
    // a flick decides by direction; a slow drag decides by where the thumb was let go
    const next = Math.abs(vel) > 1.5 ? vel > 0 : clamp(pos.value) > 0.5
    pos.release(clamp(vel, -12, 12)) // hand the flick's speed to the spring (capped)
    if (next !== checked) onChange(next)
  }

  const k = press.value
  // wherever the spring is, the thumb only ever stretches softly past the ends of the track
  let px = pos.value * travel
  if (px < 0) px = -rubber(-px, travel)
  if (px > travel) px = travel + rubber(px - travel, travel)
  const p = px / travel
  const w = t.thW + k * t.stretch
  const x = p * travel - k * t.stretch * clamp(p)
  // Mist: the thumb dissolves while it travels and condenses again at either end
  const fog = v === 'mist' ? Math.sin(Math.PI * clamp(p)) : 0
  let transform = `translateX(${x}px)`
  if (fog) transform += ` scale(${1 + fog * 0.3}, ${1 - fog * 0.12})`
  return (
    <li className="row row-switch" onPointerMove={glow}>
      {icon}
      <RowText label={label} detail={detail} />
      {tag && <span className="tag">{tag}</span>}
      <button className="sw" role="switch" aria-checked={checked} aria-label={label}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClick={(e) => { if (e.detail === 0) onChange(!checked) }} // keyboard (Space / Enter)
        style={{ '--p': p, '--k': k, '--tx': `${t.inset + x + w / 2}px` }}>
        <span className="sw-track" />
        <span className="sw-thumb" style={{ transform, width: w,
          filter: fog > 0.01 ? `blur(${fog * 4}px)` : undefined, opacity: 1 - fog * 0.5 }} />
      </button>
    </li>
  )
}

function Checkbox({ checked, onChange, label, detail, icon, tag, t }) {
  const v = t.variant
  const p = useSpring(checked ? 1 : 0, t.spring).value
  const draw = v === 'mist' ? 0 : 1 - clamp(p * 1.25 - 0.25) // Mist doesn't draw the check, it condenses
  const box = (
    <span className="cb" style={{ '--p': clamp(p), '--s': p }}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 12.5l4 4 8-9" pathLength="1" style={{ strokeDashoffset: draw }} />
      </svg>
    </span>
  )
  return (
    <li className="row row-check">
      <button className="row-hit" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)}
        onPointerMove={glow}>
        {icon}
        {!icon && box}
        <RowText label={label} detail={detail} />
        {tag && <span className="tag">{tag}</span>}
        {icon && box}
      </button>
    </li>
  )
}

function RadioRow({ option, on, onPick, onKey, btnRef, t }) {
  const p = useSpring(on ? 1 : 0, t.spring).value
  return (
    <li className="row row-radio">
      <button ref={btnRef} className="row-hit" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
        onClick={onPick} onKeyDown={onKey} onPointerMove={glow} style={{ '--p': clamp(p), '--s': p }}>
        <span className="rd"><span className="rd-dot" /></span>
        <span className="row-text"><span className="label">{option}</span></span>
      </button>
    </li>
  )
}

function RadioGroup({ title, options, value, onChange, t }) {
  const idx = options.indexOf(value)
  const y = useSpring(idx, t.spring).value // the selection glides between rows, same path both ways
  const refs = useRef([])
  const key = (e, i) => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!d) return
    e.preventDefault()
    const n = (i + d + options.length) % options.length
    onChange(options[n]); refs.current[n]?.focus()
  }
  return (
    <ul className="list radio-list" role="radiogroup" aria-label={title} style={{ '--y': y }}>
      <span className="rd-glide" aria-hidden="true" />
      {options.map((o, i) => (
        <RadioRow key={o} option={o} on={o === value} t={t} btnRef={(el) => (refs.current[i] = el)}
          onPick={() => onChange(o)} onKey={(e) => key(e, i)} />
      ))}
    </ul>
  )
}

/* ================= the four sets =================
   one tone (Ethereal), four concepts — each concept decides how its controls move */
const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif'
const SETS = [
  {
    id: 'mist', concept: 'Mist Takes Shape', name: 'Mist', tone: 'Ethereal', platform: 'visionOS',
    content: { topic: 'Immersion', sw: ['Spatial Audio', '', true], cb: ['Show Hands', '', false], radio: ['Environment', ['Yosemite', 'Mount Hood', 'Moon'], 'Yosemite'] },
    t: {
      font: SF, fontName: 'SF Pro Text Medium', fw: 500, fs: 17, lh: 22, ls: '-0.3px',
      dfs: 13, dlh: 18, rowH: 54, padX: 18, gap: 14, listR: 30, divider: 0, listGap: 22,
      swW: 54, swH: 32, thW: 28, thH: 28, inset: 2, swR: 16, thR: 14, stretch: 6, swStroke: 0,
      cb: 26, cbR: 8, cbStroke: 1.5, checkStroke: 2.4, rd: 24, rdDot: 10, rdStroke: 1.5,
      ink: '#ffffff', muted: 'rgba(255,255,255,.62)', on: '#a8d8e8', off: 'rgba(255,255,255,.18)', thumb: '#ffffff', accent: '#ffffff',
      spring: { damping: 1, response: 0.6 }, variant: 'mist',
    },
  },
  {
    id: 'unfold', concept: 'Choices Unfold', name: 'Unfold', tone: 'Ethereal', platform: 'visionOS',
    content: { topic: 'Spaces' },
    t: {
      font: SF, fontName: 'SF Pro Text Medium', fw: 500, fs: 16, lh: 21, ls: '-0.2px',
      dfs: 13, dlh: 18, rowH: 62, padX: 14, gap: 12, listR: 28, divider: 0, listGap: 22,
      swW: 50, swH: 30, thW: 26, thH: 26, inset: 2, swR: 15, thR: 13, stretch: 6, swStroke: 0,
      cb: 24, cbR: 7, cbStroke: 1.5, checkStroke: 2.4, rd: 24, rdDot: 10, rdStroke: 1.5,
      ink: '#3a2a24', muted: 'rgba(58,42,36,.6)', on: '#2a2321', off: 'rgba(58,42,36,.14)', thumb: '#fffaf5', accent: '#2a2321',
      spring: { damping: 1, response: 0.4 }, variant: 'unfold',
    },
  },
  {
    id: 'morph', concept: 'Music Fits Any Space', name: 'Morph', tone: 'Ethereal', platform: 'visionOS',
    content: { topic: 'Listening', sw: ['Playing', '', true], cb: ['Repeat', '', false], radio: ['Size', ['Orb', 'Small', 'Wide', 'Large'], 'Wide'] },
    t: {
      font: SF, fontName: 'SF Pro Text Medium', fw: 500, fs: 16, lh: 21, ls: '-0.2px',
      dfs: 13, dlh: 18, rowH: 50, padX: 16, gap: 12, listR: 28, divider: 0, listGap: 22,
      swW: 50, swH: 30, thW: 26, thH: 26, inset: 2, swR: 15, thR: 13, stretch: 6, swStroke: 0,
      cb: 24, cbR: 7, cbStroke: 1.5, checkStroke: 2.4, rd: 22, rdDot: 9, rdStroke: 1.5,
      ink: '#f4f4ec', muted: 'rgba(244,244,236,.62)', on: '#e4d6fb', off: 'rgba(244,244,236,.2)', thumb: '#ffffff', accent: '#e4d6fb',
      spring: { damping: 1, response: 0.4 }, variant: 'morph',
    },
  },
  {
    id: 'frost', concept: 'Action Clears the Room', name: 'Frost', tone: 'Ethereal', platform: 'visionOS',
    content: { topic: 'Create', sw: ['Quick Actions', '', false], cb: ['Frost Background', '', true], radio: ['Action', ['Note', 'Photo', 'Voice', 'Space'], 'Note'] },
    t: {
      font: SF, fontName: 'SF Pro Text Medium', fw: 500, fs: 16, lh: 21, ls: '-0.2px',
      dfs: 13, dlh: 18, rowH: 50, padX: 16, gap: 12, listR: 28, divider: 0, listGap: 22,
      swW: 50, swH: 30, thW: 26, thH: 26, inset: 2, swR: 15, thR: 13, stretch: 6, swStroke: 0,
      cb: 24, cbR: 7, cbStroke: 1.5, checkStroke: 2.4, rd: 22, rdDot: 9, rdStroke: 1.5,
      ink: '#2b2420', muted: 'rgba(43,36,32,.6)', on: '#2b2420', off: 'rgba(43,36,32,.16)', thumb: '#ffffff', accent: '#2b2420',
      spring: { damping: 1, response: 0.4 }, variant: 'frost',
    },
  },
]

const cssVars = (t) => ({
  '--font': t.font, '--fw': t.fw, '--fs': `${t.fs}px`, '--lh': `${t.lh}px`, '--ls': t.ls, '--dfs': `${t.dfs}px`, '--dlh': `${t.dlh}px`,
  '--row-h': `${t.rowH}px`, '--pad-x': `${t.padX}px`, '--gap': `${t.gap}px`, '--list-r': `${t.listR}px`, '--divider': `${t.divider}px`, '--list-gap': `${t.listGap}px`,
  '--sw-w': `${t.swW}px`, '--sw-h': `${t.swH}px`, '--th-w': `${t.thW}px`, '--th-h': `${t.thH}px`, '--inset': `${t.inset}px`, '--sw-r': `${t.swR}px`, '--th-r': `${t.thR}px`, '--sw-stroke': `${t.swStroke}px`,
  '--cb': `${t.cb}px`, '--cb-r': `${t.cbR}px`, '--cb-stroke': `${t.cbStroke}px`, '--check-stroke': t.checkStroke,
  '--rd': `${t.rd}px`, '--rd-dot': `${t.rdDot}px`, '--rd-stroke': `${t.rdStroke}px`,
  '--ink': t.ink, '--muted': t.muted, '--on': t.on, '--off': t.off, '--thumb': t.thumb, '--accent': t.accent,
})

/* ================= a set: one list, one topic, all three controls ================= */
function SetList({ set, auto, offset = 0 }) {
  const { content: c, t } = set
  const [sw, setSw] = useState(c.sw[2])
  const [cb, setCb] = useState(c.cb[2])
  const [rd, setRd] = useState(c.radio[2])
  useEffect(() => {
    if (!auto) return
    let i = offset
    const id = setInterval(() => {
      const k = i++ % 5
      if (k === 0) setSw((v) => !v)
      else if (k === 1) setCb((v) => !v)
      else setRd(c.radio[1][(k - 2) % c.radio[1].length])
    }, 1000)
    return () => clearInterval(id)
  }, [auto, offset, c])
  return (
    <div className="topic">
      <h3 className="list-title">{c.topic}</h3>
      <ul className="list">
        <Switch label={c.sw[0]} t={t} checked={sw} onChange={setSw} />
        <Checkbox label={c.cb[0]} t={t} checked={cb} onChange={setCb} />
        <li className="row-group">
          <span className="group-label">{c.radio[0]}</span>
          <RadioGroup title={c.radio[0]} options={c.radio[1]} value={rd} onChange={setRd} t={t} />
        </li>
      </ul>
    </div>
  )
}

/* ================= Choices Unfold: the tabs are the radio; the chosen tab unfolds its rows ================= */
const GLYPH = {
  room: <path d="M2.5 13.5V7L8 2.5 13.5 7v6.5zM6.5 13.5v-4h3v4" />,
  wave: <path d="M2 8h1M5 5.5v5M8 3v10M11 5.5v5M14 8h-1" />,
  sun: <><circle cx="8" cy="8" r="2.8" /><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" /></>,
  book: <path d="M8 4.5C6.5 3.5 4.5 3 2.5 3.3v9.2c2-.3 4 .2 5.5 1.2 1.5-1 3.5-1.5 5.5-1.2V3.3C11.5 3 9.5 3.5 8 4.5zM8 4.5v9.2" />,
  drop: <path d="M8 2.5S4 7 4 9.8a4 4 0 0 0 8 0C12 7 8 2.5 8 2.5z" />,
  sunset: <path d="M2 11.5h12M4.5 11.5a3.5 3.5 0 0 1 7 0M8 3.5v2M3.8 6.3l1.1 1.1M12.2 6.3l-1.1 1.1" />,
  pen: <path d="M3 13l1-3.5 6.5-6.5a1.8 1.8 0 0 1 2.5 2.5L6.5 12 3 13zM9.5 4l2.5 2.5" />,
  photo: <><rect x="2.5" y="3.5" width="11" height="9" rx="2" /><circle cx="6" cy="7" r="1.2" /><path d="M13.5 10.5l-3-3-5 5" /></>,
  plus: <path d="M8 3v10M3 8h10" />,
  search: <><circle cx="7.2" cy="7.2" r="4" /><path d="M10.2 10.2L13 13" /></>,
  flame: <path d="M8 2.5c1.8 2.2 3 3.8 3 6a3 3 0 0 1-6 0c0-1.3.6-2.2 1.4-3 .2 1.2.8 1.8 1.6 2-.6-1.8-.6-3.4 0-5z" />,
}
const Glyph = ({ name }) => <svg viewBox="0 0 16 16" aria-hidden="true">{GLYPH[name]}</svg>
const Tile = ({ dark, letter, glyph }) => <span className={`tile ${dark ? 'tile-dark' : ''}`} aria-hidden="true">{letter ?? <Glyph name={glyph} />}</span>

const UNFOLD = [
  { id: 'Rooms', glyph: 'room', rows: [
    ['sw', { dark: true, glyph: 'sun' }, 'Sunroom', 'Warm morning light', 'Open', true],
    ['cb', { glyph: 'book' }, 'Reading Nook', 'Quiet, soft focus', 'Calm', false],
  ] },
  { id: 'Sounds', glyph: 'wave', rows: [
    ['sw', { dark: true, glyph: 'drop' }, 'Rainfall', 'Soft on the glass', 'Loop', true],
    ['cb', { glyph: 'wave' }, 'Wind Chimes', 'Drifting, far off', 'Air', true],
  ] },
  { id: 'Light', glyph: 'sun', rows: [
    ['sw', { dark: true, glyph: 'sunset' }, 'Golden Hour', 'Low amber glow', '6:40', false],
    ['cb', { glyph: 'flame' }, 'Candlelight', 'A gentle flicker', 'Dim', false],
  ] },
]

function UnfoldSet({ set, auto, offset = 0 }) {
  const { t, content: c } = set
  const [tab, setTab] = useState('Rooms') // null = folded away to just the tab bar
  const [vals, setVals] = useState(() => Object.fromEntries(UNFOLD.flatMap((g) => g.rows.map((r, i) => [`${g.id}:${i}`, r[5]]))))
  const last = useRef(tab); if (tab) last.current = tab
  const shown = UNFOLD.find((g) => g.id === last.current)
  const tabsRef = useRef(null), bodyRef = useRef(null), measured = useRef(false)
  const [m, setM] = useState({ x: 0, w: 0, h: 0 })
  const x = useSpring(m.x, t.spring), w = useSpring(m.w, t.spring), o = useSpring(tab ? 1 : 0, t.spring)
  const h = useSpring(tab ? m.h : 0, t.spring) // the panel grows / folds to fit what the tab holds

  useLayoutEffect(() => {
    const measure = () => {
      const btn = tabsRef.current?.querySelector(`[data-tab="${last.current}"]`)
      if (!btn || !bodyRef.current) return
      const next = { x: btn.offsetLeft, w: btn.offsetWidth, h: bodyRef.current.offsetHeight }
      if (!measured.current) { measured.current = true; x.hold(next.x); w.hold(next.w); h.hold(next.h) } // no slide-in on load
      setM(next)
    }
    measure()
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    return () => window.removeEventListener('resize', measure)
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!auto) return
    let i = offset
    const id = setInterval(() => {
      const k = i++ % 4
      if (k < 2) { const key = `${last.current}:${k}`; setVals((v) => ({ ...v, [key]: !v[key] })) }
      else if (k === 2) setTab((cur) => UNFOLD[(UNFOLD.findIndex((g) => g.id === (cur ?? last.current)) + 1) % UNFOLD.length].id)
    }, 1100)
    return () => clearInterval(id)
  }, [auto, offset])

  const pick = (id) => setTab((cur) => (cur === id ? null : id)) // choosing the open tab again folds it away
  const key = (e, i) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!d) return
    e.preventDefault()
    const n = (i + d + UNFOLD.length) % UNFOLD.length
    setTab(UNFOLD[n].id); tabsRef.current.children[n + 1]?.focus()
  }
  return (
    <div className="topic">
      <h3 className="list-title">{c.topic}</h3>
      <div className="list unfold">
        <div className="unfold-body" style={{ height: Math.max(0, h.value) }} aria-hidden={!tab}>
          <div ref={bodyRef} key={shown.id} className={`unfold-content ${tab ? '' : 'folding'}`}>
            <ul className="unfold-rows">
              {shown.rows.map(([kind, tile, label, detail, tag], i) => {
                const k = `${shown.id}:${i}`
                const C = kind === 'sw' ? Switch : Checkbox
                return <C key={k} t={t} icon={<Tile {...tile} />} label={label} detail={detail} tag={tag}
                  checked={vals[k]} onChange={(v) => setVals((s) => ({ ...s, [k]: v }))} />
              })}
            </ul>
            <div className="unfold-rule" />
          </div>
        </div>
        <div ref={tabsRef} className="unfold-tabs" role="radiogroup" aria-label={c.topic}>
          <span className="unfold-pill" aria-hidden="true" style={{ transform: `translateX(${x.value}px)`, width: w.value, opacity: clamp(o.value) }} />
          {UNFOLD.map((g, i) => (
            <button key={g.id} data-tab={g.id} className="unfold-tab" role="radio" aria-checked={tab === g.id}
              tabIndex={(tab ?? last.current) === g.id ? 0 : -1} onClick={() => pick(g.id)} onKeyDown={(e) => key(e, i)}>
              <Glyph name={g.glyph} />{g.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ================= Music Fits Any Space: one player that reshapes itself for the room it's given =================
   a single spring runs along the sizes (0 = orb … 3 = large); every part of the layout is interpolated from it,
   so a change of mind mid-morph simply bends the motion toward the new shape */
const SIZES = ['Orb', 'Small', 'Wide', 'Large']
const LAYOUT = [
  // w, h, radius · wave icon · title (x, y, opacity) · repeat icon (x, y, opacity) · play (x, y, d) · bar (x1, x2, y) · nav, extras opacity
  { w: 120, h: 120, r: 60, wx: 60, wy: 28, tx: 18, ty: 60, to: 0, rx: 96, ry: 24, ro: 0, px: 60, py: 60, pd: 34, b1: 36, b2: 84, by: 92, no: 0, eo: 0 },
  { w: 150, h: 150, r: 26, wx: 24, wy: 24, tx: 18, ty: 58, to: 1, rx: 126, ry: 24, ro: 1, px: 116, py: 72, pd: 36, b1: 36, b2: 114, by: 124, no: 1, eo: 0 },
  { w: 300, h: 134, r: 26, wx: 24, wy: 24, tx: 18, ty: 52, to: 1, rx: 276, ry: 24, ro: 1, px: 262, py: 64, pd: 38, b1: 36, b2: 206, by: 108, no: 1, eo: 1 },
  { w: 360, h: 220, r: 28, wx: 24, wy: 24, tx: 18, ty: 140, to: 1, rx: 336, ry: 24, ro: 1, px: 314, py: 148, pd: 54, b1: 36, b2: 258, by: 196, no: 1, eo: 1 },
]
function layoutAt(s) {
  const i = Math.min(2, Math.max(0, Math.floor(s))), f = s - i // f may run past 0..1 when the spring overshoots
  const a = LAYOUT[i], b = LAYOUT[i + 1], out = {}
  for (const k in a) out[k] = a[k] + (b[k] - a[k]) * f
  return out
}
const NAV = {
  prev: 'M-4 -5v10M5 -5L-1.5 0 5 5z', next: 'M4 -5v10M-5 -5L1.5 0-5 5z',
  queue: 'M-6 -4h8M-6 0h8M-6 4h5M4 1.5v6M1 4.5h6',
  heart: 'M0 5C-6 0.5-6.5-5-2.5-5-1-5 0-4 0-3 0-4 1-5 2.5-5 6.5-5 6 0.5 0 5z',
}

function MorphWidget({ size, playing, repeat }) {
  const s = useSpring(SIZES.indexOf(size), { damping: 0.86, response: 0.55 }).value
  const amp = useSpring(playing ? 1 : 0, { damping: 1, response: 0.45 }).value
  const rp = useSpring(repeat ? 1 : 0, { damping: 1, response: 0.3 }).value
  const [clock, setClock] = useState({ phase: 0, f: 0.34 })
  useEffect(() => { // the wave travels and the track advances only while playing
    if (!playing || reducedMotion()) return
    let raf, last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      setClock((c) => ({ phase: c.phase + dt * 5, f: (c.f + dt * 0.012) % 1 }))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])
  const L = layoutAt(s)
  const op = (v) => clamp(v)
  const xp = L.b1 + clock.f * (L.b2 - L.b1)
  let wave = `M${L.b1} ${L.by}`
  for (let x = L.b1 + 2; x <= xp; x += 2) wave += `L${x.toFixed(1)} ${(L.by + Math.sin((x - L.b1) * 0.42 - clock.phase) * 3 * amp).toFixed(2)}`
  const at = (x, y) => ({ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` })
  return (
    <div className="morph-stage" aria-hidden="true">
      <div className={`morph ${playing ? 'is-playing' : ''}`} style={{ width: L.w, height: L.h, borderRadius: L.r }}>
        <span className="morph-eq" style={at(L.wx, L.wy)}><i /><i /><i /><i /></span>
        <span className="morph-title" style={{ transform: `translate(${L.tx}px, ${L.ty}px)`, opacity: op(L.to) }}><b>Low Tide</b><small>Ambient</small></span>
        <span className="morph-repeat" style={{ ...at(L.rx, L.ry), opacity: op(L.ro), '--rp': rp }}>
          <svg viewBox="-8 -8 16 16"><path d="M-4.5 -0.5v-1.8h8.2M1.6-4.5l2.2 2.2-2.2 2.2M4.5 0.5v1.8h-8.2M-1.6 4.5l-2.2-2.2 2.2-2.2" /></svg>
        </span>
        <span className="morph-play" style={{ ...at(L.px, L.py), width: L.pd, height: L.pd }}>
          <svg viewBox="-8 -8 16 16">
            <path d="M-3.5-4.5v9M3.5-4.5v9" style={{ opacity: amp }} />
            <path className="fill" d="M-2.5-5L5 0-2.5 5z" style={{ opacity: 1 - amp }} />
          </svg>
        </span>
        <svg className="morph-bar" width={Math.max(1, L.w)} height={Math.max(1, L.h)}>
          <path d={wave} className="played" />
          <path d={`M${xp} ${L.by}H${L.b2}`} className="rest" />
          <path d={`M${xp} ${L.by - 6}V${L.by + 6}`} className="thumb" />
          <g style={{ opacity: op(L.no) }}>
            <path transform={`translate(${L.b1 - 17} ${L.by})`} d={NAV.prev} className="fill" />
            <path transform={`translate(${L.b2 + 17} ${L.by})`} d={NAV.next} className="fill" />
          </g>
          <g style={{ opacity: op(L.eo) }}>
            <path transform={`translate(${L.b2 + 44} ${L.by})`} d={NAV.queue} />
            <path transform={`translate(${L.b2 + 72} ${L.by})`} d={NAV.heart} />
          </g>
        </svg>
      </div>
    </div>
  )
}

function MorphSet({ set, auto, offset = 0 }) {
  const { content: c, t } = set
  const [sw, setSw] = useState(c.sw[2])
  const [cb, setCb] = useState(c.cb[2])
  const [rd, setRd] = useState(c.radio[2])
  useEffect(() => {
    if (!auto) return
    let i = offset
    const id = setInterval(() => {
      const k = i++ % 6
      if (k === 0) setCb((v) => !v)
      else if (k === 5) setSw((v) => !v)
      else setRd(SIZES[k - 1])
    }, 1200)
    return () => clearInterval(id)
  }, [auto, offset])
  return (
    <>
      <MorphWidget size={rd} playing={sw} repeat={cb} />
      <div className="topic">
        <h3 className="list-title">{c.topic}</h3>
        <ul className="list">
          <Switch label={c.sw[0]} t={t} checked={sw} onChange={setSw} />
          <Checkbox label={c.cb[0]} t={t} checked={cb} onChange={setCb} />
          <li className="row-group">
            <span className="group-label">{c.radio[0]}</span>
            <RadioGroup title={c.radio[0]} options={c.radio[1]} value={rd} onChange={setRd} t={t} />
          </li>
        </ul>
      </div>
    </>
  )
}

/* ================= Action Clears the Room: reaching for an action frosts everything else away =================
   one spring opens the tray; each tile reads the same spring a little later, so they rise in sequence
   and sink back in reverse — and a change of mind mid-way just turns the whole sequence around */
const ACTIONS = { Note: 'pen', Photo: 'photo', Voice: 'wave', Space: 'room' }

function FrostWidget({ open, frost, action, onToggle, onPick }) {
  const p = useSpring(open ? 1 : 0, { damping: 0.9, response: 0.5 }).value
  const f = useSpring(open && frost ? 1 : 0, { damping: 1, response: 0.5 }).value
  return (
    <div className="frost-stage" aria-hidden="true">
      <div className="frost-win">
        <div className="frost-page" style={{ filter: f > 0.005 ? `blur(${f * 7}px)` : undefined, scale: `${1 - f * 0.015}` }}>
          <nav className="frost-side"><span className="on">Today</span><span>Week</span></nav>
          <div className="frost-main">
            <span className="frost-sun"><Glyph name="sun" /></span>
            <h4>Good Morning</h4>
            <div className="frost-card"><small>Focus today</small><b>3h 20m</b><span>Details</span></div>
            <div className="frost-row"><span className="frost-dot" /><span><b>Deep Work</b><small>9:00 – 11:30</small></span></div>
          </div>
        </div>
        <div className="frost-veil" style={{ opacity: clamp(f * 0.62 + p * 0.08) }} />
        <div className="frost-dock">
          <span className="frost-btn"><Glyph name="search" /></span>
          <button tabIndex={-1} className="frost-btn frost-plus" onClick={onToggle} style={{ '--p': clamp(p) }}><Glyph name="plus" /></button>
          <span className="frost-avatar" />
        </div>
        <div className="frost-tiles">
          {Object.entries(ACTIONS).map(([name, g], i) => {
            const q = clamp((p - i * 0.08) / 0.76)
            return (
              <button key={name} tabIndex={-1} className={`frost-tile ${action === name ? 'on' : ''}`} onClick={() => onPick(name)}
                style={{ opacity: q, transform: `translateY(${(1 - q) * 30}px) scale(${0.94 + 0.06 * q})`, pointerEvents: open ? 'auto' : 'none' }}>
                <Glyph name={g} /><span>{name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FrostSet({ set, auto, offset = 0 }) {
  const { content: c, t } = set
  const [sw, setSw] = useState(c.sw[2])
  const [cb, setCb] = useState(c.cb[2])
  const [rd, setRd] = useState(c.radio[2])
  const pick = (v) => { setRd(v); setSw(true) } // choosing an action opens the tray
  useEffect(() => {
    if (!auto) return
    let i = offset
    const names = c.radio[1]
    const id = setInterval(() => {
      const k = i++ % 6
      if (k === 0) setSw(true)
      else if (k < 4) setRd(names[k])
      else if (k === 4) { setSw(false); setRd(names[0]) }
      else setCb((v) => !v)
    }, 1100)
    return () => clearInterval(id)
  }, [auto, offset, c])
  return (
    <>
      <FrostWidget open={sw} frost={cb} action={rd} onToggle={() => setSw((v) => !v)} onPick={pick} />
      <div className="topic">
        <h3 className="list-title">{c.topic}</h3>
        <ul className="list">
          <Switch label={c.sw[0]} t={t} checked={sw} onChange={setSw} />
          <Checkbox label={c.cb[0]} t={t} checked={cb} onChange={setCb} />
          <li className="row-group">
            <span className="group-label">{c.radio[0]}</span>
            <RadioGroup title={c.radio[0]} options={c.radio[1]} value={rd} onChange={pick} t={t} />
          </li>
        </ul>
      </div>
    </>
  )
}

const BODIES = { unfold: UnfoldSet, morph: MorphSet, frost: FrostSet }
const SetBody = (props) => { const B = BODIES[props.set.id] ?? SetList; return <B {...props} /> }

/* ================= wall (home page hover background) ================= */
function Wall() {
  const embedded = window.parent !== window
  const [active, setActive] = useState(!embedded)
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
  const [layout] = useState(() => ({ cols: Math.max(1, Math.round(window.innerWidth / 380)), rows: Math.ceil(window.innerHeight / 330) + 1 }))
  return (
    <div className="wall" aria-hidden="true">
      {active && Array.from({ length: layout.cols }, (_, c) => (
        <div key={c} className="wall-col">
          {Array.from({ length: layout.rows }, (_, r) => {
            const set = SETS[(c + r * 3) % SETS.length]
            return <div key={r} className={`wall-tile set vision s-${set.id}`} style={cssVars(set.t)}><SetBody set={set} auto offset={c * 2 + r} /></div>
          })}
        </div>
      ))}
    </div>
  )
}

/* ================= page ================= */
export default function App() {
  if (new URLSearchParams(window.location.search).has('wall')) return <Wall />
  return (
    <main>
      <header className="page-head">
        <a className="back" href="../">← Advanced Interface</a>
        <h1>Ethereal</h1>
        <p>Selectors · Week 3 · visionOS</p>
      </header>
      {SETS.map((set) => (
        <section key={set.id} className={`set vision s-${set.id}`} style={cssVars(set.t)}>
          <div className="set-head">
            <h2>{set.concept}</h2>
            {/* Figma line drawing: small thumbnail, zooms in on hover / focus */}
            <a className="draft-ref" href={`${import.meta.env.BASE_URL}final/${set.id}.png`} target="_blank" rel="noreferrer">
              <img src={`${import.meta.env.BASE_URL}final/${set.id}.png`} alt={`${set.concept} drawing from Figma`} loading="lazy"
                onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
              <span>Figma</span>
            </a>
          </div>
          <SetBody set={set} />
        </section>
      ))}
    </main>
  )
}
