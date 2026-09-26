import { Component as ReactComponent, useEffect, useRef, useState } from 'react'

const STATES = ['zero', 'progress', 'complete']
const LABELS = { zero: 'Zero', progress: 'Progress', complete: 'Complete' }

/* Drives a single indicator: state + simulated value */
function useIndicator(determinate, stepped) {
  const [state, setState] = useState('zero')
  const [value, setValue] = useState(0)
  const timer = useRef(null)

  useEffect(() => {
    clearInterval(timer.current)
    if (state === 'zero') setValue(0)
    if (state === 'complete') setValue(100)
    if (state === 'progress') {
      if (determinate && stepped) {
        // progress arrives in chunks (one chunk per lever pull)
        setValue(0)
        let v = 0
        const step = () => {
          v = Math.min(100, v + 12 + Math.random() * 14)
          if (v >= 100) return setState('complete')
          setValue(v)
          timer.current = setTimeout(step, 1600)
        }
        timer.current = setTimeout(step, 500)
      } else if (determinate) {
        setValue(0)
        timer.current = setInterval(() => {
          setValue((v) => {
            const next = Math.min(100, v + Math.random() * 6 + 1)
            if (next >= 100) {
              clearInterval(timer.current)
              setTimeout(() => setState('complete'), 300)
            }
            return next
          })
        }, 120)
      } else {
        // indeterminate: unknown duration, finishes after a while
        timer.current = setTimeout(() => setState('complete'), 4500)
      }
    }
    return () => {
      clearInterval(timer.current)
      clearTimeout(timer.current)
    }
  }, [state, determinate, stepped])

  return { state, setState, value: Math.round(value) }
}

/* ---------- smoothing helpers ---------- */
// follows a target with a critically damped spring: starts from rest, speeds up, settles
// without overshoot — so values never jump, even when the target does
function useSmooth(target, rate = 8) {
  const [v, setV] = useState(target)
  const cur = useRef({ x: target, vel: 0 })
  useEffect(() => {
    let raf, last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000); last = now
      const c = cur.current
      const d = target - c.x
      if (Math.abs(d) < 0.005 && Math.abs(c.vel) < 0.01) { c.x = target; c.vel = 0; setV(target); return }
      c.vel += (rate * rate * d - 2 * rate * c.vel) * dt
      c.x += c.vel * dt
      setV(c.x)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, rate])
  return v
}

// time in seconds while `active`, driven by requestAnimationFrame
function useClock(active) {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf
    const start = performance.now()
    // rAF's timestamp can be a hair earlier than performance.now(), so clamp at 0
    const loop = (now) => { setT(Math.max(0, (now - start) / 1000)); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])
  return t
}

const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)
const mix = (a, b, k) => a + (b - a) * k

// text that cross-fades in whenever its key changes
function Swap({ k, children }) {
  return <span key={k} className="swap">{children}</span>
}

function Caption({ state, children }) {
  return <div className="play-caption"><Swap k={state}>{children}</Swap></div>
}

/* ---------- PLAYFUL · BOUNCE BUDDY ---------- */
const CONFETTI = ['#ff6b9d', '#ffc93c', '#4dd4ac', '#6c8cff', '#b77dff']

function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} style={{ '--a': `${(360 / 14) * i}deg`, '--c': CONFETTI[i % CONFETTI.length], '--d': `${40 + (i % 3) * 14}px` }} />
      ))}
    </div>
  )
}

function Face({ state }) {
  return (
    <div className={`face is-${state}`}>
      <span className="eye" /><span className="eye" />
      <span className="mouth" />
      <span className="zzz-wrap"><span className="zzz">z</span></span>
    </div>
  )
}

