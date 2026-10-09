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
    <li className="row row-switch">
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
  return (
    <li className="row row-check">
      <button className="row-hit" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)}>
        <span className="cb" style={{ '--p': clamp(p), '--s': p }}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 12.5l4 4 8-9" pathLength="1" style={{ strokeDashoffset: 1 - clamp(p * 1.25 - 0.25) }} />
          </svg>
          <span className="cb-led" />
        </span>
        <span className="row-text"><span className="label">{label}</span>{detail && <span className="detail">{detail}</span>}</span>
      </button>
    </li>
  )
}

function RadioDot({ on, t }) {
  const p = useSpring(on ? 1 : 0, t.spring).value
  return <span className="rd" style={{ '--p': clamp(p), '--s': p }}><span className="rd-dot" /></span>
}

function RadioGroup({ title, options, value, onChange, t }) {
  const idx = options.indexOf(value)
  const y = useSpring(idx, t.spring).value // the selection glides between rows
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
        <li key={o} className="row row-radio">
          <button ref={(el) => (refs.current[i] = el)} className="row-hit" role="radio" aria-checked={o === value}
            tabIndex={o === value ? 0 : -1} onClick={() => onChange(o)} onKeyDown={(e) => key(e, i)}>
            <RadioDot on={o === value} t={t} />
            <span className="row-text"><span className="label">{o}</span></span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ================= the four sets =================
   tokens drive the CSS (as custom properties) AND the spec table, so the spec is always exact */
const SETS = [
  {
    id: 'glass', name: 'Glass', tone: 'Serene',
    desc: 'A frosted grouped list floating over a dawn sky. System type, calm critically damped springs, nothing hurried.',
    content: {
      switches: [['Do Not Disturb', 'Silence until 7:00', true], ['Night Shift', 'Warmer colors after sunset', false], ['Ambient sound', '', false]],
      checks: [['Morning stretch', '', false], ['Drink water', '8 glasses', true], ['Read 10 pages', '', false]],
      radio: ['Wind-down sound', ['Rain', 'Ocean', 'Forest'], 'Ocean'],
    },
    t: {
      font: '-apple-system, "SF Pro Text", Inter, system-ui, sans-serif', fontName: 'SF Pro Text (Inter fallback)', fw: 400, fs: 17, lh: 22, ls: '-0.43px',
      dfs: 13, dlh: 18, rowH: 48, padX: 16, gap: 12, listR: 16, divider: 0.5, listGap: 20,
      swW: 51, swH: 31, thW: 27, thH: 27, inset: 2, swR: 15.5, thR: 13.5, stretch: 6, swStroke: 0,
      cb: 24, cbR: 12, cbStroke: 1.5, checkStroke: 2.2, rd: 22, rdDot: 10, rdStroke: 1.5,
      ink: '#1c2a33', muted: '#6c7a85', on: '#5ac8c8', off: 'rgba(120,120,128,.16)', thumb: '#ffffff',
      spring: { damping: 1, response: 0.35 },
    },
  },
  {
    id: 'stone', name: 'Stone', tone: 'Monumental',
    desc: 'Monochrome and massive. Hairline rules, a heavy knob that takes its time, checks carved in black.',
    content: {
      switches: [['Render shadows', '', true], ['Ambient occlusion', '', false], ['Motion blur', '', false]],
      checks: [['Granite', '', false], ['Basalt', '', true], ['Obsidian', '', false]],
      radio: ['Scale', ['1×', '10×', '100×'], '10×'],
    },
    t: {
      font: 'Inter, system-ui, sans-serif', fontName: 'Inter Medium', fw: 500, fs: 18, lh: 24, ls: '-0.02em',
      dfs: 13, dlh: 18, rowH: 60, padX: 0, gap: 16, listR: 0, divider: 1, listGap: 28,
      swW: 64, swH: 36, thW: 30, thH: 30, inset: 3, swR: 18, thR: 15, stretch: 8, swStroke: 0,
      cb: 26, cbR: 3, cbStroke: 2, checkStroke: 2.5, rd: 26, rdDot: 12, rdStroke: 2,
      ink: '#0d0d0d', muted: '#6b6b6b', on: '#0d0d0d', off: '#c9c9c9', thumb: '#f2f2f2',
      spring: { damping: 1, response: 0.55 },
    },
  },
  {
    id: 'jelly', name: 'Jelly', tone: 'Playful',
    desc: 'Chunky candy controls with real bounce: the only set allowed to overshoot, because playful things wobble.',
    content: {
      switches: [['Sprinkles', '', true], ['Extra syrup', '', false], ['Silly mode', '', false]],
      checks: [['Gummy bears', '', true], ['Marshmallows', '', false], ['Popping candy', '', false]],
      radio: ['Cone', ['Waffle', 'Sugar', 'Cup'], 'Waffle'],
    },
    t: {
      font: 'Fredoka, system-ui, sans-serif', fontName: 'Fredoka SemiBold', fw: 600, fs: 18, lh: 24, ls: '0',
      dfs: 13, dlh: 18, rowH: 56, padX: 16, gap: 12, listR: 20, divider: 2, listGap: 20,
      swW: 60, swH: 34, thW: 26, thH: 26, inset: 4, swR: 17, thR: 13, stretch: 8, swStroke: 3,
      cb: 28, cbR: 9, cbStroke: 3, checkStroke: 3.5, rd: 28, rdDot: 14, rdStroke: 3,
      ink: '#3d2c5e', muted: '#7d6f99', on: '#ff6b9d', off: '#ffe7cc', thumb: '#ffc93c',
      spring: { damping: 0.6, response: 0.45 },
    },
  },
  {
    id: 'hifi', name: 'Hi-Fi', tone: 'Nostalgic',
    desc: 'A 1978 amplifier front panel: brushed aluminum, a ribbed slide switch, latching push buttons and amber pilot lamps.',
    content: {
      switches: [['Power', '', true], ['Loudness', '', false], ['Mono', '', false]],
      checks: [['Tape monitor', '', false], ['Dolby NR', '', true], ['High filter', '', false]],
      radio: ['Input', ['Phono', 'Tuner', 'Tape'], 'Phono'],
    },
    t: {
      font: 'Oswald, "Arial Narrow", sans-serif', fontName: 'Oswald Medium, uppercase', fw: 500, fs: 14, lh: 18, ls: '0.12em',
      dfs: 11, dlh: 14, rowH: 52, padX: 18, gap: 14, listR: 6, divider: 1, listGap: 20,
      swW: 56, swH: 24, thW: 24, thH: 18, inset: 3, swR: 4, thR: 2, stretch: 0, swStroke: 1,
      cb: 28, cbR: 4, cbStroke: 1, checkStroke: 0, rd: 14, rdDot: 8, rdStroke: 1,
      ink: '#2a2620', muted: '#6d665b', on: '#ffb02e', off: '#3a352d', thumb: '#d9d6cf',
      spring: { damping: 0.9, response: 0.22 },
    },
  },
]

const cssVars = (t) => ({
  '--font': t.font, '--fw': t.fw, '--fs': `${t.fs}px`, '--lh': `${t.lh}px`, '--ls': t.ls, '--dfs': `${t.dfs}px`, '--dlh': `${t.dlh}px`,
  '--row-h': `${t.rowH}px`, '--pad-x': `${t.padX}px`, '--gap': `${t.gap}px`, '--list-r': `${t.listR}px`, '--divider': `${t.divider}px`, '--list-gap': `${t.listGap}px`,
  '--sw-w': `${t.swW}px`, '--sw-h': `${t.swH}px`, '--th-w': `${t.thW}px`, '--th-h': `${t.thH}px`, '--inset': `${t.inset}px`, '--sw-r': `${t.swR}px`, '--th-r': `${t.thR}px`, '--sw-stroke': `${t.swStroke}px`,
  '--cb': `${t.cb}px`, '--cb-r': `${t.cbR}px`, '--cb-stroke': `${t.cbStroke}px`, '--check-stroke': t.checkStroke,
  '--rd': `${t.rd}px`, '--rd-dot': `${t.rdDot}px`, '--rd-stroke': `${t.rdStroke}px`,
  '--ink': t.ink, '--muted': t.muted, '--on': t.on, '--off': t.off, '--thumb': t.thumb,
})

/* ================= spec (generated from the same tokens) ================= */
function Spec({ t }) {
  const rows = [
    ['Typography', [['Font', t.fontName], ['Label size / line height', `${t.fs} / ${t.lh}px`], ['Label tracking', t.ls], ['Weight', t.fw], ['Detail size / line height', `${t.dfs} / ${t.dlh}px`]]],
    ['List', [['Row height', `${t.rowH}px`], ['Horizontal padding', `${t.padX}px`], ['Control ↔ label gap', `${t.gap}px`], ['Corner radius', `${t.listR}px`], ['Divider', `${t.divider}px`], ['Space between lists', `${t.listGap}px`]]],
    ['Switch', [['Track', `${t.swW} × ${t.swH}px, radius ${t.swR}px`], ['Thumb', `${t.thW} × ${t.thH}px, radius ${t.thR}px`], ['Inset', `${t.inset}px`], ['Press stretch', `${t.stretch}px`], ['Stroke', `${t.swStroke}px`]]],
    ['Checkbox', [['Box', `${t.cb} × ${t.cb}px, radius ${t.cbR}px`], ['Box stroke', `${t.cbStroke}px`], ['Check stroke', t.checkStroke ? `${t.checkStroke}px` : 'LED lamp instead']]],
    ['Radio', [['Ring', `${t.rd} × ${t.rd}px, round`], ['Ring stroke', `${t.rdStroke}px`], ['Dot', `${t.rdDot}px`]]],
    ['Color', [['Ink', t.ink], ['Secondary', t.muted], ['On', t.on], ['Off', t.off], ['Thumb', t.thumb]]],
    ['Motion', [['Spring damping', `${t.spring.damping}${t.spring.damping < 1 ? ' (bounces)' : ' (no overshoot)'}`], ['Spring response', `${t.spring.response}s`], ['Drag', '1:1 tracking, rubber-band past the ends, flick direction decides'], ['Press', 'feedback on pointer-down']]],
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
        <p>Week 3 · four sets · switch, checkbox and radio in labeled lists · off ↔ on · spec below each set. Switches can be tapped or dragged.</p>
      </header>
      {SETS.map((set, i) => (
        <section key={set.id} className={`set s-${set.id}`} style={cssVars(set.t)}>
          <div className="set-head">
            <div className="set-tone">{String(i + 1).padStart(2, '0')} · {set.tone}</div>
            <h2>{set.name}</h2>
            <p>{set.desc}</p>
          </div>
          <SetLists set={set} />
          <Spec t={set.t} />
        </section>
      ))}
    </main>
  )
}
