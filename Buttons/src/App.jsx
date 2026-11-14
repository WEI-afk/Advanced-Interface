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
  close: ['M5.500 5.500l9 9', 'M14.500 5.500l-9 9'],
  send: ['M3 10l14-6.500-4.500 14L10 11z', 'M10 11l7-7.500'],
  mark: ['M5.500 3h9v14l-4.500-3.500L5.500 17z'], quote: ['M4 11h4v5H4z', 'M4 11c0-3 1.500-5 4-6', 'M12 11h4v5h-4z', 'M12 11c0-3 1.500-5 4-6'], arrow: ['M4 10h12', 'M11 5l5 5-5 5'], cal: ['M3.500 5h13v11.500h-13z', 'M3.500 8.500h13', 'M7 3v3.500', 'M13 3v3.500'],
  plan: ['M3.500 3.500h13v13h-13z', 'M3.500 10h7', 'M10.500 3.500v9', 'M13.500 10v6.500'], section: ['M3 16.500h14', 'M5 16.500V9l5-5.500 5 5.500v7.500', 'M8 16.500v-4h4v4'],
  elev: ['M3 16.500h14', 'M4.500 16.500V6h11v10.500', 'M7.500 9h2', 'M10.500 9h2', 'M7.500 12.500h2', 'M10.500 12.500h2'],
  archive: ['M3 4h14v4H3z', 'M4.500 8v8h11V8', 'M8 11h4'], bell: ['M5.500 13.500V9a4.500 4.500 0 0 1 9 0v4.500l1.500 2h-12z', 'M8.500 17.500a1.500 1.500 0 0 0 3 0'],
  prev: ['M14 5v10l-7-5z', 'M5 5v10'], next: ['M6 5v10l7-5z', 'M15 5v10'], chev: ['M6 8l4 4 4-4'],
  walk: ['M10.500 4.500a1.500 1.500 0 1 0 0-3 1.500 1.500 0 0 0 0 3z', 'M8 18l2-5.500 2.500 2.500V18', 'M6 10.500l3-4 3 1.500 1.500 3', 'M9 6.500l1.500 6'],
  bike: ['M5 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M15 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M5 12l3.500-6h4', 'M15 12l-3-6', 'M8.500 6l3 6H5'],
  car: ['M3.500 13.500V10l2-4.500h9l2 4.500v3.500z', 'M3.500 10h13', 'M6 13.500v2', 'M14 13.500v2'],
  doc: ['M5 3h7l3 3v11H5z', 'M12 3v3h3', 'M7.500 10h5', 'M7.500 13h5'], clock: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M10 6v4l2.500 2'],
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

/* ================= MONUMENTAL · The Index =================
   Buttons for an archive of structures, cut like carved lettering: square, heavy, ruled. A slab wipes in from the left on
   hover, the way the Index rows fill; holding a press only presses it in. */
const DRAW = [{ label: 'Plan', icon: IC.plan }, { label: 'Section', icon: IC.section }, { label: 'Elevation', icon: IC.elev }]

// one record of the archive: view its plans, keep it, cite it
function IndexSet({ auto }) {
  const [ci, setCi] = useState(0)
  const content = CMODE[ci]
  const [note, say] = useNote()
  const [saved, setSaved] = useState(false)

  /* wall: it runs itself */
  useEffect(() => {
    if (!auto) return
    let k = 0
    const t = setInterval(() => { if (k++ % 2) setSaved((v) => !v); else setCi((v) => (v + 1) % 3) }, 1300)
    return () => clearInterval(t)
  }, [auto])

  const b = ({ key, ...props }) => <Btn key={key} sys="ix" content={content} {...props} />
  return (
    <div className="ex">
      <div className="ex-stage">
        <div className="bt-row ix-row">
          {b({ key: 'view', kind: 'pri', icon: IC.arrow, label: 'View plans', onClick: () => say('Plans of the Pantheon opened') })}
          {b({ key: 'save', kind: 'sec', icon: saved ? IC.check : IC.mark, label: saved ? 'Saved' : 'Save', faces: [[IC.mark, 'Save'], [IC.check, 'Saved']], onClick: () => setSaved((v) => !v) })}
          {b({ key: 'cite', kind: 'ter', icon: IC.quote, label: 'Cite', onClick: () => say('Citation copied') })}
        </div>
        {!auto && <p className="tb-status" aria-live="polite">{note || `Pantheon · 126 AD${saved ? ' · saved to your index' : ''}`}</p>}
      </div>
      {!auto && (
        <div className="ex-controls">
          <SlideSwitch sys="ix" label="Content" items={CONTENT} value={ci} onChange={setCi} />
        </div>
      )}
    </div>
  )
}

/* ================= the Heads Up button (Matter-of-fact) =================
   After the trycoffee download button (Are.na 25471305): a button that tells you what will happen before you press it, and what
   happened after. Its content rides on a strip seen through the button: at rest [icon][label]; hover or focus slides the strip so the
   label stays and the next piece of information comes in ([label][what happens]); after the press the strip lifts away and the result
   rises in. The button is as wide as its widest frame, so it never changes size. */