function PlayfulDeterminate({ state, value }) {
  const v = useSmooth(value)
  return (
    <div className={`play-det st is-${state}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="play-lane">
        <div className="play-rider" style={{ left: `${v}%` }}>
          <div className="play-bubble">
            <Swap k={state}>{state === 'zero' ? 'nap time' : state === 'progress' ? `${Math.round(v)}%` : 'Yay!'}</Swap>
          </div>
          <div className="hopper"><Face state={state} /></div>
          {state === 'complete' && <Confetti />}
        </div>
      </div>
      <div className="play-track">
        <div className="play-fill" style={{ width: `${v}%` }}><span className="fill-done" /></div>
      </div>
    </div>
  )
}

function PlayfulIndeterminate({ state }) {
  return (
    <div className={`play-ind st is-${state}`} role="status" aria-busy={state === 'progress'}>
      <div className="play-balls">
        {[0, 1, 2].map((i) => <span key={i} className={`ball-slot s${i}`}><span className={`ball b${i}`} /></span>)}
        <div className="play-big"><Face state="complete" />{state === 'complete' && <Confetti />}</div>
      </div>
      <Caption state={state}>
        {state === 'zero' && 'waiting to play…'}
        {state === 'progress' && 'boing boing boing'}
        {state === 'complete' && 'All done!'}
      </Caption>
    </div>
  )
}

/* ---------- PLAYFUL · SLOT MACHINE ---------- */
const SYMBOLS = ['🍒', '7', '🍋', '⭐', '🔔', '🍒', '7', '🍋', '⭐', '🔔']

// a blurred strip that starts on the symbol that was showing, then speeds up
function SpinStrip({ i, first, fade, delay }) {
  const cells = [first, ...SYMBOLS, first, ...SYMBOLS]
  return (
    <div className={`spin-strip ${fade ? 'fade' : ''}`} style={{ '--d': `${0.5 + i * 0.08}s`, '--delay': delay }}>
      {cells.map((s, k) => <span key={k} className={`cell ${s === '7' ? 'seven' : ''}`}>{s}</span>)}
    </div>
  )
}

// three reels that never swap instantly: they spin, or roll the old symbol out and the new one in
function ReelSet({ syms, spinning, red }) {
  const key = (spinning ? '~' : '') + syms.join('|')
  const shown = useRef({ syms, spinning })
  const trans = useRef({ key, from: syms, fromSpin: false })
  if (trans.current.key !== key) {
    trans.current = { key, from: shown.current.syms, fromSpin: shown.current.spinning }
    shown.current = { syms, spinning }
  }
  const { from, fromSpin } = trans.current
  return syms.map((sym, i) => {
    const delay = `${i * 0.18}s`
    const changed = !spinning && (fromSpin || from[i] !== sym)
    const cls = (s) => `cell ${s === '7' || red ? 'seven' : ''}`
    return (
      <div className="reel" key={i}>
        {(spinning || fromSpin) && <SpinStrip key="strip" i={i} first={spinning ? sym : from[i]} fade={!spinning} delay={delay} />}
        {!spinning && !fromSpin && from[i] !== sym && (
          <span key={`${key}-out`} className={`${cls(from[i])} out`} style={{ animationDelay: delay }}>{from[i]}</span>
        )}
        {!spinning && (
          <span key={`${key}-in`} className={`${cls(sym)} ${changed ? 'in' : ''}`} style={{ animationDelay: delay }}>{sym}</span>
        )}
      </div>
    )
  })
}

function Machine({ state, marquee, reels, leverKey = 0, leverPulled, paid }) {
  return (
    <div className={`slot st is-${state}`}>
      <div className="slot-body">
        <span className="bolt tl" /><span className="bolt tr" /><span className="bolt bl" /><span className="bolt br" />
        <div className="slot-lights">
          {Array.from({ length: 9 }, (_, i) => <span key={i} />)}
        </div>
        <div className="slot-marquee"><Swap k={marquee}>{marquee}</Swap></div>
        <div className="slot-window">{reels}</div>
        <div className="slot-buttons"><span className="red" /><span className="blue" /><span className="gray" /></div>
        <div className={`slot-tray ${paid ? 'paid' : ''}`}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className="coin" style={{ left: `${14 + i * 16}%`, '--i': i }} />
          ))}
        </div>
      </div>
      <div className="slot-lever">
        <div className="lever-track" />
        <div key={leverKey} className={`lever-knob ${leverPulled ? 'pulled' : ''}`} />
      </div>
    </div>
  )
}

const digitsOf = (v) => [String(Math.floor(v / 10)), String(v % 10), '%']

function SlotDeterminate({ state, value }) {
  const target = state === 'complete' ? ['1', '0', '0'] : digitsOf(state === 'zero' ? 0 : value)
  const key = target.join('')
  const [shown, setShown] = useState(target)
  const [spinning, setSpinning] = useState(false)
  const [pulls, setPulls] = useState(0)

  // every change of number = pull the lever, spin, then land on the new number
  useEffect(() => {
    if (key === shown.join('')) { setSpinning(false); return }
    setPulls((n) => n + 1)
    const t1 = setTimeout(() => setSpinning(true), 250)
    const t2 = setTimeout(() => { setSpinning(false); setShown(target) }, 950)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const landed = shown.join('') === '100'
  const marquee = spinning ? 'ROLLING…'
    : state === 'zero' ? 'INSERT COIN'
    : state === 'complete' ? (landed ? 'JACKPOT! 100%' : 'LAST PULL!')
    : shown.join('') === '00%' ? 'PULL!' : 'PULL AGAIN!'

  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <Machine
        state={state}
        marquee={marquee}
        reels={<ReelSet syms={shown} spinning={spinning} red={landed && state === 'complete'} />}
        leverKey={pulls}
        leverPulled={pulls > 0}
        paid={state === 'complete' && landed && !spinning}
      />
    </div>
  )
}
SlotDeterminate.stepped = true

function SlotIndeterminate({ state }) {
  const syms = state === 'complete' ? ['7', '7', '7'] : ['🍒', '⭐', '🍋']
  return (
    <div role="status" aria-busy={state === 'progress'}>
      <Machine
        state={state}
        marquee={state === 'zero' ? 'PULL ME!' : state === 'progress' ? 'SPINNING…' : 'JACKPOT!'}
        reels={<ReelSet syms={syms} spinning={state === 'progress'} />}
        leverPulled={state === 'progress'}
        paid={state === 'complete'}
      />
    </div>
  )
}

/* ---------- PLAYFUL · CAMERA SEEK ---------- */
// camera views from the sketch: left small → center big → top-right → center medium
const HUNT = [
  { at: 0, x: 26, y: 50, s: 0.9, r: -18, blur: 2.5 },
  { at: 0.28, x: 50, y: 50, s: 2.4, r: 12, blur: 0.6 },
  { at: 0.55, x: 82, y: 24, s: 1.3, r: -10, blur: 2 },
  { at: 0.8, x: 50, y: 50, s: 1.4, r: 20, blur: 1.2 },
  { at: 1, x: 26, y: 50, s: 0.9, r: -18, blur: 2.5 },
]
const IDLE = HUNT[0]
const LOCKED = { x: 50, y: 50, s: 2, r: 0, blur: 0 }
const FAR = { x: 18, y: 30, s: 0.75, r: -40, blur: 3.5 }

function huntView(t, period = 5) {
  const k = (((t / period) % 1) + 1) % 1
  const i = Math.max(0, HUNT.findIndex((f, n) => n < HUNT.length - 1 && k >= f.at && k < HUNT[n + 1].at))
  const a = HUNT[i], b = HUNT[i + 1]
  const e = ease((k - a.at) / (b.at - a.at))
  return { x: mix(a.x, b.x, e), y: mix(a.y, b.y, e), s: mix(a.s, b.s, e), r: mix(a.r, b.r, e), blur: mix(a.blur, b.blur, e) }
}

function useSmoothView(target, rate) {
  return {
    x: useSmooth(target.x, rate), y: useSmooth(target.y, rate), s: useSmooth(target.s, rate),
    r: useSmooth(target.r, rate), blur: useSmooth(target.blur, rate),
  }
}

const DECOYS = [
  { x: 41, y: 43, k: 'ring' }, { x: 60, y: 57, k: 'cross' }, { x: 58, y: 41, k: 'dot' }, { x: 42, y: 60, k: 'tri' },
  { x: 36, y: 52, k: 'cross' }, { x: 64, y: 47, k: 'ring' }, { x: 52, y: 37, k: 'tri' }, { x: 49, y: 64, k: 'dot' },
]

function Camera({ state, view, status, main }) {
  const { x, y, s, r, blur } = view
  return (
    <div className={`cam st is-${state}`}>
      <div className="cam-frame">
        <div
          className="cam-scene"
          style={{ transform: `translate(${(x - 50) / 3}%, ${(y - 50) / 3}%) rotate(${r}deg) scale(${s})`, filter: `blur(${blur}px)` }}
        >
          {DECOYS.map((d, i) => <span key={i} className={`decoy ${d.k}`} style={{ left: `${d.x}%`, top: `${d.y}%` }} />)}
          <div className="cam-subject" />
        </div>

        <div className="cam-hud">
          <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
          <div className="hud-top">
            <span className="rec">● <Swap k={status}>{status}</Swap></span>
            <span>×{s.toFixed(1)}</span>
          </div>
          <div className="reticle" />
          <div className="hud-bottom">
            <span>↻ {Math.round(r)}°</span>
            <span className="hud-main">{main}</span>
            <span>AF {blur < 0.3 ? 'OK' : '···'}</span>
          </div>
        </div>
        {state === 'complete' && <div className="cam-flash" />}
      </div>
    </div>
  )
}

function SeekDeterminate({ state, value }) {
  const p = value / 100
  // closes in on the subject; the wobble dies down as it gets closer
  const w = 1 - p
  const target = state === 'complete' ? LOCKED : {
    x: mix(FAR.x, LOCKED.x, p) + Math.sin(p * Math.PI * 4) * 10 * w,
    y: mix(FAR.y, LOCKED.y, p) + Math.sin(p * Math.PI * 3) * 10 * w,
    s: mix(FAR.s, LOCKED.s, p),
    r: mix(FAR.r, LOCKED.r, p) + Math.sin(p * Math.PI * 5) * 10 * w,
    blur: mix(FAR.blur, 0, p),
  }
  const view = useSmoothView(target, 6)
  const shown = Math.round(useSmooth(value, 8))
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <Camera
        state={state}
        view={view}
        status={state === 'zero' ? 'STANDBY' : state === 'progress' ? 'FOCUSING' : 'CAPTURED'}
        main={state === 'complete' ? `✓ ${shown}%` : `${shown}%`}
      />
      <Caption state={state}>
        {state === 'zero' && 'Point and shoot…'}
        {state === 'progress' && `Focusing · ${shown}%`}
        {state === 'complete' && 'Got the shot! · 100%'}
      </Caption>
    </div>
  )
}

function SeekIndeterminate({ state }) {
  const t = useClock(state === 'progress')
  // the hunt starts from the idle view, and leaving it eases into the next view
  const target = state === 'progress' ? huntView(t) : state === 'complete' ? LOCKED : IDLE
  const view = useSmoothView(target, state === 'progress' ? 10 : 4)
  return (
    <div role="status" aria-busy={state === 'progress'}>
      <Camera
        state={state}
        view={view}
        status={state === 'zero' ? 'STANDBY' : state === 'progress' ? 'SEEKING' : 'LOCKED'}
        main={state === 'complete' ? '✓' : state === 'progress' ? '· · ·' : ''}
      />
      <Caption state={state}>
        {state === 'zero' && 'Point and shoot…'}
        {state === 'progress' && 'Seeking…'}
        {state === 'complete' && 'Got the shot!'}
      </Caption>
    </div>
  )
}

/* ---------- PLAYFUL · TUBE SLIDE ---------- */
const RINGS = 22
const FLOOR = Math.asin(0.55) // floor is the bottom slice of each ring, below 55% of its radius
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const tint = (a, b, k) => `rgb(${hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * k)).join(',')})`

function drawTube(ctx, W, H, v) {
  const { phase, cycle, sway, swayAmp, exit, glow } = v
  ctx.fillStyle = '#0f2f22'
  ctx.fillRect(0, 0, W, H)

  ctx.save()
  ctx.translate(W / 2 + Math.sin(sway * 0.7) * W * 0.05 * swayAmp, H * 0.47 + Math.cos(sway * 0.9) * H * 0.04 * swayAmp)
  ctx.rotate(Math.sin(sway * 0.8) * 0.28 * swayAmp)

  // walls: rings from near (big) to far (small), each one a band of the tube
  const rings = []
  for (let i = 0; i < RINGS; i++) {
    const d = i - phase
    if (d < 0) continue
    rings.push({ R: (H * 0.55) / (0.2 + d * 0.5), fog: Math.pow(d / RINGS, 0.8), id: i + cycle })
  }
  for (const { R, fog, id } of rings) {
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2)
    ctx.fillStyle = tint(id % 2 ? '#1e5b3f' : '#2b7351', '#b9e6cf', fog)
    ctx.fill()
    // glossy streak on the upper-left wall
    ctx.beginPath(); ctx.arc(0, 0, R * 0.93, -2.5, -1.7)
    ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - fog)})`; ctx.lineWidth = R * 0.05; ctx.stroke()
  }
  const farR = rings.length ? rings[rings.length - 1].R : 0

  // floor: same rings, clipped to the wedge under the vanishing point → tile rows
  const reach = W * 3
  ctx.save()
  ctx.beginPath(); ctx.moveTo(0, 0)
  ctx.lineTo(-Math.cos(FLOOR) * reach, Math.sin(FLOOR) * reach)
  ctx.lineTo(Math.cos(FLOOR) * reach, Math.sin(FLOOR) * reach)
  ctx.closePath(); ctx.clip()
  for (const { R, fog, id } of rings) {
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2)
    ctx.fillStyle = tint(id % 2 ? '#d9b54a' : '#e8c962', '#fff4c8', fog)
    ctx.fill()
  }
  // tile grout lines running down the slide
  ctx.strokeStyle = 'rgba(90,60,10,.28)'; ctx.lineWidth = 1
  for (let k = -9; k <= 9; k++) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((k / 9) * Math.cos(FLOOR) * reach, Math.sin(FLOOR) * reach); ctx.stroke()
  }
  ctx.restore()
  // light at the end of the tube
  const E = Math.max(farR, 9) + exit * Math.hypot(W, H)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, E)
  g.addColorStop(0, '#fffdf0'); g.addColorStop(0.7, '#e6f6ea'); g.addColorStop(1, '#fff1bf')
  ctx.shadowColor = '#fff6d0'; ctx.shadowBlur = 20 + glow * 40
  ctx.beginPath(); ctx.arc(0, 0, E, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill()
  ctx.restore()

  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75)
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,15,8,${0.55 * (1 - exit)})`)
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
}

function TubeCanvas({ state, value, determinate }) {
  const canvas = useRef(null)
  const live = useRef({})
  live.current = { state, value, determinate }

  useEffect(() => {
    const v = { phase: 0, cycle: 0, sway: 0, swayAmp: 0, speed: 0, p: 0, exit: 0, glow: 0 }
    let raf, last = performance.now()
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const k = (rate) => 1 - Math.exp(-rate * dt)
      const { state, value, determinate } = live.current
      const moving = state === 'progress'
      v.p += ((determinate ? value / 100 : 0) - v.p) * k(6)
      // speed and sway ease in and out instead of starting or stopping dead
      v.speed += ((moving ? 1.3 + v.p * 2 : 0) - v.speed) * k(3)
      v.swayAmp += ((moving ? 1 : 0) - v.swayAmp) * k(2)
      v.phase += dt * v.speed
      while (v.phase >= 1) { v.phase -= 1; v.cycle += 1 }
      v.sway += dt * v.swayAmp
      // how much the exit light has opened up: 0 = far away, 1 = fills the view
      const target = state === 'complete' ? 1 : moving && determinate ? Math.pow(v.p, 2.4) * 0.35 : 0
      v.exit += (target - v.exit) * k(state === 'complete' ? 3 : 4)
      v.glow += ((moving ? 0.6 + 0.4 * Math.sin(now / 250) : 0.3) - v.glow) * k(5)

      const c = canvas.current
      if (c) {
        const dpr = window.devicePixelRatio || 1
        const W = c.clientWidth, H = c.clientHeight
        if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr) }
        const ctx = c.getContext('2d')
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawTube(ctx, W, H, v)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvas} className="tube-canvas" />
}

function TubeDeterminate({ state, value }) {
  const shown = Math.round(useSmooth(value, 8))
  return (
    <div className={`tube st is-${state}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="tube-frame">
        <TubeCanvas state={state} value={value} determinate />
        <div className="tube-pill"><Swap k={state === 'complete'}>{state === 'complete' ? '✓ 100%' : `${shown}%`}</Swap></div>
        <div className="tube-out">Wheee!{state === 'complete' && <Confetti />}</div>
      </div>
      <Caption state={state}>
        {state === 'zero' && 'Ready at the top…'}
        {state === 'progress' && `Sliding down · ${shown}%`}
        {state === 'complete' && 'Made it out! · 100%'}
      </Caption>
    </div>
  )
}

