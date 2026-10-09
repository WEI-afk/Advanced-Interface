import { useCallback, useEffect, useRef, useState } from 'react'

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

function Switch({ checked, onChange, label, detail, t }) {
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
  const up = (e) => {
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
  return (
    <li className="row row-switch" onPointerMove={glow}>
      <span className="row-text"><span className="label">{label}</span>{detail && <span className="detail">{detail}</span>}</span>
      <button className="sw" role="switch" aria-checked={checked} aria-label={label}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClick={(e) => { if (e.detail === 0) onChange(!checked) }} // keyboard (Space / Enter)
        style={{ '--p': p, '--k': k }}>
        <span className="sw-track" />
        <span className="sw-led" />
        <span className="sw-thumb" style={{ transform: `translateX(${p * travel - k * t.stretch * clamp(p)}px)`, width: t.thW + k * t.stretch }} />
      </button>
    </li>
  )
}

function Checkbox({ checked, onChange, label, detail, t }) {
  const p = useSpring(checked ? 1 : 0, t.spring).value
  const ring = t.checkStyle === 'ring'
  return (
    <li className="row row-check">
      <button className="row-hit" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)} onPointerMove={glow}>
        <span className={`cb ${ring ? 'cb-ring' : ''}`} style={{ '--p': clamp(p), '--s': p }}>
          {ring ? (
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <circle className="ring-track" cx="16" cy="16" r="13" />
              <circle className="ring-fill" cx="16" cy="16" r="13" pathLength="1" style={{ strokeDashoffset: 1 - clamp(p / 0.7) }} />
              <path d="M10.5 16.5l3.6 3.6 7.4-8" pathLength="1" style={{ strokeDashoffset: 1 - clamp((p - 0.55) / 0.45) }} />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 12.5l4 4 8-9" pathLength="1" style={{ strokeDashoffset: 1 - clamp(p * 1.25 - 0.25) }} />
            </svg>
          )}
        </span>
        <span className="row-text"><span className="label">{label}</span>{detail && <span className="detail">{detail}</span>}</span>
      </button>
    </li>
  )
}

function RadioDot({ on, t }) {
  const p = useSpring(on ? 1 : 0, t.spring).value
  return (
    <span className="rd" style={{ '--p': clamp(p), '--s': p }}>
      <span className="rd-dot" />
      {on && t.radioStyle === 'ripple' && <span className="rd-ripple" />}
    </span>
  )
}