function HuBtn({ kind = 'filled', seg, icon, label, labelSize, next, result = [], done = null, content = 'both', mono, size, shape, fill, fluid, onMeasured, className = '', style, ...rest }) {
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
    const next = { W, o0: (W - w0) / 2 - f0[0].l, o1: (W - w1) / 2 - f1[0].l }
    setGeo((g) => (g && ['W', 'o0', 'o1'].every((k) => Math.abs(g[k] - next[k]) < .5) ? g : next))
  }
  const measureNow = useRef(); measureNow.current = measure
  useLayoutEffect(measure, [label, labelSize, icon, next?.text, next?.size, next?.icon, content, size, className, result.map((r) => r.text).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  // whatever changes the content's size (a size switch, a font arriving) re-measures, so the frames stay centred with even space
  useEffect(() => {
    document.fonts?.ready.then(() => measureNow.current())
    const ro = new ResizeObserver(() => measureNow.current())
    if (strip.current) ro.observe(strip.current)
    if (res.current) [...res.current.children].forEach((el) => ro.observe(el))
    if (btn.current) ro.observe(btn.current, { box: 'border-box' })
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
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

const EB_EX = ['Split', 'Toggle', 'Groups']
const SEND_MENU = [{ icon: IC.clock, label: 'Send later', info: 'tomorrow 9:00' }, { icon: IC.doc, label: 'Send as PDF', info: '1 page' }, { icon: IC.cal, label: 'Schedule', info: 'pick a time' }]
const ROUTE = [{ label: 'Walk', icon: IC.walk, info: '25 min' }, { label: 'Bike', icon: IC.bike, info: '9 min' }, { label: 'Drive', icon: IC.car, info: '6 min' }]

function EveryButtonSet({ auto, offset = 0 }) {
  const [ex, setEx] = useState(offset % 3)
  const [si, setSi] = useState(1)
  const [round, setRound] = useState(0)
  const size = SIZES[si], shape = round ? 'round' : 'square'
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
      else setEx((v) => (v + 1) % 3)
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
  ]
  const status = note || [
    sent != null ? `${SENT[sent]} · to Tanya${sent === 1 ? ', tomorrow 9:00' : ''}` : archived != null ? 'Archived · find it under All mail' : 'Draft to Tanya · 2 attachments',
    `${follow ? 'Following' : 'Not following'} · alerts ${notify ? 'on' : 'off'} · ${saved ? 'saved' : 'not saved'}`,
    `Track ${track} of 12 · ${playing ? 'playing' : 'paused'} · ${ROUTE[route].label.toLowerCase()}, ${ROUTE[route].info}`,
  ][ex]
  return (
    <div className="ex">
      <div className="ex-stage">
        <div className="bt-row eb-row">{views[ex]}</div>
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

const IX = (p) => <Btn sys="ix" {...p} />
const IX_TRIO = [{ kind: 'pri', icon: IC.arrow, label: 'View plans' }, { kind: 'sec', icon: IC.mark, label: 'Save' }, { kind: 'ter', icon: IC.quote, label: 'Cite' }]
const IX_STATE = [{ kind: 'pri', icon: IC.arrow, label: 'View' }, IX_TRIO[1], IX_TRIO[2]]
const EB_SEND = { icon: IC.send, label: 'Send', next: { text: 'to Tanya' }, result: [{ icon: IC.check, text: 'Sent' }] }
const ebColor = (kind, label) => <HuBtn kind={kind} size="s" icon={IC.send} label={label} next={{ text: 'to Tanya' }} />
const trio = (Make, list, content) => <Row>{list.map((p) => <Make key={p.kind} {...p} content={content} />)}</Row>
const stateCells = (Make, p, hover) => [
  <Make {...p} />, <Make {...p} className={hover} />, <Make {...p} className={`${hover} st-press`} />, <Make {...p} disabled />,
]

const SETS = [
  {
    id: 'every', tone: 'Matter-of-fact, Every Button',
    about: 'Material 3\'s button catalogue in one matter-of-fact language, after the trycoffee download button: every button says what will happen before the press, and what happened after. Split buttons, toggles, icon buttons, standard and connected groups.',
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
    ],
    states: <StateGrid cols={['Button', 'Toggle, on', 'Icon button', 'Split button']} rows={[
      ['Enabled', [<HuBtn kind="filled" size="xs" {...EB_SEND} />, <HuBtn kind="filled" size="xs" className="is-toggle is-on" icon={IC.check} label="Following" next={{ text: 'Unfollow' }} />, <HuIcon kind="tonal" size="xs" icon={IC.mark} label="Save" />, <HuSplit size="xs" lead={EB_SEND} menu={SEND_MENU} open={false} />]],
      ['Hover', [<HuBtn kind="filled" size="xs" {...EB_SEND} className="st-hover" />, <HuBtn kind="filled" size="xs" className="is-toggle is-on st-hover" icon={IC.check} label="Following" next={{ text: 'Unfollow' }} />, <HuIcon kind="tonal" size="xs" icon={IC.mark} label="Save" className="st-hover" />, <HuSplit size="xs" lead={{ ...EB_SEND, className: 'st-hover' }} menu={SEND_MENU} open={false} />]],
      ['Pressed', [<HuBtn kind="filled" size="xs" {...EB_SEND} className="st-hover st-press" />, <HuBtn kind="filled" size="xs" className="is-toggle is-on st-hover st-press" icon={IC.check} label="Following" next={{ text: 'Unfollow' }} />, <HuIcon kind="tonal" size="xs" icon={IC.mark} label="Save" className="st-hover st-press" />, <HuSplit size="xs" lead={{ ...EB_SEND, className: 'st-hover st-press' }} menu={SEND_MENU} open={false} />]],
      ['After press', [<HuBtn kind="filled" size="xs" {...EB_SEND} done={0} />, <HuBtn kind="filled" size="xs" className="is-toggle" icon={IC.plus} label="Follow" next={{ text: 'weekly digest' }} />, <HuIcon kind="tonal" size="xs" icon={IC.mark} label="Save" on fill />, <HuSplit size="xs" lead={{ ...EB_SEND, done: 0 }} menu={SEND_MENU} open={false} />]],
      ['Disabled', [<HuBtn kind="filled" size="xs" {...EB_SEND} disabled />, <HuBtn kind="filled" size="xs" className="is-toggle is-on" icon={IC.check} label="Following" next={{ text: 'Unfollow' }} disabled />, <HuIcon kind="tonal" size="xs" icon={IC.mark} label="Save" disabled />, <HuSplit size="xs" lead={{ ...EB_SEND, disabled: true }} menu={SEND_MENU} open={false} className="is-off" />]],
    ]} />,
    spec: [
      ['Choosing', [['High emphasis', 'filled, split, standard group · one per screen'], ['Medium', 'tonal, elevated (busy backgrounds only), outlined'], ['Low', 'connected group, text, icon button']]],
      ['Sizes', [['XS', '32 high · padding 12 · icon 20 · 14 / 20'], ['S', '40 · padding 16 · icon 20 · 14 / 20'], ['M', '56 · padding 24 · icon 24 · 16 / 24'], ['L', '96 · padding 48 · icon 32 · 24 / 32'], ['XL', '136 · padding 64 · icon 40 · 32 / 40'], ['Target', 'XS and S still answer to 48 × 48']]],
      ['Shape', [['Round', 'fully rounded'], ['Square', 'radius 12 · 12 · 16 · 28 · 28'], ['Pressed', 'squarer: 8 · 8 · 12 · 16 · 16'], ['Toggle on', 'square turns round, round turns square']]],
      ['Heads Up', [['Rest', '[icon] [label]'], ['Hover, focus', 'the label stays, the next fact slides in'], ['After press', 'the result rises in, then back'], ['Width', 'the widest frame, so neighbours never move']]],
      ['Toggle', [['Off', 'tonal colours, outline icon'], ['On', 'filled colours, filled icon, shape flips'], ['Hover when on', 'says what pressing again does: Unfollow']]],
      ['Icon button', [['Widths', 'narrow 0.8 · default 1 · wide 1.3 × height'], ['Styles', 'standard, filled, tonal, outlined'], ['Tooltip', '8 above · #262625 · Inter 13 / 18 · says the consequence']]],
      ['Split button', [['Space', '2 between action and menu button'], ['Inner corners', '4 for XS–M · 8 L · 12 XL'], ['Open', 'chevron turns 180° · menu button turns round'], ['Menu', '4 below, aligned to the menu button · items show their consequence']]],
      ['Groups', [['Standard', 'pressed button +15% width, neighbours share the loss, group width holds'], ['Connected', '2 apart · inner corners 8 · the choice fills, rounds and shows its fact']]],
      ['Motion', [['Slide, lift', '280 / 260 ms cubic-bezier(0.2, 0, 0, 1)'], ['Shape, width', '200 ms, same curve'], ['Press', '120 ms ease-out'], ['Chevron', '200 ms rotation']]],
      ['Phone', [['Large sizes', 'L steps down to 72, XL to 88, so a whole button fits the width']]],
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
      ['Color', [['Bone', '#E6E1D7'], ['Ink', '#1A1815'], ['Dim', '#827B6F, disabled and unchosen']]],
      ['States', [['Hover', 'a slab wipes in from the left: ink over the primary (it keeps a bone frame), bone under the others'], ['Pressed', '.98 · no colour of its own: the hover slab and letters hold'], ['Disabled', 'letters and rules dim #827B6F · primary slab #2B2925']]],
      ['Motion', [['Wipe', '320 ms cubic-bezier(.2, .9, .2, 1), from the left edge'], ['Press', '120 ms ease-out'], ['Group block', '260 ms cubic-bezier(0.2, 0, 0, 1)'], ['Label change', 'the new face fades in, 150 ms · width never changes']]],
      ['Focus', [['Keyboard', 'outline 2 bone, offset 4'], ['Group', 'arrow keys move the choice']]],
      ['Phone', [['Button', '48 high · padding 0 × 16 · 20 / 24 · icon 20'], ['Choice', '48 high · padding 0 × 12 · 18 / 22']]],
    ],
  },
]

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
          {head(1, 'Example')}
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