function TubeIndeterminate({ state }) {
  return (
    <div className={`tube st is-${state}`} role="status" aria-busy={state === 'progress'}>
      <div className="tube-frame">
        <TubeCanvas state={state} value={0} determinate={false} />
        <div className="tube-out">Wheee!{state === 'complete' && <Confetti />}</div>
      </div>
      <Caption state={state}>
        {state === 'zero' && 'Ready at the top…'}
        {state === 'progress' && 'Sliding…'}
        {state === 'complete' && 'Made it out!'}
      </Caption>
    </div>
  )
}

/* ---------- PLAYFUL · FORTUNE TELLER ---------- */
const FLAPS = [
  { pos: 'tl', mark: '★' }, { pos: 'tr', mark: '♥' }, { pos: 'bl', mark: '●' }, { pos: 'br', mark: '▲' },
]

function Cootie({ mode, inside, insideKey }) {
  return (
    <div className={`cootie ${mode}`}>
      <div className="cootie-inside"><Swap k={insideKey}>{inside}</Swap></div>
      {/* outer wrapper opens / unfolds, inner flap does the looping flap motion */}
      {FLAPS.map((f) => <div key={f.pos} className={`fw ${f.pos}`}><div className={`flap ${f.pos}`}><span>{f.mark}</span></div></div>)}
    </div>
  )
}