function RadioGroup({ title, options, value, onChange, t }) {
  const idx = options.indexOf(value)
  const y = useSpring(idx, t.spring).value // the selection glides between rows, same path both ways
  const refs = useRef([])
  const trailing = t.radioStyle === 'check'
  const key = (e, i) => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!d) return
    e.preventDefault()
    const n = (i + d + options.length) % options.length
    onChange(options[n]); refs.current[n]?.focus()
  }
  return (
    <ul className={`list radio-list ${trailing ? 'radio-trailing' : ''}`} role="radiogroup" aria-label={title} style={{ '--y': y }}>
      <span className="rd-glide" aria-hidden="true" />
      {trailing && (
        <svg className="rd-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
      )}
      {options.map((o, i) => (
        <li key={o} className="row row-radio">
          <button ref={(el) => (refs.current[i] = el)} className="row-hit" role="radio" aria-checked={o === value}
            tabIndex={o === value ? 0 : -1} onClick={() => onChange(o)} onKeyDown={(e) => key(e, i)} onPointerMove={glow}>
            {!trailing && <RadioDot on={o === value} t={t} />}
            <span className="row-text"><span className="label">{o}</span></span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ================= the four sets =================
   tokens drive the CSS (as custom properties) AND the spec table, so the spec is always exact */
const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif'
const SETS = [
  {
    id: 'glass', name: 'Liquid Glass', tone: 'Serene', platform: 'iOS',
    desc: 'An iOS Settings list in frosted glass. Hold a switch and its thumb turns into a clear glass lens; the selection is a checkmark that glides to its row.',
    content: {
      switches: [['Airplane Mode', '', false], ['Wi-Fi', 'Home', true], ['Bluetooth', '', true]],
      checks: [['Buy oat milk', '', false], ['Call Mom', 'Today, 6 PM', true], ['Water the plants', '', false]],
      radio: ['Appearance', ['Light', 'Dark', 'Automatic'], 'Light'],
    },
    t: {
      font: SF, fontName: 'SF Pro Text Regular', fw: 400, fs: 17, lh: 22, ls: '-0.43px',
      dfs: 13, dlh: 18, rowH: 48, padX: 16, gap: 12, listR: 26, divider: 0.5, listGap: 20,
      swW: 64, swH: 28, thW: 38, thH: 24, inset: 2, swR: 14, thR: 12, stretch: 8, swStroke: 0,
      cb: 24, cbR: 12, cbStroke: 1.5, checkStroke: 2.2, rd: 0, rdDot: 0, rdStroke: 0,
      checkStyle: 'circle', radioStyle: 'check', checkNote: 'Reminders-style circle', radioNote: 'Trailing checkmark (17pt) glides between rows',
      ink: '#000000', muted: '#8a8a8e', on: '#34c759', off: 'rgba(120,120,128,.16)', thumb: '#ffffff', accent: '#007aff',
      spring: { damping: 1, response: 0.35 }, signature: 'Thumb becomes a glass lens while held (scale 1.25, 65% clear)',
    },
  },
  {
    id: 'rings', name: 'Rings', tone: 'Energetic', platform: 'watchOS',
    desc: 'True black and Activity colors. Checking a goal sweeps its ring closed before the check pops in; choosing a workout sends out a ripple like a haptic tap.',
    content: {
      switches: [['Wrist Detection', '', true], ['Always On', '', false], ['Silent Mode', '', false]],
      checks: [['Move 500 cal', '', true], ['Exercise 30 min', '', false], ['Stand 12 hours', '', false]],
      radio: ['Workout', ['Outdoor Run', 'Cycling', 'Yoga'], 'Outdoor Run'],
    },
    t: {
      font: '-apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Text", Inter, system-ui, sans-serif', fontName: 'SF Pro Rounded Semibold', fw: 600, fs: 16, lh: 21, ls: '-0.2px',
      dfs: 13, dlh: 16, rowH: 56, padX: 14, gap: 12, listR: 0, divider: 0, listGap: 20,
      swW: 51, swH: 31, thW: 27, thH: 27, inset: 2, swR: 15.5, thR: 13.5, stretch: 6, swStroke: 0,
      cb: 30, cbR: 15, cbStroke: 3, checkStroke: 3, rd: 26, rdDot: 12, rdStroke: 2.5,
      checkStyle: 'ring', radioStyle: 'ripple', checkNote: 'Activity ring, sweeps closed first', radioNote: 'Dot with a one-shot ripple',
      ink: '#ffffff', muted: '#8e8e93', on: '#a6ff00', off: '#2c2c2e', thumb: '#ffffff', accent: '#fa114f',
      spring: { damping: 0.82, response: 0.3 }, signature: 'Ring sweep 0→70%, check draws 55→100%',
    },
  },
  {
    id: 'spatial', name: 'Spatial', tone: 'Ethereal', platform: 'visionOS',
    desc: 'Glass panels floating in a soft landscape. A specular light follows your pointer across each row, and controls sink into depth when you press them.',
    content: {
      switches: [['Spatial Audio', '', true], ['Look to Scroll', '', false], ['Dim Passthrough', '', false]],
      checks: [['Show Environment', '', true], ['Persona', '', false], ['Guest Mode', '', false]],
      radio: ['Environment', ['Yosemite', 'Mount Hood', 'Moon'], 'Yosemite'],
    },
    t: {
      font: SF, fontName: 'SF Pro Text Medium', fw: 500, fs: 17, lh: 22, ls: '-0.3px',
      dfs: 13, dlh: 18, rowH: 54, padX: 18, gap: 14, listR: 30, divider: 0, listGap: 22,
      swW: 54, swH: 32, thW: 28, thH: 28, inset: 2, swR: 16, thR: 14, stretch: 6, swStroke: 0,
      cb: 26, cbR: 8, cbStroke: 1.5, checkStroke: 2.4, rd: 24, rdDot: 10, rdStroke: 1.5,
      checkStyle: 'square', radioStyle: 'dot', checkNote: 'Rounded glass square', radioNote: 'Glass ring, white dot',
      ink: '#ffffff', muted: 'rgba(255,255,255,.62)', on: 'rgba(255,255,255,.92)', off: 'rgba(255,255,255,.16)', thumb: '#ffffff', accent: '#ffffff',
      spring: { damping: 1, response: 0.45 }, signature: 'Pointer-tracked specular highlight; press sinks 4% in depth',
    },
  },
  {
    id: 'aqua', name: 'Aqua', tone: 'Nostalgic', platform: 'Mac OS X',
    desc: 'Mac OS X circa 2001: pinstripes, Lucida Grande and lickable blue gel. Checked boxes throb like the default button; radio dots land as wobbling water drops.',
    content: {
      switches: [['Magnification', '', true], ['Animate opening apps', '', true], ['Automatically hide the Dock', '', false]],
      checks: [['Hard disks', '', true], ['CDs, DVDs and iPods', '', false], ['Connected servers', '', false]],
      radio: ['Appearance', ['Blue', 'Graphite', 'Bondi'], 'Blue'],
    },
    t: {
      font: '"Lucida Grande", "Lucida Sans Unicode", Inter, system-ui, sans-serif', fontName: 'Lucida Grande', fw: 400, fs: 13, lh: 18, ls: '0',
      dfs: 11, dlh: 14, rowH: 34, padX: 14, gap: 8, listR: 6, divider: 1, listGap: 18,
      swW: 46, swH: 22, thW: 22, thH: 20, inset: 1, swR: 11, thR: 10, stretch: 4, swStroke: 1,
      cb: 16, cbR: 4, cbStroke: 1, checkStroke: 2.6, rd: 16, rdDot: 7, rdStroke: 1,
      checkStyle: 'aqua', radioStyle: 'drop', checkNote: 'Gel box, throbs while checked', radioNote: 'Gel bead, dot lands like a drop',
      ink: '#000000', muted: '#555555', on: '#3a8ee6', off: '#e3e3e3', thumb: '#fafafa', accent: '#3a8ee6',
      spring: { damping: 0.45, response: 0.42 }, signature: 'Throb 1.6s on checked items; drop stretch from spring overshoot',
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

/* ================= spec (generated from the same tokens) ================= */
function Spec({ t }) {
  const rows = [
    ['Typography', [['Font', t.fontName], ['Label size / line height', `${t.fs} / ${t.lh}px`], ['Label tracking', t.ls], ['Weight', t.fw], ['Detail size / line height', `${t.dfs} / ${t.dlh}px`]]],
    ['List', [['Row height', `${t.rowH}px`], ['Horizontal padding', `${t.padX}px`], ['Control ↔ label gap', `${t.gap}px`], ['Corner radius', `${t.listR}px`], ['Divider', `${t.divider}px`], ['Space between lists', `${t.listGap}px`]]],
    ['Switch', [['Track', `${t.swW} × ${t.swH}px, radius ${t.swR}px`], ['Thumb', `${t.thW} × ${t.thH}px, radius ${t.thR}px`], ['Inset', `${t.inset}px`], ['Press stretch', `${t.stretch}px`], ['Stroke', `${t.swStroke}px`]]],
    ['Checkbox', [['Style', t.checkNote], ['Size', `${t.cb} × ${t.cb}px, radius ${t.cbR}px`], ['Stroke', `${t.cbStroke}px`], ['Check stroke', `${t.checkStroke}px`]]],
    ['Radio', [['Style', t.radioNote], ...(t.rd ? [['Ring', `${t.rd} × ${t.rd}px, round`], ['Ring stroke', `${t.rdStroke}px`], ['Dot', `${t.rdDot}px`]] : [['Checkmark', '17 × 17px, stroke 2.4px, accent color']])]],
    ['Color', [['Ink', t.ink], ['Secondary', t.muted], ['On', t.on], ['Off', t.off], ['Thumb', t.thumb], ['Accent', t.accent]]],
    ['Motion', [['Spring damping', `${t.spring.damping}${t.spring.damping < 1 ? ' (bounces)' : ' (no overshoot)'}`], ['Spring response', `${t.spring.response}s`], ['Signature', t.signature], ['Drag', '1:1 tracking, rubber-band past the ends, flick direction decides'], ['Press', 'feedback on pointer-down']]],
  ]
  return (
    <details className="spec" open>
      <summary>Spec</summary>
      <div className="spec-grid">
        {rows.map(([group, items]) => (
          <div key={group} className="spec-group">
            <h4>{group}</h4>
            <dl>{items.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{group === 'Color' ? <><i style={{ background: v }} />{v}</> : v}</dd></div>
            ))}</dl>
          </div>
        ))}
      </div>
    </details>
  )
}

/* ================= a set: three lists ================= */
function SetLists({ set, auto, offset = 0 }) {
  const { content: c, t } = set
  const [sw, setSw] = useState(c.switches.map((s) => s[2]))
  const [cb, setCb] = useState(c.checks.map((s) => s[2]))
  const [rd, setRd] = useState(c.radio[2])
  useEffect(() => {
    if (!auto) return
    let i = offset
    const id = setInterval(() => {
      const k = i++ % 9, j = k % 3
      if (k < 3) setSw((a) => a.map((v, n) => (n === j ? !v : v)))
      else if (k < 6) setCb((a) => a.map((v, n) => (n === j ? !v : v)))
      else setRd(c.radio[1][j])
    }, 900)
    return () => clearInterval(id)
  }, [auto, offset, c])
  return (
    <div className="lists">
      <div className="list-block">
        <h3 className="list-title">Switch</h3>
        <ul className="list">{c.switches.map(([l, d], i) => (
          <Switch key={l} label={l} detail={d} t={t} checked={sw[i]} onChange={(v) => setSw((a) => a.map((x, n) => (n === i ? v : x)))} />
        ))}</ul>
      </div>
      <div className="list-block">
        <h3 className="list-title">Checkbox</h3>
        <ul className="list">{c.checks.map(([l, d], i) => (
          <Checkbox key={l} label={l} detail={d} t={t} checked={cb[i]} onChange={(v) => setCb((a) => a.map((x, n) => (n === i ? v : x)))} />
        ))}</ul>
      </div>
      <div className="list-block">
        <h3 className="list-title">Radio · {c.radio[0]}</h3>
        <RadioGroup title={c.radio[0]} options={c.radio[1]} value={rd} onChange={setRd} t={t} />
      </div>
    </div>
  )
}

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
  const [layout] = useState(() => ({ cols: Math.max(1, Math.round(window.innerWidth / 380)), rows: Math.ceil(window.innerHeight / 500) + 1 }))
  return (
    <div className="wall" aria-hidden="true">
      {active && Array.from({ length: layout.cols }, (_, c) => (
        <div key={c} className="wall-col">
          {Array.from({ length: layout.rows }, (_, r) => {
            const set = SETS[(c + r * 3) % SETS.length]
            return <div key={r} className={`wall-tile set s-${set.id}`} style={cssVars(set.t)}><SetLists set={set} auto offset={c * 4 + r * 2} /></div>
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
        <h1>Selectors</h1>
        <p>Week 3 · four Apple-style sets, each its own platform, look and motion · switch, checkbox and radio in labeled lists · off ↔ on · spec below each set. Switches can be tapped or dragged.</p>
      </header>
      {SETS.map((set, i) => (
        <section key={set.id} className={`set s-${set.id}`} style={cssVars(set.t)}>
          <div className="set-head">
            <div>
              <div className="set-tone">{String(i + 1).padStart(2, '0')} · {set.tone} · {set.platform}</div>
              <h2>{set.name}</h2>
              <p>{set.desc}</p>
            </div>
            {/* Figma line drawing + redline spec: small thumbnail, zooms in on hover / focus */}
            <a className="draft-ref" href={`${import.meta.env.BASE_URL}final/${set.id}.png`} target="_blank" rel="noreferrer">
              <img src={`${import.meta.env.BASE_URL}final/${set.id}.png`} alt={`${set.name} drawing and spec from Figma`} loading="lazy"
                onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
              <span>Figma</span>
            </a>
          </div>
          <SetLists set={set} />
          <Spec t={set.t} />
        </section>
      ))}
    </main>
  )
}
