import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const mod = (a, n) => ((a % n) + n) % n

const ic = (d, w) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
)
const P = {
  undo: ['M9 14L4 9l5-5', 'M4 9h11a5 5 0 0 1 0 10h-3'], redo: ['M15 14l5-5-5-5', 'M20 9H9a5 5 0 0 0 0 10h3'],
  pen: ['M4 20l4-1 11-11-3-3L5 16z', 'M14 7l3 3'], sticker: ['M12 3a9 9 0 1 0 9 9h-5a4 4 0 0 1-4-4z', 'M12 3v5a4 4 0 0 0 4 4h5'],
  text: ['M5 6V4h14v2', 'M12 4v16', 'M9 20h6'], share: ['M12 3v12', 'M7 8l5-5 5 5', 'M5 13v6h14v-6'], check: ['M5 12.500l4.500 4.500L19 7'],
  back: ['M15 5l-7 7 7 7'], list: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  prev: ['M14 6l-6 6 6 6'], next: ['M10 6l6 6-6 6'], mark: ['M6 3h12v18l-6-4-6 4z'], search: ['M10.500 4a6.500 6.500 0 1 0 0 13 6.500 6.500 0 0 0 0-13z', 'M15.500 15.500L21 21'],
}

/* ================= the toolbar system =================
   One bar, three groups: start, center, end. Each group can stand alone (left, center or right aligned) or all three spread.
   Every button is the same structure: [icon] [label], either one optional. The system is shown in several scenarios,
   because a toolbar is defined by where it lives, not by one task. */
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
  arrow: ['M4 10h12', 'M11 5l5 5-5 5'], plus: ['M10 4v12', 'M4 10h12'], grid: ['M4 4h5v5H4z', 'M11 4h5v5h-5z', 'M4 11h5v5H4z', 'M11 11h5v5h-5z'], rows: ['M4 5h12', 'M4 10h12', 'M4 15h12'], chev: ['M6 8l4 4 4-4'], check: ['M4.500 10.500l3.500 3.500L16 6'],
}