function FortuneDeterminate({ state, value }) {
  const [shown, setShown] = useState(0)
  const [open, setOpen] = useState('')
  const flips = useRef(0)

  // every new value = open the fortune teller one way, peek at the new %, close it
  useEffect(() => {
    if (state !== 'progress') { setShown(value); setOpen(''); return }
    if (value === shown) return
    setOpen(flips.current++ % 2 ? 'ew' : 'ns')
    const t1 = setTimeout(() => setShown(value), 200)
    const t2 = setTimeout(() => setOpen(''), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [value, state]) // eslint-disable-line react-hooks/exhaustive-deps

  const mode = state === 'complete' ? 'unfold' : open
  return (
    <div className={`fortune st is-${state}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="fortune-stage">
        <Cootie
          mode={mode}
          insideKey={state === 'complete' ? 'done' : shown}
          inside={state === 'complete' ? <b>Done! ✨<Confetti /></b> : `${shown}%`}
        />
      </div>
      <Caption state={state}>
        {state === 'zero' && 'Pick a color…'}
        {state === 'progress' && `Telling your fortune · ${shown}%`}
        {state === 'complete' && 'Done! · 100%'}
      </Caption>
    </div>
  )
}
FortuneDeterminate.stepped = true

function FortuneIndeterminate({ state }) {
  return (
    <div className={`fortune fortune-ind st is-${state}`} role="status" aria-busy={state === 'progress'}>
      <div className="fortune-stage">
        <Cootie
          mode={state === 'complete' ? 'unfold' : ''}
          insideKey={state === 'complete'}
          inside={state === 'complete' ? <b>Done! ✨<Confetti /></b> : '✨'}
        />
      </div>
      <Caption state={state}>
        {state === 'zero' && 'Pick a color…'}
        {state === 'progress' && 'Asking the fortune teller…'}
        {state === 'complete' && 'Done!'}
      </Caption>
    </div>
  )
}

/* ---------- PLAYFUL · PAPER PLANE ---------- */
const ROUTE = 'M 30 160 C 70 60, 130 60, 150 118 S 228 178, 250 112 S 282 58, 290 62'
const deg = (rad) => (rad * 180) / Math.PI
const turn = (a, b) => ((b - a + 540) % 360) - 180 // shortest signed angle from a to b

function Plane({ x, y, angle, roll = 1, scale = 1, settle }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <g className={settle ? 'plane-settle' : ''}>
        <g transform={`scale(1 ${roll})`}>
          <polygon className="plane-body" points="16,0 -12,-10 -5,0 -12,10" />
          <line className="plane-fold" x1="-5" y1="0" x2="16" y2="0" />
        </g>
      </g>
    </g>
  )
}

function Flag({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line className="flag-pole" x1="0" y1="0" x2="0" y2="-28" />
      <polygon className="flag-cloth" points="0,-28 18,-22 0,-16" />
    </g>
  )
}

function PlaneDeterminate({ state, value }) {
  const route = useRef(null)
  const [len, setLen] = useState(0)
  useEffect(() => { if (route.current) setLen(route.current.getTotalLength()) }, [])

  const v = useSmooth(value, 6)
  const p = v / 100
  let pos = { x: 30, y: 160 }, tangent = -60
  if (len) {
    const at = route.current.getPointAtLength(p * len)
    const a = route.current.getPointAtLength(Math.max(0, p * len - 1))
    const b = route.current.getPointAtLength(Math.min(len, p * len + 1))
    pos = { x: at.x, y: at.y }
    tangent = deg(Math.atan2(b.y - a.y, b.x - a.x))
  }
  // levels out as it lands instead of snapping flat
  const angle = useSmooth(state === 'complete' && p > 0.98 ? 0 : tangent, 8)

  return (
    <div className={`paper st is-${state}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="paper-frame">
        <svg viewBox="0 0 320 200" aria-hidden>
          <text className="doodle" x="16" y="186">✗ start</text>
          <path ref={route} className="plane-route" d={ROUTE} />
          <path className="plane-done" d={ROUTE} style={{ strokeDasharray: len, strokeDashoffset: len * (1 - p) }} />
          <Flag x={290} y={66} />
          <Plane {...pos} angle={angle} settle={state === 'complete'} />
        </svg>
        <div className="pill"><Swap k={state === 'complete'}>{state === 'complete' ? '✓ 100%' : `${Math.round(v)}%`}</Swap></div>
      </div>
      <Caption state={state}>
        {state === 'zero' && 'Ready for takeoff…'}
        {state === 'progress' && `Flying · ${Math.round(v)}%`}
        {state === 'complete' && 'Landed! · 100%'}
      </Caption>
    </div>
  )
}

// figure-eight loop in the sky
const loopAt = (s) => {
  const k = 1 + Math.sin(s) ** 2
  return { x: 160 + (120 * Math.cos(s)) / k, y: 92 + (120 * Math.sin(s) * Math.cos(s)) / k }
}
const PARKED = { x: 60, y: 158, a: -15 }

// one continuous flight: taxi → take off into the loop → break away and fly off → glide back in to park
function PlaneIndeterminate({ state }) {
  const [, redraw] = useState(0)
  const live = useRef(state)
  live.current = state
  const sim = useRef(null)
  if (!sim.current) sim.current = { ...PARKED, roll: 1, op: 1, sc: 1, s: 0, t: 0, speed: 0, from: { ...PARKED }, trail: [] }

  useEffect(() => {
    let raf, last = performance.now(), prev = live.current
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const k = (rate) => 1 - Math.exp(-rate * dt)
      const st = live.current, m = sim.current
      if (st !== prev) {
        m.t = 0
        if (st === 'progress') m.s = 0
        if (st === 'complete') m.speed = 90
        // coming back after flying away: re-enter from the left, already moving
        if (st === 'zero' && m.op < 0.05) { m.x = -30; m.y = PARKED.y; m.a = PARKED.a }
        m.from = { x: m.x, y: m.y, a: m.a }
        prev = st
      }
      m.t += dt
      if (st === 'progress') {
        m.s += dt * 1.4
        const at = loopAt(m.s), nx = loopAt(m.s + 0.01)
        const e = ease(Math.min(1, m.t / 1.2)) // take-off blend from wherever the plane was
        m.x = mix(m.from.x, at.x, e)
        m.y = mix(m.from.y, at.y, e)
        m.a = m.from.a + turn(m.from.a, deg(Math.atan2(nx.y - at.y, nx.x - at.x))) * e
        const c = ((m.s % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), d = Math.abs(c - Math.PI)
        m.roll = mix(1, d < 0.7 ? Math.cos(((0.7 - d) / 0.7) * Math.PI) : 1, e) // barrel roll through the middle
        m.op += (1 - m.op) * k(6); m.sc += (1 - m.sc) * k(6)
      } else if (st === 'complete') {
        // steer toward the top-right, speed up, shrink into the distance and fade
        m.a += turn(m.a, -29) * k(3)
        m.speed += dt * 420
        m.x += Math.cos((m.a * Math.PI) / 180) * m.speed * dt
        m.y += Math.sin((m.a * Math.PI) / 180) * m.speed * dt
        m.sc = Math.max(0.3, m.sc - dt * 0.55)
        if (m.t > 0.6) m.op = Math.max(0, m.op - dt * 1.4)
        m.roll += (1 - m.roll) * k(10)
      } else {
        m.x += (PARKED.x - m.x) * k(3); m.y += (PARKED.y - m.y) * k(3); m.a += turn(m.a, PARKED.a) * k(3)
        m.op += (1 - m.op) * k(4); m.sc += (1 - m.sc) * k(4); m.roll += (1 - m.roll) * k(10)
      }
      // dashed trail: drawn behind the plane while it flies, reeled in once it parks
      const tail = m.trail[m.trail.length - 1]
      if (st === 'zero') m.trail.splice(0, 2)
      else if (m.op > 0.05 && (!tail || Math.hypot(m.x - tail[0], m.y - tail[1]) > 3)) {
        m.trail.push([m.x, m.y])
        if (m.trail.length > 40) m.trail.shift()
      }
      redraw((n) => n + 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const m = sim.current
  return (
    <div className={`paper paper-ind st is-${state}`} role="status" aria-busy={state === 'progress'}>
      <div className="paper-frame">
        <svg viewBox="0 0 320 200" aria-hidden>
          <line className="runway" x1="30" y1="170" x2="290" y2="170" />
          {m.trail.length > 1 && <polyline className="plane-trail" points={m.trail.map((q) => q.join(',')).join(' ')} />}
          <text className="doodle bye" x="236" y="40">bye!</text>
          <g opacity={m.op}><Plane x={m.x} y={m.y} angle={m.a} roll={m.roll} scale={m.sc} /></g>
        </svg>
      </div>
      <Caption state={state}>
        {state === 'zero' && 'Ready for takeoff…'}
        {state === 'progress' && 'Loop-de-looping…'}
        {state === 'complete' && 'Flew away!'}
      </Caption>
    </div>
  )
}

/* ---------- Guard: if one indicator ever throws, only that one disappears ---------- */
class Guard extends ReactComponent {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.error('Indicator crashed:', error) }
  render() { return this.state.failed ? null : this.props.children }
}

/* ---------- Card ---------- */
function Card({ Component, determinate }) {
  const { state, setState, value } = useIndicator(determinate, Component.stepped)
  return (
    <div className="card">
      <div className="card-label">{determinate ? 'Determinate' : 'Indeterminate'}</div>
      <div className="stage">
        <Guard><Component state={state} value={value} /></Guard>
      </div>
      <div className="controls">
        {STATES.map((s) => (
          <button key={s} className={state === s ? 'active' : ''} onClick={() => setState(s)}>
            {LABELS[s]}
          </button>
        ))}
        <button className="run" onClick={() => { setState('zero'); setTimeout(() => setState('progress'), 900) }}>
          ▶ Run
        </button>
      </div>
    </div>
  )
}

const SETS = [
  { id: 'slot', tone: 'Slot Machine', desc: 'Every pull of the lever spins the reels to a new percentage, until it hits the 100% jackpot.', det: SlotDeterminate, ind: SlotIndeterminate },
  { id: 'tube', tone: 'Tube Slide', desc: 'Whoosh down a twisting playground tube. The light at the end grows as you get closer.', det: TubeDeterminate, ind: TubeIndeterminate },
  { id: 'playful', tone: 'Bounce Buddy', desc: 'Candy colors, squishy bounces, a little buddy who cheers when it’s done.', det: PlayfulDeterminate, ind: PlayfulIndeterminate },
  { id: 'seek', tone: 'Camera Seek', desc: 'The camera pans, zooms and spins to hunt down its subject, then snaps into focus.', det: SeekDeterminate, ind: SeekIndeterminate },
  { id: 'fortune', tone: 'Fortune Teller', desc: 'A paper cootie catcher flaps open to peek at your progress, then unfolds when it’s done.', det: FortuneDeterminate, ind: FortuneIndeterminate },
  { id: 'plane', tone: 'Paper Plane', desc: 'A paper plane flies a doodled route to the flag, or loops around the sky until it flies away.', det: PlaneDeterminate, ind: PlaneIndeterminate },
]

/* ---------- Wall: every final indicator, looping on its own, repeated to fill the screen ---------- */
// (the Advanced Interface home page shows this as a hover background via Progress-Bar/?wall)
const INDICATORS = SETS.flatMap((s) => [{ set: s, Component: s.det, determinate: true }, { set: s, Component: s.ind, determinate: false }])

function Tile({ Component, determinate, delay }) {
  const { state, setState, value } = useIndicator(determinate, Component.stepped)
  // zero → progress → (finishes on its own) → hold complete → zero → …
  // the first start comes quickly (staggered) so the wall is already moving when it fades in
  const first = useRef(true)
  useEffect(() => {
    const wait = state === 'zero' ? (first.current ? delay % 1100 : 900 + delay) : state === 'complete' ? 2200 : null
    first.current = false
    if (wait == null) return
    const t = setTimeout(() => setState(state === 'zero' ? 'progress' : 'zero'), wait)
    return () => clearTimeout(t)
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="card">
      <div className="stage"><Guard><Component state={state} value={value} /></Guard></div>
    </div>
  )
}

function Wall() {
  // columns stretch to fill the width; each is overfilled and clipped at the bottom edge,
  // so the screen is covered edge to edge with no gaps
  // plays as soon as it loads; inside the home page's backdrop it clears itself when told to pause
  // and starts fresh when told to play again
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
  const [layout] = useState(() => ({
    cols: Math.max(1, Math.round(window.innerWidth / 320)),
    rows: Math.ceil(window.innerHeight / 190) + 1, // shortest tile is ~170px, so this always overflows
  }))
  return (
    <div className="wall" aria-hidden="true">
      {active && Array.from({ length: layout.cols }, (_, c) => (
        <div key={c} className="wall-col">
          {Array.from({ length: layout.rows }, (_, r) => {
            const i = c * 5 + r // shift each column so neighbours differ
            const { set, Component, determinate } = INDICATORS[i % INDICATORS.length]
            return (
              <div key={r} className={`wall-tile set-playful set-${set.id}`}>
                <Tile Component={Component} determinate={determinate} delay={((c * 7 + r) * 677) % 2600} />
              </div>
            )
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
        <h1>Progress Indicators</h1>
        <p>Week 1 · Tone: Playful · determinate + indeterminate · states: zero, progress, complete</p>
      </header>
      {SETS.map((set) => (
        <section key={set.id} className={`set set-playful set-${set.id}`}>
          <div className="set-head">
            <div>
              <h2>{set.tone}</h2>
              <p>{set.desc}</p>
            </div>
            {/* final Figma design for reference: small thumbnail, zooms in on hover / focus */}
            <a className="draft-ref" href={`${import.meta.env.BASE_URL}final/${set.id}.png`} target="_blank" rel="noreferrer">
              <img src={`${import.meta.env.BASE_URL}final/${set.id}.png`} alt={`${set.tone} final design from Figma`} loading="lazy" />
              <span>Final</span>
            </a>
          </div>
          <div className="grid">
            <Card Component={set.det} determinate />
            <Card Component={set.ind} determinate={false} />
          </div>
        </section>
      ))}
    </main>
  )
}
