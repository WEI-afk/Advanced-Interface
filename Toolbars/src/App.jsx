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

/* ----- ELEGANT · Clear: one bar of smoky frosted glass. Bold white glyphs; the chosen item sinks into a light recess that slides
   between choices; the main action is a light solid pill ----- */
const CLEAR = ['Write', 'Checkout', 'Gallery']
const STYLES = ['Body', 'Heading', 'Quote']
const STEPS = ['Bag', 'Shipping', 'Payment']
const PLAIN = { style: 0, b: false, i: false, link: false }

function ClearSet({ auto, offset = 0 }) {
  const stage = useRef(null)
  const barRef = useRef(null)
  const narrow = useNarrow(stage)
  const [si, setSi] = useState(offset % 3)
  const [al, setAl] = useState(0)
  const [note, say] = useNote()
  const [hist, setHist] = useState({ list: [{ ...PLAIN, b: true }], at: 0 })
  const [pub, setPub] = useState(false)
  const [step, setStep] = useState(1)
  const [g, setG] = useState({ rows: false, few: false, sel: false, n: 12 })
  const [hot, setHot] = useState(null)
  const slide = useGroupSlide(barRef, al)
  const w = hist.list[hist.at]
  const commit = (next) => setHist((h) => ({ list: [...h.list.slice(0, h.at + 1), next], at: h.at + 1 }))

  const groups = [
    [[{ id: 'undo', i: 'undo' }, { id: 'redo', i: 'redo', opt: true }],
      [{ id: 'style', t: STYLES[w.style], dd: true }, { id: 'b', i: 'bold', sel: w.b }, { id: 'i', i: 'italic', sel: w.i }, { id: 'link', i: 'link', sel: w.link }],
      [{ id: 'share', t: 'Share', opt: true }, { id: 'pub', t: pub ? 'Published' : 'Publish', prim: true }]],
    [[{ id: 'back', i: 'back', t: 'Back', lab: true }],
      STEPS.map((s, i) => ({ id: 's' + i, t: s, excl: true, sel: step === i, dim: step !== i, opt: step !== i })),
      [{ id: 'go', t: step === 2 ? 'Pay $148' : 'Continue', i: 'arrow', prim: true }]],
    [[{ id: 'select', t: g.sel ? 'Cancel' : 'Select' }],
      [{ id: 'grid', i: 'grid', excl: true, sel: !g.rows }, { id: 'rows', i: 'rows', excl: true, sel: g.rows }],
      [{ id: 'filter', i: 'filter', t: g.few ? 'Liked' : 'Filter', lab: true, sel: g.few }, { id: 'add', i: 'plus', prim: true }]],
  ][si].map((grp) => grp.filter((b) => !(narrow && b.opt)))

  const press = (id) => {
    if (si === 0) {
      if (id === 'style') commit({ ...w, style: (w.style + 1) % 3 })
      else if (['b', 'i', 'link'].includes(id)) commit({ ...w, [id]: !w[id] })
      else if (id === 'undo') setHist((h) => ({ ...h, at: Math.max(0, h.at - 1) }))
      else if (id === 'redo') setHist((h) => ({ ...h, at: Math.min(h.list.length - 1, h.at + 1) }))
      else if (id === 'share') say('Link copied')
      else if (id === 'pub') { setPub(true); setTimeout(() => setPub(false), 1400) }
    }
    if (si === 1) {
      if (id === 'go') { if (step === 2) { say('Paid $148 · order placed'); setStep(0) } else setStep(step + 1) }
      else if (id === 'back') setStep((s) => Math.max(0, s - 1))
      else if (id[0] === 's') setStep(+id.slice(1))
    }
    if (si === 2) {
      if (id === 'grid') setG((v) => ({ ...v, rows: false }))
      else if (id === 'rows') setG((v) => ({ ...v, rows: true }))
      else if (id === 'filter') setG((v) => ({ ...v, few: !v.few }))
      else if (id === 'select') setG((v) => ({ ...v, sel: !v.sel }))
      else if (id === 'add') setG((v) => ({ ...v, n: v.n + 1 }))
    }
  }

  /* wall: it runs itself */
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
  const pill = useMarker(barRef, selId ? `[data-id="${selId}"]` : null, [selId, si, al, narrow])
  const marks = [w.b && 'bold', w.i && 'italic', w.link && 'link'].filter(Boolean)
  const status = note || [
    `${STYLES[w.style]} · ${marks.length ? marks.join(', ') : 'plain'} · step ${hist.at + 1} of ${hist.list.length}${pub ? ' · published' : ''}`,
    `Step ${step + 1} of 3 · ${STEPS[step]}`,
    `${g.few ? 5 : g.n} photos · ${g.rows ? 'list' : 'grid'}${g.few ? ' · liked only' : ''}${g.sel ? ' · selecting' : ''}`,
  ][si]

  return (
    <div className="ex">
      {!auto && (
        <div className="ex-controls">
          <Switch label="Example" items={CLEAR} value={si} onChange={setSi} />
          <Switch label="Alignment" items={ALIGN} value={al} onChange={(i) => { slide(); setAl(i) }} />
        </div>
      )}
      <div className="ex-stage" ref={stage}>
        <div className={`tb cl-bar al-${al}`} ref={barRef} role="toolbar" aria-label={`${CLEAR[si]} toolbar`}>
          {pill && <i key={`pill${si}`} className="cl-pill" aria-hidden="true" style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h }} />}
          {groups.map((grp, gi) => (
            <div key={`${si}-${gi}`} className="tb-group">
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
        {!auto && <p className="tb-status" aria-live="polite">{status}</p>}
      </div>
    </div>
  )
}

/* ================= page ================= */
const SETS = [
  { id: 'couch', tone: 'Futuristic, Couch Mode', Body: CouchSet, figma: 'https://www.figma.com/design/1T1LVdRyfNJDmR3xVa8pDS?node-id=14-2' },
  { id: 'clear', tone: 'Elegant, Clear', Body: ClearSet, figma: 'https://www.figma.com/design/1T1LVdRyfNJDmR3xVa8pDS?node-id=14-285' },
]

const SPEC = [
  ['Toolbar size', '800 × 64, narrows with its container', '720 × 64, narrows with its container'],
  ['Toolbar padding', '0 × 10', '0 × 8'],
  ['Group spacing', '16', '12'],
  ['Button spacing', '4', '4'],
  ['Button size', '64 high hit area · icon frame 40 × 40 · text frame 40 high', '48 high · icon only 48 × 48'],
  ['Button padding', '0 × 6 · text frame 0 × 14', '0 × 18 with a label · 0 icon only'],
  ['Icon to label', '12, label sits outside the frame', '8'],
  ['Icon', '20 × 20 · stroke 1', '22 × 22 · stroke 2 · grid filled'],
  ['Font', 'Inter Medium', 'Geist Medium, −0.5% tracking'],
  ['Font size / line height', '15 / 20', '15 / 20'],
  ['Corner radius', 'toolbar 16 · frame 8 · rings 8', 'toolbar 32 · buttons 24 · recess 24'],
  ['Stroke width', 'toolbar 1 · frame 1 · focus ring 2 · selection 1.5', 'toolbar 1 · top highlight 1'],
  ['Color', 'toolbar #0F141B · stroke #1D232B · frame #2A313A · label #98A2AD · focus #1A9FFF', 'glass #8E939A to #74787E at 72% · blur 24 · white glyphs · primary white 88% on #3A3A3A'],
  ['Enabled', 'label #98A2AD, frame stroke #2A313A', 'white glyph on glass'],
  ['Hover', 'the focus ring glides here; label turns white', 'white 16% fill'],
  ['Pressed', 'frame .94, fills accent 35%; the ring snaps here', 'recess #282C32 16% + inner shadow 0 1 3, scale .97'],
  ['Selected', 'one indicator, white 8% fill + 1.5 edge, moves between choices', 'one recess moves between choices; toggles hold their own recess'],
  ['Motion', 'feedback 120 ms ease-out · ring and indicator 220 ms cubic-bezier(0.2, 0, 0, 1) · groups 240 ms', 'feedback 120 ms ease-out · recess 220 ms cubic-bezier(0.2, 0, 0, 1) · groups 240 ms'],
  ['Input', 'arrows or D-pad move · Enter or A press · Esc or B back · Q / E or LB / RB switch example', 'pointer, Tab and Enter'],
  ['Phone', 'frame 36 · text 14 · secondary buttons and labels hide', 'toolbar 58 high · buttons 44 · secondary buttons and labels hide'],
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

export default function App() {
  if (new URLSearchParams(window.location.search).has('wall')) return <Wall />
  return (
    <main>
      <h1>Toolbars</h1>
      <section aria-label="Examples">
        {SETS.map((set) => (
          <article key={set.id} className={`set s-${set.id}`}>
            <h2>{set.tone}</h2>
            <set.Body />
          </article>
        ))}
      </section>
      <section className="spec" aria-labelledby="spec-h">
        <h2 id="spec-h">Specifications</h2>
        <div className="spec-scroll">
          <table>
            <thead><tr><th scope="col" />{SETS.map((s) => <th key={s.id} scope="col">{s.tone}</th>)}</tr></thead>
            <tbody>{SPEC.map(([k, a, b]) => <tr key={k}><th scope="row">{k}</th><td>{a}</td><td>{b}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="spec-note">All values in px. Figma drawings: {SETS.map((s, i) => <span key={s.id}>{i ? ' · ' : ''}<a href={s.figma} target="_blank" rel="noreferrer">{s.tone}</a></span>)}</p>
      </section>
    </main>
  )
}