// measure where an element sits inside its bar, so one marker (ring or pill) can glide to it
function useMarker(barRef, selector, deps) {
  const [box, setBox] = useState(null)
  const measure = () => {
    const bar = barRef.current
    const el = bar && selector && bar.querySelector(selector)
    if (!el) { setBox(null); return }
    const a = el.getBoundingClientRect(), b = bar.getBoundingClientRect()
    setBox({ x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height })
  }
  useLayoutEffect(measure, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // groups can change width (labels hide, text changes) without the bar changing size, so watch them too
    const ro = new ResizeObserver(measure)
    if (barRef.current) { ro.observe(barRef.current); barRef.current.querySelectorAll(".tb-group, [data-i]").forEach((c) => ro.observe(c)) }
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

/* ----- FUTURISTIC · Couch Mode: the toolbar of a living-room screen. It is read from three meters away and driven by a controller:
   one ring holds the focus, the D-pad walks it along the bar, A presses, B backs out, LB / RB carry the same bar into the next app ----- */
const GLYPHS = { lb: 'LB', rb: 'RB', a: 'A', b: 'B' }
const Glyph = ({ k, on }) => <i className={`glyph ${k.length > 1 ? 'wide' : ''} ${on ? 'on' : ''}`}>{GLYPHS[k] || k}</i>
const COUCH = ['Library', 'Player', 'Capture']
const TILES = [['Driftline', 'inst'], ['Low Orbit', 'fav'], ['Saltmarsh', 'inst'], ['Ember Basin', 'fav'], ['Night Ferry', ''], ['Glass Hours', 'inst'], ['Tidewater', ''], ['Northbound', 'fav'], ['Paper Moon', 'inst'], ['Static', '']]
const TILE_C = ['#1b2a44', '#2a1f45', '#123a3a', '#3a2a1a', '#24304a']

function CouchSet({ auto, offset = 0 }) {
  const stage = useRef(null)
  const barRef = useRef(null)
  const narrow = useNarrow(stage)
  const [si, setSi] = useState(offset % 3)
  const [focus, setFocus] = useState(1)
  const [down, setDown] = useState(null)
  const [held, setHeld] = useState('')
  const [flash, setFlash] = useState(null)
  const [shelf, setShelf] = useState('all')
  const [play, setPlay] = useState({ on: false, t: 0.42, ep: 4, cc: false, mute: false })
  const [cap, setCap] = useState({ n: 3, total: 24, fav: false, edit: false })

  const groups = [
    [[{ id: 'back', i: 'back', opt: true }], [{ id: 'all', t: 'All', excl: true, sel: shelf === 'all' }, { id: 'inst', t: 'Installed', excl: true, sel: shelf === 'inst' }, { id: 'fav', t: 'Favorites', excl: true, sel: shelf === 'fav' }], [{ id: 'filter', i: 'filter', t: 'Filter', lab: true }, { id: 'search', i: 'search', opt: true }]],
    [[{ id: 'eps', i: 'list', t: 'Episodes', lab: true }], [{ id: 'prev', i: 'prev' }, { id: 'play', i: play.on ? 'pause' : 'play' }, { id: 'next', i: 'next' }], [{ id: 'cc', i: 'cc', t: 'Subtitles', lab: true, sel: play.cc }, { id: 'vol', i: play.mute ? 'mute' : 'vol', opt: true }]],
    [[{ id: 'back', i: 'back' }], [{ id: 'edit', i: 'edit', t: cap.edit ? 'Done' : 'Edit', lab: true, sel: cap.edit }, { id: 'share', i: 'share', t: 'Share', lab: true }, { id: 'trash', i: 'trash', t: 'Delete', lab: true }], [{ id: 'fav', i: 'heart', sel: cap.fav }]],
  ][si].map((g) => g.filter((b) => !(narrow && b.opt)))
  const flat = groups.flat()
  const f = Math.min(focus, flat.length - 1)
  const say = (id, label) => { setFlash({ id, label }); setTimeout(() => setFlash((v) => (v?.id === id ? null : v)), 1100) }

  const go = (d) => { setSi((v) => mod(v + d, 3)); setFocus(narrow ? 0 : 1); setDown(null) }
  const press = (b) => {
    if (!b) return
    const id = b.id
    if (si === 0) { if (['all', 'inst', 'fav'].includes(id)) setShelf(id); else if (id === 'back') go(-1); else say(id, id === 'filter' ? 'Sorted' : null) }
    if (si === 1) {
      if (id === 'play') setPlay((p) => ({ ...p, on: !p.on }))
      else if (id === 'prev') setPlay((p) => ({ ...p, ep: Math.max(1, p.ep - 1), t: 0 }))
      else if (id === 'next') setPlay((p) => ({ ...p, ep: p.ep + 1, t: 0 }))
      else if (id === 'cc') setPlay((p) => ({ ...p, cc: !p.cc }))
      else if (id === 'vol') setPlay((p) => ({ ...p, mute: !p.mute }))
      else say(id, null)
    }
    if (si === 2) {
      if (id === 'back') go(-1)
      else if (id === 'edit') setCap((c) => ({ ...c, edit: !c.edit }))
      else if (id === 'share') say(id, 'Shared')
      else if (id === 'trash') setCap((c) => ({ ...c, total: Math.max(1, c.total - 1), n: Math.min(c.n, c.total - 1) }))
      else if (id === 'fav') setCap((c) => ({ ...c, fav: !c.fav }))
    }
  }

  // playing moves the progress line
  useEffect(() => {
    if (!play.on) return
    const t = setInterval(() => setPlay((p) => ({ ...p, t: p.t >= 1 ? 0 : p.t + 0.004 })), 50)
    return () => clearInterval(t)
  }, [play.on])

  /* input: keys while the pointer or focus is on the stage, and a real controller any time */
  const latest = useRef()
  latest.current = { flat, f, press, go }
  const input = (k, isDown) => {
    const L = latest.current
    if (isDown) setHeld(k)
    else { setHeld((v) => (v === k ? '' : v)); if (k === 'a') { setDown(null); L.press(L.flat[L.f]) } return }
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
    const kd = (e) => { const k = map[e.key]; if (!k || !hot() || e.metaKey || e.ctrlKey) return; e.preventDefault(); if (!e.repeat || k === 'left' || k === 'right') inputRef.current(k, true) }
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
  const ring = useMarker(barRef, fid ? `[data-id="${fid}"] .cm-target` : null, [fid, si, narrow, play.on, play.mute, cap.edit, flash])
  const shown = TILES.filter((t) => shelf === 'all' || t[1] === shelf)
  const sel = useMarker(barRef, si === 0 ? `[data-id="${shelf}"] .cm-target` : null, [shelf, si, narrow])
  const tabsRef = useRef(null)
  const tabLine = useMarker(tabsRef, `[data-i="${si}"]`, [si, narrow])

  return (
    <div className="cm" ref={stage} tabIndex={auto ? -1 : 0} aria-label="Couch Mode toolbar, three scenarios">
      <div className="cm-tabs" ref={tabsRef} role="tablist" aria-label="Scenario">
        {tabLine && <i className="cm-tab-line" aria-hidden="true" style={{ transform: `translateX(${tabLine.x}px)`, width: tabLine.w }} />}
        <button type="button" tabIndex={-1} className="cm-shoulder" onClick={() => go(-1)} aria-label="Previous scenario"><Glyph k="lb" on={held === 'lb'} /></button>
        {COUCH.map((n, i) => <button key={n} type="button" tabIndex={-1} role="tab" data-i={i} aria-selected={i === si} className={i === si ? 'on' : ''} onClick={() => { setSi(i); setFocus(1) }}>{n}</button>)}
        <button type="button" tabIndex={-1} className="cm-shoulder" onClick={() => go(1)} aria-label="Next scenario"><Glyph k="rb" on={held === 'rb'} /></button>
      </div>

      <div className="cm-view" key={si}>
        {si === 0 && <div className="cm-tiles">{shown.map(([n], i) => <div key={n} className="cm-tile" style={{ background: TILE_C[TILES.findIndex((t) => t[0] === n) % 5], '--i': i }}><span>{n}</span></div>)}</div>}
        {si === 1 && (
          <div className="cm-poster">
            <span className="cm-ep">Episode {play.ep}</span>
            {play.cc && <span className="cm-cc">“The tide comes in whether you watch it or not.”</span>}
            <div className="cm-progress"><i style={{ width: `${play.t * 100}%` }} /></div>
          </div>
        )}
        {si === 2 && (
          <div className={`cm-photo ${cap.edit ? 'is-edit' : ''}`}>
            <i className="cm-crop" />
            {cap.fav && <span className="cm-heart">{li(IC.heart, 1.4)}</span>}
            <span className="cm-count">{cap.n} / {cap.total}</span>
          </div>
        )}
      </div>

      <div className="tb cm-bar" ref={barRef} role="toolbar" aria-label={`${COUCH[si]} toolbar`}>
        {sel && <i key={`sel${si}`} className="cm-sel" aria-hidden="true" style={{ transform: `translate(${sel.x}px, ${sel.y}px)`, width: sel.w, height: sel.h }} />}
        {ring && <i className={`cm-ring ${down === fid ? 'is-press' : ''}`} aria-hidden="true" style={{ transform: `translate(${ring.x}px, ${ring.y}px)`, width: ring.w, height: ring.h }} />}
        <div className="cm-groups" key={si}>
          {groups.map((g, gi) => (
            <div key={gi} className={`tb-group g${gi}`}>
              {g.map((b) => {
                const idx = flat.indexOf(b)
                const label = flash?.id === b.id && flash.label ? flash.label : b.t
                return (
                  <button key={b.id} type="button" tabIndex={-1} data-id={b.id} aria-label={b.t ? undefined : b.id} aria-pressed={b.sel != null ? !!b.sel : undefined}
                    className={`tb-btn cm-btn ${b.i ? '' : 'cm-text'} ${idx === f ? 'is-focus' : ''} ${b.sel ? 'is-sel' : ''} ${b.excl ? 'is-excl' : ''} ${down === b.id ? 'is-press' : ''}`}
                    onPointerEnter={() => !auto && setFocus(idx)} onPointerDown={() => !auto && setDown(b.id)} onPointerUp={() => setDown(null)} onPointerLeave={() => setDown(null)}
                    onClick={() => { if (!auto) { setFocus(idx); press(b) } }}>
                    {b.i ? <span className="cm-frame cm-target">{li(IC[b.i])}</span> : <span className="cm-target cm-textframe">{label}</span>}
                    {b.i && b.t && <span className={`tb-label ${b.lab ? 'opt' : ''}`}>{label}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="cm-legend" aria-hidden="true">
        <span><Glyph k="a" on={held === 'a'} />Select</span>
        <span><Glyph k="b" on={held === 'b'} />Back</span>
        <span className="cm-dpad"><Glyph k="◀" on={held === 'left'} /><Glyph k="▶" on={held === 'right'} />Move</span>
      </div>
    </div>
  )
}

/* ----- ELEGANT · Clear: one bar of frosted glass for an editor, a checkout and a gallery, floating over a softly blurred photo.
   Bold white glyphs; the chosen item sinks into a dark recess that slides between choices; the main action is a light solid pill ----- */
const GRID_FILLED = (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 4.500A1.500 1.500 0 0 1 4.500 3h3A1.500 1.500 0 0 1 9 4.500v3A1.500 1.500 0 0 1 7.500 9h-3A1.500 1.500 0 0 1 3 7.500zM11 4.500A1.500 1.500 0 0 1 12.500 3h3A1.500 1.500 0 0 1 17 4.500v3A1.500 1.500 0 0 1 15.500 9h-3A1.500 1.500 0 0 1 11 7.500zM3 12.500A1.500 1.500 0 0 1 4.500 11h3A1.500 1.500 0 0 1 9 12.500v3A1.500 1.500 0 0 1 7.500 17h-3A1.500 1.500 0 0 1 3 15.500zM11 12.500a1.500 1.500 0 0 1 1.500-1.500h3a1.500 1.500 0 0 1 1.500 1.500v3a1.500 1.500 0 0 1-1.500 1.500h-3a1.500 1.500 0 0 1-1.500-1.500z" /></svg>
)
const CLEAR = ['Write', 'Checkout', 'Gallery']
const STYLES = ['Body', 'Heading', 'Quote']
const STEPS = ['Bag', 'Shipping', 'Payment']

function ClearSet({ auto, offset = 0 }) {
  const stage = useRef(null)
  const barRef = useRef(null)
  const tabsRef = useRef(null)
  const narrow = useNarrow(stage)
  const [si, setSi] = useState(offset % 3)
  const [w, setW] = useState({ style: 0, b: true, i: false, link: false, pub: false })
  const [step, setStep] = useState(1)
  const [g, setG] = useState({ rows: false, few: false, sel: false, extra: 0 })
  const [hot, setHot] = useState(null)

  const groups = [
    [[{ id: 'undo', i: 'undo' }, { id: 'redo', i: 'redo', opt: true }], [{ id: 'style', t: STYLES[w.style], dd: true }, { id: 'b', i: 'bold', sel: w.b }, { id: 'i', i: 'italic', sel: w.i }, { id: 'link', i: 'link', sel: w.link }], [{ id: 'share', t: 'Share', opt: true }, { id: 'pub', t: w.pub ? 'Published' : 'Publish', i: w.pub ? 'check' : null, prim: true }]],
    [[{ id: 'back', i: 'back', t: 'Bag', lab: true }], STEPS.map((s, i) => ({ id: 's' + i, t: s, excl: true, sel: step === i, dim: step !== i, opt: step !== i })), [{ id: 'go', t: step === 2 ? 'Pay $148' : 'Continue', i: 'arrow', prim: true }]],
    [[{ id: 'select', t: g.sel ? 'Cancel' : 'Select' }], [{ id: 'grid', i: 'grid', excl: true, sel: !g.rows }, { id: 'rows', i: 'rows', excl: true, sel: g.rows }], [{ id: 'filter', i: 'filter', t: g.few ? 'Liked' : 'Filter', lab: true, sel: g.few }, { id: 'add', i: 'plus', prim: true }]],
  ][si].map((grp) => grp.filter((b) => !(narrow && b.opt)))

  const press = (id) => {
    if (si === 0) {
      if (id === 'style') setW((v) => ({ ...v, style: (v.style + 1) % 3 }))
      else if (['b', 'i', 'link'].includes(id)) setW((v) => ({ ...v, [id]: !v[id] }))
      else if (id === 'pub') { setW((v) => ({ ...v, pub: true })); setTimeout(() => setW((v) => ({ ...v, pub: false })), 1600) }
      else if (id === 'undo') setW({ style: 0, b: false, i: false, link: false, pub: false })
    }
    if (si === 1) {
      if (id === 'go') setStep((s) => (s < 2 ? s + 1 : 0))
      else if (id === 'back') setStep((s) => Math.max(0, s - 1))
      else if (id[0] === 's') setStep(+id.slice(1))
    }
    if (si === 2) {
      if (id === 'grid') setG((v) => ({ ...v, rows: false }))
      else if (id === 'rows') setG((v) => ({ ...v, rows: true }))
      else if (id === 'filter') setG((v) => ({ ...v, few: !v.few }))
      else if (id === 'select') setG((v) => ({ ...v, sel: !v.sel }))
      else if (id === 'add') setG((v) => ({ ...v, extra: (v.extra + 1) % 4 }))
    }
  }

  useEffect(() => {
    if (!auto) return
    let k = 0
    const t = setInterval(() => {
      k++
      if (k % 5 === 0) { setSi((v) => (v + 1) % 3); setHot(null); return }
      const ids = [...(barRef.current?.querySelectorAll('.tb-btn') || [])].map((b) => b.dataset.id)
      const id = ids[k % ids.length]
      setHot(id)
      if (k % 2) press(id)
    }, 900)
    return () => clearInterval(t)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const selId = groups.flat().find((b) => b.excl && b.sel)?.id
  const pill = useMarker(barRef, selId ? `[data-id="${selId}"]` : null, [selId, si, narrow])
  const tab = useMarker(tabsRef, `[data-i="${si}"]`, [si, narrow])
  const n = g.few ? 5 : 12 + g.extra

  return (
    <div className="cl" ref={stage}>
      <div className="cl-tabs" ref={tabsRef} role="tablist" aria-label="Scenario">
        {tab && <i className="cl-tab-line" style={{ transform: `translateX(${tab.x}px)`, width: tab.w }} />}
        {CLEAR.map((s, i) => <button key={s} type="button" role="tab" data-i={i} aria-selected={i === si} className={i === si ? 'on' : ''} onClick={() => setSi(i)}>{s}</button>)}
      </div>
      <div className="cl-field">
        <div className="tb cl-bar" ref={barRef} role="toolbar" aria-label={`${CLEAR[si]} toolbar`}>
          {pill && <i key={`pill${si}`} className="cl-pill" aria-hidden="true" style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h }} />}
          {groups.map((grp, gi) => (
            <div key={gi} className={`tb-group g${gi}`}>
              {grp.map((b) => (
                <button key={b.id} type="button" data-id={b.id} aria-label={b.t ? undefined : b.id} aria-pressed={b.sel != null && !b.excl ? !!b.sel : undefined} aria-current={b.excl && b.sel ? 'true' : undefined}
                  className={`tb-btn cl-btn ${b.t ? 'has-label' : ''} ${b.prim ? 'is-prim' : ''} ${b.sel && !b.excl ? 'is-sel' : ''} ${b.excl && b.sel ? 'is-excl' : ''} ${b.dim ? 'is-dim' : ''} ${hot === b.id ? 'is-hot' : ''}`}
                  onClick={() => press(b.id)}>
                  {b.i && <span className="tb-ic">{b.i === 'grid' ? GRID_FILLED : li(IC[b.i], 2)}</span>}
                  {b.t && <span className={`tb-label ${b.lab ? 'opt' : ''}`}>{b.t}</span>}
                  {b.dd && <span className="cl-dd">{li(IC.chev, 2)}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="cl-view" key={si}>
          {si === 0 && (
            <p className={`cl-doc s-${w.style}`}>
              The light comes in low across the table, and for a moment <span className={`${w.b ? 'b' : ''} ${w.i ? 'i' : ''} ${w.link ? 'a' : ''}`}>everything is still</span>. Then the kettle, the door, the day.
            </p>
          )}
          {si === 1 && (
            <div className="cl-order">
              <div className="cl-item"><i /><div><b>Linen Overshirt</b><span>Size M · Sand</span></div><b>$148</b></div>
              <p className="cl-step" key={step}>{['Your bag has one piece.', 'Ships to Pasadena, CA · arrives Thursday.', 'Card ending 4242 · billed on shipping.'][step]}</p>
            </div>
          )}
          {si === 2 && (
            <div className={`cl-photos ${g.rows ? 'rows' : ''} ${g.sel ? 'sel' : ''}`}>
              {Array.from({ length: n }, (_, i) => <div key={i} className="cl-ph" style={{ '--t': ['#ecebe7', '#e4e3de', '#efeeea'][i % 3] }}><i /><span>IMG_{2040 + i}</span></div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ================= page ================= */
const SETS = [
  { id: 'couch', tone: 'Futuristic, Couch Mode', Body: CouchSet },
  { id: 'clear', tone: 'Elegant, Clear', Body: ClearSet },
]

/* Figma drawing + spec thumbnail: the enlarged copy is drawn above the page, so no section clips it */
function DraftThumb({ set }) {
  const ref = useRef(null)
  const [box, setBox] = useState(null)
  const [open, setOpen] = useState(false)
  const src = `${import.meta.env.BASE_URL}final/${set.id}.png`
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
  const [layout] = useState(() => ({ cols: Math.max(1, Math.round(window.innerWidth / 820)), rows: Math.ceil(window.innerHeight / 480) + 1 }))
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

export default function App() {
  if (new URLSearchParams(window.location.search).has('wall')) return <Wall />
  return (
    <main>
      <header className="page-head">
        <a className="back" href="../">← Advanced Interface</a>
        <h1>Toolbars</h1>
        <p>Week 7 · Advanced Interface</p>
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
