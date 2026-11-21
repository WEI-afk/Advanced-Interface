import { Reel, ReelBar, ReelTab, ReelWord, ReelSet, REEL, TABS } from './Reel.jsx'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/* ================= the navigation system =================
   Two parts that share one item: a vertical sidebar (expanded or collapsed to a rail) and a horizontal tab bar.
   Every item is [icon] [label] [slot]; the slot on the right holds a badge, an icon or text. Category headers group the items. */
const li = (d, w = 1.5) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d.map((p, i) => <path key={i} d={p} />)}</svg>
)
const IC = {
  inbox: ['M3 11l2.500-6.500h10L17 11v5H3z', 'M3 11h4l1 2h4l1-2h4'], draft: ['M4 16l3-.500 9-9-2.500-2.500-9 9z', 'M12 5l2.500 2.500'],
  send: ['M3 10l14-6.500-4.500 14L10 11z', 'M10 11l7-7.500'], archive: ['M3 4h14v4H3z', 'M4.500 8v8h11V8', 'M8 11h4'],
  tag: ['M3 3.500h6.500l7 7-6 6-7-7z', 'M7 7h.010'], receipt: ['M5 3h10v14l-2.500-1.500L10 17l-2.500-1.500L5 17z', 'M7.500 7h5', 'M7.500 10h5'],
  home: ['M3.500 9L10 3.500 16.500 9v7.500h-13z', 'M8 16.500v-4.500h4v4.500'], search: ['M9 3.500a5.500 5.500 0 1 0 0 11 5.500 5.500 0 0 0 0-11z', 'M13 13l4 4'],
  user: ['M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M4.500 17a5.500 5.500 0 0 1 11 0'], out: ['M8 4H4v12h12v-4', 'M11 3h6v6', 'M17 3l-7 7'],
  rail: ['M3 4h14v12H3z', 'M8 4v12'], temple: ['M3 16.500h14', 'M3.500 7.500h13', 'M10 3l6.500 4.500h-13z', 'M5.500 7.500v9', 'M10 7.500v9', 'M14.500 7.500v9'],
  wall: ['M3 15.500h14', 'M3 6.500h14', 'M3 6.500v9', 'M17 6.500v9', 'M3 11h14', 'M8 6.500V11', 'M12 11v4.500', 'M5 4v2.500', 'M10 4v2.500', 'M15 4v2.500'],
  tower: ['M7 17V5l3-2.500L13 5v12', 'M5 17h10', 'M7 9h6', 'M7 13h6'], pen: ['M4 16l3-.500 9-9-2.500-2.500-9 9z'],
  map: ['M3 5l4.500-1.500 5 1.500L17 3.500v11.500l-4.500 1.500-5-1.500L3 16.500z', 'M7.500 3.500v11.500', 'M12.500 5v11.500'], mark: ['M5.500 3h9v14l-4.500-3.500L5.500 17z'],
  note: ['M8 15.500V4.500l8-1.500v11', 'M6 17.500a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M14 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'], album: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M10 8.500a1.500 1.500 0 1 0 0 3 1.500 1.500 0 0 0 0-3z'],
  list: ['M7 5h10', 'M7 10h10', 'M7 15h10', 'M3.500 5h.010', 'M3.500 10h.010', 'M3.500 15h.010'], down: ['M10 3.500v9', 'M6.500 9L10 12.500 13.500 9', 'M4 16h12'],
  radio: ['M3.500 8h13v8.500h-13z', 'M6 8l9-4', 'M7.500 12.300a1.200 1.200 0 1 0 0-.010'], bell: ['M5.500 13.500V9a4.500 4.500 0 0 1 9 0v4.500l1.500 2h-12z', 'M8.500 17.500a1.500 1.500 0 0 0 3 0'],
  lock: ['M5 9h10v8H5z', 'M7 9V6.500a3 3 0 0 1 6 0V9'], card: ['M3 5.500h14v9H3z', 'M3 8.500h14', 'M6 12h3'], team: ['M7.500 9a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z', 'M2.500 16a5 5 0 0 1 10 0', 'M13 4.200a2.500 2.500 0 0 1 0 4.700', 'M14.500 11.300a5 5 0 0 1 3 4.700'],
  help: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M8 8a2 2 0 1 1 2.500 1.900c-.400.200-.500.500-.500 1.100', 'M10 13.500v.010'],
  stairs: ['M3 16.500h4v-4h4v-4h4v-4h2'], ticket: ['M3 6h14v2.500a1.500 1.500 0 0 0 0 3V14H3v-2.500a1.500 1.500 0 0 0 0-3z', 'M12 6v8'], audio: ['M4 12v-1a6 6 0 0 1 12 0v1', 'M4 12h3v4.500H4z', 'M13 12h3v4.500h-3z'],
  shop: ['M4 7h12l-1 9.500H5z', 'M7.500 7a2.500 2.500 0 0 1 5 0'], box: ['M3.500 6.500L10 3.500l6.500 3v7L10 16.500l-6.500-3z', 'M3.500 6.500L10 9.500l6.500-3', 'M10 9.500v7'], book: ['M4 4.500h5a2 2 0 0 1 2 2V16a1.500 1.500 0 0 0-1.500-1.500H4z', 'M16 4.500h-5', 'M16 4.500v10h-4.500'], clock: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M10 6v4l2.500 2'],
  phone: ['M6.500 2.500h7v15h-7z', 'M9 15h2'], tablet: ['M4 3h12v14H4z', 'M9 14.500h2'], desktop: ['M2.500 4h15v9.500h-15z', 'M7 17h6', 'M10 13.500V17'], menu: ['M3.500 5.500h13', 'M3.500 10h13', 'M3.500 14.500h13'],
  cal: ['M3.500 5h13v11.500h-13z', 'M3.500 8.500h13', 'M7 3v3.500', 'M13 3v3.500'], grid: ['M3.500 3.500h5v5h-5z', 'M11.500 3.500h5v5h-5z', 'M3.500 11.500h5v5h-5z', 'M11.500 11.500h5v5h-5z'],
}

// measure where an element sits inside its container (layout, not the painted box), so one indicator can glide to it
function useMarker(boxRef, selector, deps) {
  const [box, setBox] = useState(null)
  const measure = () => {
    const root = boxRef.current
    const el = root && selector && root.querySelector(selector)
    if (!el) { setBox(null); return }
    let x = 0, y = 0, n = el
    while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent }
    setBox({ x, y, w: el.offsetWidth, h: el.offsetHeight })
  }
  useLayoutEffect(measure, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const ro = new ResizeObserver(measure)
    if (boxRef.current) { ro.observe(boxRef.current); boxRef.current.querySelectorAll('.nv-item').forEach((c) => ro.observe(c)) }
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return box
}

/* the right-hand slot: a badge, an icon or text. Matter-of-fact items say a little more on hover ("12" → "12 unread"),
   so the slot holds both faces in one cell and swaps them */
function Slot({ slot }) {
  if (!slot) return null
  const face = (f) => (slot.type === 'icon' ? li(f) : f)
  return (
    <span className={`nv-slot is-${slot.type}`}>
      <span className="nv-face f0">{face(slot.v)}</span>
      {slot.more && <span className="nv-face f1" aria-hidden="true">{face(slot.more)}</span>}
    </span>
  )
}

function Item({ it, sel, onPick, className = '', role, ...rest }) {
  return (
    <button type="button" data-id={it.id} className={`nv-item ${sel ? 'is-sel' : ''} ${it.slot ? `has-${it.slot.type}` : ''} ${className}`}
      aria-current={sel ? 'page' : undefined} disabled={it.off} title={it.long ? it.label : undefined} onClick={() => onPick?.(it.id)} {...rest}>
      <span className="nv-ic">{li(it.icon)}</span>
      <span className="nv-label">{it.label}</span>
      <Slot slot={it.slot} />
    </button>
  )
}

// sidebar: category headers and items; collapses to a rail of icons, where a tooltip names the item you point at
function Sidebar({ sys, title, sections, value, onChange, collapsed, onToggle, still, label, maxH, className = '' }) {
  const list = useRef(null)
  const [hot, setHot] = useState(null)
  // sections fold away under their header (a disclosure control); the slab only shows while its item is visible
  const [shut, setShut] = useState([])
  const hidden = !collapsed && sections.some((sec) => shut.includes(sec.title) && sec.items.some((it) => it.id === value))
  // while the width animates, the slab is pinned to its item (measured every frame, no transition of its own), so it never trails behind and leaves a gap
  const [resizing, setResizing] = useState(false)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setResizing(true)
    const t = setTimeout(() => setResizing(false), 1200) // a fallback; normally the width transition's end hands the fill back
    return () => clearTimeout(t)
  }, [collapsed])
  const sel = useMarker(list, hidden ? null : `[data-id="${value}"]`, [value, collapsed, shut.join(), resizing])
  const all = sections.flatMap((s) => s.items)
  // forgiving keys: arrows or j / k, Home / End, and typing the start of a name jumps to it
  const typed = useRef({ text: '', t: 0 })
  const keys = (e) => {
    const btns = [...list.current.querySelectorAll('.nv-item:not(:disabled)')]
    const i = btns.indexOf(document.activeElement)
    const go = (n) => { e.preventDefault(); btns[(n + btns.length) % btns.length]?.focus() }
    if (e.key === 'ArrowDown' || e.key === 'j') return go(i + 1)
    if (e.key === 'ArrowUp' || e.key === 'k') return go(i - 1)
    if (e.key === 'Home') return go(0)
    if (e.key === 'End') return go(btns.length - 1)
    if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      const now = Date.now(), T = typed.current
      T.text = (now - T.t < 600 ? T.text : '') + e.key.toLowerCase(); T.t = now
      const hit = btns.find((b) => b.querySelector('.nv-label')?.textContent.toLowerCase().startsWith(T.text))
      if (hit) { e.preventDefault(); hit.focus() }
    }
  }
  // coyote time: the rail's name tag lingers a moment after the pointer leaves, so moving between icons never flickers
  const linger = useRef()
  const show = (h) => { clearTimeout(linger.current); setHot(h) }
  const hide = () => { clearTimeout(linger.current); linger.current = setTimeout(() => setHot(null), 160) }
  useEffect(() => () => clearTimeout(linger.current), [])
  return (
    <nav className={`nv-side ${sys}-side ${collapsed ? 'is-col' : ''} ${resizing ? 'is-resizing' : ''} ${className}`} aria-label={label}
      onTransitionEnd={(e) => { if (e.target === e.currentTarget && e.propertyName === 'width') setResizing(false) }}>
      <div className="nv-top">
        <span className="nv-title">{title}</span>
        <button type="button" className="nv-toggle" aria-expanded={!collapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={onToggle} disabled={still}>
          {li(IC.rail)}
        </button>
      </div>
      <div className={`nv-list ${maxH ? 'is-scroll' : ''}`} ref={list} style={maxH ? { maxHeight: maxH } : undefined} onKeyDown={keys} onPointerLeave={hide}>
        {sel && <i className="nv-sel" aria-hidden="true" style={{ transform: `translate(${sel.x}px, ${sel.y}px)`, width: sel.w, height: sel.h }} />}
        {sections.map((sec) => (
          <div key={sec.title} className="nv-sec" role="group" aria-label={sec.title}>
            <button type="button" className="nv-head" aria-expanded={!shut.includes(sec.title)} disabled={still || collapsed} tabIndex={collapsed ? -1 : undefined}
              onClick={() => setShut((v) => (v.includes(sec.title) ? v.filter((t) => t !== sec.title) : [...v, sec.title]))}>
              <span>{sec.title}</span><span className="nv-disc">{li(['M6 8l4 4 4-4'])}</span>
            </button>
            <div className={`nv-items ${shut.includes(sec.title) && !collapsed ? 'is-shut' : ''}`}><div className="nv-items-in">
            {!sec.items.length && <p className="nv-empty">Nothing here yet</p>}
            {sec.items.map((it, n) => (
              <Item key={it.id} it={it} style={{ '--i': n }} sel={it.id === value} onPick={onChange} aria-label={collapsed ? it.label : undefined}
                onPointerEnter={(e) => show({ id: it.id, y: e.currentTarget.offsetTop + e.currentTarget.offsetHeight / 2 })}
                onFocus={(e) => show({ id: it.id, y: e.currentTarget.offsetTop + e.currentTarget.offsetHeight / 2 })} onBlur={hide} />
            ))}
            </div></div>
          </div>
        ))}
      </div>
      {collapsed && hot && (
        <span className="nv-tip" role="tooltip" style={{ top: hot.y + (list.current?.offsetTop || 0) }}>
          {all.find((it) => it.id === hot.id)?.label}{all.find((it) => it.id === hot.id)?.slot ? ` · ${all.find((it) => it.id === hot.id).slot.more || all.find((it) => it.id === hot.id).slot.v}` : ''}
        </span>
      )}
    </nav>
  )
}

// tab bar: the same item laid horizontally; one indicator slides to the chosen tab
function TabBar({ sys, items, value, onChange, label }) {
  const bar = useRef(null)
  const sel = useMarker(bar, `[data-id="${value}"]`, [value])
  const keys = (e) => {
    const i = items.findIndex((t) => t.id === value)
    let j = null
    if (e.key === 'ArrowRight') j = i + 1
    else if (e.key === 'ArrowLeft') j = i - 1
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = items.length - 1
    else if (/^[1-9]$/.test(e.key) && +e.key <= items.length) j = +e.key - 1
    if (j == null) return
    e.preventDefault()
    const n = items[(j + items.length) % items.length]
    onChange?.(n.id)
    bar.current.querySelector(`[data-id="${n.id}"]`)?.focus()
  }
  return (
    <nav className={`nv-tabs ${sys}-tabs`} ref={bar} aria-label={label} onKeyDown={keys}>
      {sel && <i className="nv-sel" aria-hidden="true" style={{ transform: `translate(${sel.x}px, ${sel.y}px)`, width: sel.w, height: sel.h }} />}
      {items.map((it) => <Item key={it.id} it={it} sel={it.id === value} onPick={onChange} tabIndex={it.id === value ? 0 : -1} />)}
    </nav>
  )
}

/* ================= the two sets ================= */
const MF = [
  { name: 'Mail', icon: IC.inbox, title: 'Workspace',
    sections: [
      { title: 'Mail', items: [
        { id: 'inbox', icon: IC.inbox, label: 'Inbox', slot: { type: 'badge', v: '12', more: '12 unread' }, note: '12 unread · 3 flagged' },
        { id: 'drafts', icon: IC.draft, label: 'Drafts', slot: { type: 'text', v: '3', more: '3 unsent' }, note: '3 drafts, oldest 2 days' },
        { id: 'sent', icon: IC.send, label: 'Sent', slot: { type: 'text', v: '⌘3', more: 'press ⌘3' }, note: 'Sent · last one 10 min ago' },
        { id: 'archive', icon: IC.archive, label: 'Archive', note: 'Archive · 1,204 conversations' },
      ] },
      { title: 'Labels', items: [
        { id: 'clients', icon: IC.tag, label: 'Clients', slot: { type: 'icon', v: IC.out, more: IC.out }, note: 'Clients · opens the shared folder' },
        { id: 'receipts', icon: IC.receipt, label: 'Receipts', slot: { type: 'badge', v: '2', more: '2 new' }, note: 'Receipts · 2 new this week' },
      ] },
    ],
    tabs: [{ id: 'home', icon: IC.home, label: 'Home' }, { id: 'search', icon: IC.search, label: 'Search' }, { id: 'inbox', icon: IC.inbox, label: 'Inbox', slot: { type: 'badge', v: '12' } }, { id: 'you', icon: IC.user, label: 'You' }] },
]
const IX = [
  { name: 'Archive', icon: IC.grid, title: 'The Index',
    sections: [
      { title: 'Collections', items: [
        { id: 'temples', icon: IC.temple, label: 'Temples', slot: { type: 'text', v: '126' }, note: '126 temples, 1,200 BC to now' },
        { id: 'walls', icon: IC.wall, label: 'Walls', slot: { type: 'text', v: '48' }, note: '48 walls, the longest 21,196 km' },
        { id: 'towers', icon: IC.tower, label: 'Towers', slot: { type: 'badge', v: 'New' }, note: 'Towers · new collection' },
      ] },
      { title: 'Architects', items: [
        { id: 'ando', icon: IC.pen, label: 'Tadao Ando', slot: { type: 'icon', v: IC.out }, note: 'Tadao Ando · opens his archive' },
        { id: 'kahn', icon: IC.pen, label: 'Louis Kahn', slot: { type: 'text', v: '9' }, note: 'Louis Kahn · 9 works' },
      ] },
    ],
    tabs: [{ id: 'index', icon: IC.grid, label: 'Index' }, { id: 'map', icon: IC.map, label: 'Map' }, { id: 'saved', icon: IC.mark, label: 'Saved', slot: { type: 'badge', v: '3' } }, { id: 'visits', icon: IC.cal, label: 'Visits' }] },
]

function NavSet({ sys, scenes, auto }) {
  const data = scenes[0]
  const [side, setSide] = useState(data.sections[0].items[0].id)
  const [tab, setTab] = useState(data.tabs[0].id)
  const [col, setCol] = useState(false)
  const all = data.sections.flatMap((s) => s.items)

  /* wall: it moves by itself */
  useEffect(() => {
    if (!auto) return
    let k = 0
    const t = setInterval(() => {
      k++
      if (k % 5 === 0) setCol((v) => !v)
      else { setSide(all[k % all.length].id); setTab(data.tabs[k % data.tabs.length].id) }
    }, 1100)
    return () => clearInterval(t)
  }, [auto]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ex nv-ex">
      <div className="nv-part">
        <h3 className="group-k">Sidebar · {col ? 'collapsed' : 'expanded'}</h3>
        <Sidebar sys={sys} title={data.title} sections={data.sections} value={side} onChange={setSide} collapsed={col} onToggle={() => setCol((v) => !v)} label={`${data.title} sidebar`} />
        {!auto && <p className="tb-status" aria-live="polite">{all.find((it) => it.id === side)?.note}</p>}
      </div>
      <div className="nv-part">
        <h3 className="group-k">Tab bar</h3>
        <TabBar sys={sys} items={data.tabs} value={tab} onChange={setTab} label={`${data.title} tabs`} />
        {!auto && <p className="tb-status" aria-live="polite">{data.tabs.find((t) => t.id === tab)?.label}</p>}
      </div>
      {!auto && <Responsive sys={sys} data={data} />}
    </div>
  )
}

/* responsive: one navigation, three window sizes. Desktop keeps the full sidebar; tablet folds it to a rail that opens over the page;
   phone moves to a tab bar of the first three destinations plus More, which opens the whole sidebar as a drawer. One selection throughout. */
const WINDOWS = [{ id: 'phone', icon: IC.phone, label: 'Phone', w: 390, h: 660 }, { id: 'tablet', icon: IC.tablet, label: 'Tablet', w: 820, h: 600 }, { id: 'desktop', icon: IC.desktop, label: 'Desktop', w: 1200, h: 600 }]
function Responsive({ sys, data }) {
  const [win, setWin] = useState('tablet')
  const W = WINDOWS.find((w) => w.id === win)
  const box = useRef(null)
  const [avail, setAvail] = useState(760)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setAvail(e.contentRect.width))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const k = Math.min(1, avail / W.w)
  const all = data.sections.flatMap((s) => s.items)
  const [value, setValue] = useState(all[0].id)
  const [open, setOpen] = useState(false)
  const pick = (id) => { setValue(id); setOpen(false) }
  const tabs = [...all.slice(0, 3).map(({ id, icon, label, slot }) => ({ id, icon, label, slot: slot?.type === 'badge' ? { type: 'badge', v: slot.v } : undefined })), { id: 'more', icon: IC.menu, label: 'More' }]
  const cur = all.find((it) => it.id === value)
  const side = (extra) => <Sidebar sys={sys} title={data.title} sections={data.sections} value={value} onChange={pick} label={`${data.title} sidebar`} {...extra} />
  return (
    <div className="nv-part nv-resp">
      <h3 className="group-k">Responsive · {W.label}, {W.w} wide</h3>
      <div ref={box} className="nv-win-box" style={{ height: W.h * k }}>
        <div className={`nv-win is-${win} ${sys}-win`} style={{ width: W.w, height: W.h, transform: `scale(${k})` }}>
          {win === 'desktop' && side({ still: true })}
          {win === 'tablet' && side({ collapsed: !open, onToggle: () => setOpen((v) => !v), className: `is-overlay ${open ? 'is-open' : ''}` })}
          {win === 'tablet' && open && <div className="nv-scrim" onClick={() => setOpen(false)} />}
          <div className="nv-page">
            {win === 'phone' && <button type="button" className="nv-menu" aria-label="Open navigation" onClick={() => setOpen(true)}>{li(IC.menu)}</button>}
            <h4>{cur.label}</h4>
            <p>{cur.note}</p>
          </div>
          {win === 'phone' && <TabBar sys={sys} items={tabs} value={tabs.some((t) => t.id === value) ? value : 'more'} onChange={(id) => (id === 'more' ? setOpen(true) : pick(id))} label="Phone tabs" />}
          {win === 'phone' && open && <><div className="nv-scrim" onClick={() => setOpen(false)} /><div className="nv-drawer">{side({ onToggle: () => setOpen(false) })}</div></>}
        </div>
      </div>
      <TabBar sys={sys} items={WINDOWS} value={win} onChange={(id) => { setWin(id); setOpen(false) }} label="Window size" />
      <p className="tb-status">{{ phone: 'Phone: a tab bar of the first three destinations and More, which opens the sidebar as a drawer', tablet: 'Tablet: a rail; its button opens the full sidebar over the page, and picking closes it', desktop: 'Desktop: the full sidebar stays open' }[win]}</p>
    </div>
  )
}

/* ================= static samples ================= */
function Sample({ label, children }) {
  return (
    <figure className="sample">
      <figcaption>{label}</figcaption>
      <div className="sample-body" inert="" aria-hidden="true">{children}</div>
    </figure>
  )
}
function StateGrid({ cols, rows }) {
  return (
    <div className="sg-wrap">
      <div className="sg" style={{ '--cols': cols.length }} inert="" aria-hidden="true">
        <span />
        {cols.map((c) => <span key={c} className="sg-h">{c}</span>)}
        {rows.map(([k, cells]) => [<span key={k} className="sg-k">{k}</span>, ...cells.map((n, i) => <div key={`${k}${i}`} className="sg-c">{n}</div>)])}
      </div>
    </div>
  )
}
// a frozen item, in a frame of its part (sidebar column or tab bar), drawn in one state
const SideItem = ({ sys, it, cls = '' }) => <div className={`nv-side ${sys}-side nv-frozen`}><div className="nv-list"><Item it={it} className={cls} sel={cls.includes('is-sel')} /></div></div>
const TabItem = ({ sys, it, cls = '' }) => <div className={`nv-tabs ${sys}-tabs nv-frozen`}><Item it={it} className={cls} sel={cls.includes('is-sel')} /></div>
const STATES = [['Enabled', ''], ['Hover', 'st-hover'], ['Pressed', 'st-hover st-press'], ['Selected', 'is-sel st-sel']]
const statesFor = (sys, data) => (
  <StateGrid cols={['Sidebar item', 'Tab']} rows={STATES.map(([k, c]) => [k, [<SideItem sys={sys} it={data.sections[0].items[0]} cls={c} />, <TabItem sys={sys} it={data.tabs[2]} cls={c} />]])} />
)
const configsFor = (sys, data, title) => [
  { title: 'Sidebar', row: true, items: [
    ['Expanded: headers, icon and text, a slot on the right', <Sidebar sys={sys} title={title} sections={data.sections} value={data.sections[0].items[0].id} still />],
    ['Collapsed: a rail of icons, badges become dots', <Sidebar sys={sys} title={title} sections={data.sections} value={data.sections[0].items[0].id} collapsed still />],
  ] },
  { title: 'Item · the right slot', row: true, items: [
    ['Badge', <SideItem sys={sys} it={data.sections.flatMap((s) => s.items).find((it) => it.slot?.type === 'badge')} />],
    ['Icon', <SideItem sys={sys} it={data.sections.flatMap((s) => s.items).find((it) => it.slot?.type === 'icon')} />],
    ['Text', <SideItem sys={sys} it={data.sections.flatMap((s) => s.items).find((it) => it.slot?.type === 'text')} />],
    ['None', <SideItem sys={sys} it={{ ...data.sections[0].items[0], slot: null }} />],
  ] },
  { title: 'Tab bar', items: [['Icon and text, the badge sits on the icon', <TabBar sys={sys} items={data.tabs} value={data.tabs[0].id} />]] },
  { title: 'Edge cases', row: true, items: [
    ['Long name: it truncates, the full name shows on hover', <SideItem sys={sys} it={{ id: 'long', icon: IC.tag, label: 'Quarterly client reports and invoices', long: true, slot: { type: 'text', v: '14' } }} />],
    ['Huge count: the badge stops at 99+', <SideItem sys={sys} it={{ ...data.sections[0].items[0], slot: { type: 'badge', v: '99+', more: '1,284 unread' } }} />],
    ['Nothing to count: no badge at all', <SideItem sys={sys} it={{ ...data.sections[0].items[0], slot: null }} />],
    ['Unavailable: dimmed, and the arrow keys skip it', <SideItem sys={sys} it={{ ...data.sections[0].items[1], off: true }} />],
    ['Empty section: it says so', <Sidebar sys={sys} title={title} sections={[{ title: data.sections[1].title, items: [] }]} value="" still />],
    ['Long list: it scrolls, the header stays', <Sidebar sys={sys} title={title} sections={[{ title: 'Projects', items: [{ id: 'm0', icon: IC.tag, label: 'Project A', slot: { type: 'text', v: '1' } }, { id: 'm1', icon: IC.tag, label: 'Project B', slot: { type: 'text', v: '4' } }, { id: 'm2', icon: IC.tag, label: 'Project C', slot: { type: 'text', v: '7' } }, { id: 'm3', icon: IC.tag, label: 'Project D', slot: { type: 'text', v: '10' } }, { id: 'm4', icon: IC.tag, label: 'Project E', slot: { type: 'text', v: '13' } }, { id: 'm5', icon: IC.tag, label: 'Project F', slot: { type: 'text', v: '16' } }, { id: 'm6', icon: IC.tag, label: 'Project G', slot: { type: 'text', v: '19' } }, { id: 'm7', icon: IC.tag, label: 'Project H', slot: { type: 'text', v: '22' } }, { id: 'm8', icon: IC.tag, label: 'Project I', slot: { type: 'text', v: '25' } }] }]} value="m0" maxH={300} still />],
  ] },
  { title: 'Tab bar · the fewest and the most', items: [
    ['Three tabs', <TabBar sys={sys} items={data.tabs.slice(0, 3)} value={data.tabs[0].id} />],
    ['Five tabs, the most a tab bar should hold', <TabBar sys={sys} items={[...data.tabs, { id: 'more5', icon: IC.menu, label: 'More' }]} value={data.tabs[0].id} />],
  ] },
]

const SETS = [
  {
    id: 'mf', tone: 'Matter-of-fact, Heads Up',
    about: 'Navigation for a mail workspace that tells you what is there before you go: point at an item and its slot says a little more ("12" becomes "12 unread").',
    Body: (p) => <NavSet sys="mf" scenes={MF} {...p} />,
    configs: configsFor('mf', MF[0], 'Workspace'),
    states: statesFor('mf', MF[0]),
    spec: [
      ['Sidebar', [['Width', 'expanded 264 · collapsed 72'], ['Container', 'padding 12 · radius 20 · #141413, edge white 6%'], ['Top', '40 high: title, collapse button 40 × 40 radius 12']]],
      ['Item', [['Size', '40 high · padding 0 × 14 · radius 12'], ['Gaps', 'icon to label 12 · label to slot 8'], ['Icon', '20 × 20 · line 1.5'], ['Items apart', '2']]],
      ['Category header', [['Type', 'Inter Medium 12 / 16, #8E8E8A'], ['Space', '16 above, 6 below, inset 14'], ['Collapsed', 'a 16 rule in its place'], ['Disclosure', 'the header folds its section away, chevron turns −90°, 240 ms']]],
      ['Right slot', [['Badge', '20 high · radius 10 · padding 0 × 7 · Inter Semi Bold 12'], ['Text', 'Inter Medium 13 / 16, #8E8E8A, tabular'], ['Icon', '16 × 16'], ['On hover', 'the slot says more: 12 → 12 unread, ⌘3 → press ⌘3']]],
      ['Tab bar', [['Container', 'padding 6 · radius 20 · tabs 4 apart'], ['Tab', '56 high · min 76 wide · icon 20 over label, 4 apart'], ['Label', 'Inter Medium 12 / 16'], ['Badge', 'on the icon\'s top right, 16 high'], ['Layout', '4 destinations in equal-width segments · labels always shown']]],
      ['Type', [['Items', 'Inter Medium 14 / 20'], ['Title', 'Inter Semi Bold 15 / 20']]],
      ['Color', [['Surface', '#141413'], ['Text', '#F4F4F2'], ['Selected', 'light slab #F4F4F2, ink #111 · the icon gets heavier, line 2'], ['Hover', '#232322'], ['Badge', 'light pill, ink · on the selected item it inverts']]],
      ['States', [['Hover', 'fill #232322 · the slot says more'], ['Pressed', '.98 · fill #2C2C2B'], ['Selected', 'one light slab slides to it'], ['Focus', 'outline 2, offset 2']]],
      ['Motion', [['Selection', '220 ms cubic-bezier(0.2, 0, 0, 1), one slab moves and resizes'], ['Collapse', 'width 280 ms, same curve · labels fade 150 ms'], ['Slot', 'faces cross 150 ms'], ['Press', '120 ms ease-out']]],
      ['Input', [['Sidebar', '↑ ↓ move focus · Enter opens'], ['Tab bar', '← → move the tab'], ['Rail', 'pointing at an icon shows its name and fact']]],
      ['Laws of UX', [['Fitts', 'targets at least 40 · tabs fill equal segments of the bar · the rail\'s name tag lingers 160 ms (coyote time) so moving between icons never flickers'], ['Hick', 'sections fold away · the phone shows three tabs and More, the rest one tap further'], ['Miller', 'no more than 5 items to a section, 3 to 5 tabs'], ['Doherty', 'every response starts at once and ends within 320 ms'], ['Postel', 'arrows or j / k, Home / End, type a name to jump to it, 1–5 picks a tab']]],
      ['Responsive', [['Desktop', 'the full sidebar stays open'], ['Tablet', 'a rail; its button lays the full sidebar over the page with a scrim, picking closes it'], ['Phone', 'a bottom tab bar of the first three destinations and More; More opens the sidebar as a drawer'], ['Selection', 'one destination stays chosen across all three']]],
      ['Edge cases', [['Long name', 'truncates with an ellipsis, full name on hover'], ['Count over 99', 'the badge reads 99+, hover gives the real number'], ['Zero', 'no badge'], ['Unavailable', '38% and skipped by the arrow keys'], ['Empty section', 'says "Nothing here yet"'], ['Long list', 'scrolls, the section header stays on top'], ['Tabs', '3 to 5, never more']]],
    ],
  },
  {
    id: 'ix', tone: 'Monumental, The Index',
    about: 'Navigation for an archive of structures, cut like carved lettering: heavy capitals, 3 rules, one bone block for where you are, and a rule that wipes in under the item you point at.',
    Body: (p) => <NavSet sys="ix" scenes={IX} {...p} />,
    configs: configsFor('ix', IX[0], 'The Index'),
    states: statesFor('ix', IX[0]),
    spec: [
      ['Sidebar', [['Width', 'expanded 300 · collapsed 88'], ['Edge', '3 bone rule on the right'], ['Top', '48 high: title Big Shoulders 28, collapse button 48 × 48']]],
      ['Item', [['Size', '52 high · padding 0 × 20'], ['Gaps', 'icon to label 14 · label to slot 10'], ['Icon', '24 × 24 · line 2'], ['Items apart', '0, ruled by hover only']]],
      ['Category header', [['Type', 'Inter Semi Bold 11 / 16, caps, +12%, #827B6F'], ['Rule', '3 bone rule above, 20 space'], ['Collapsed', 'only the rule stays'], ['Disclosure', 'the header folds its section away, chevron turns −90°, 240 ms']]],
      ['Right slot', [['Text', 'Big Shoulders 800 22 / 24, dim'], ['Badge', 'bone block · Inter Bold 11, caps · ink'], ['Icon', '20 × 20 · line 2']]],
      ['Tab bar', [['Container', '64 high · 3 bone rule along the bottom'], ['Tab', 'padding 0 × 22 · icon 24 beside the label, 12 apart'], ['Badge', 'bone block numeral beside the label'], ['Layout', 'equal-width segments · horizontal items on wide screens, icon over label on phones']]],
      ['Type', [['Items, tabs', 'Big Shoulders Display ExtraBold 24 / 28, caps'], ['Unchosen', '#827B6F'], ['Chosen', 'ink #1A1815 on bone · the icon gets heavier, line 2.75']]],
      ['Color', [['Bone', '#E6E1D7'], ['Ink', '#1A1815'], ['Dim', '#827B6F']]],
      ['States', [['Hover', 'letters turn bone · a 3 rule wipes in under the item from the left'], ['Pressed', '.98 · the hover holds, no new colour'], ['Selected', 'one bone block slides under it, letters turn ink']]],
      ['Motion', [['Selection', '260 ms cubic-bezier(0.2, 0, 0, 1)'], ['Wipe', '320 ms cubic-bezier(.2, .9, .2, 1)'], ['Collapse', 'width 280 ms · labels fade 150 ms']]],
      ['Input', [['Sidebar', '↑ ↓ move focus · Enter opens'], ['Tab bar', '← → move the tab'], ['Rail', 'pointing at an icon shows its name']]],
      ['Laws of UX', [['Fitts', 'targets at least 40 · tabs fill equal segments of the bar · the rail\'s name tag lingers 160 ms (coyote time) so moving between icons never flickers'], ['Hick', 'sections fold away · the phone shows three tabs and More, the rest one tap further'], ['Miller', 'no more than 5 items to a section, 3 to 5 tabs'], ['Doherty', 'every response starts at once and ends within 320 ms'], ['Postel', 'arrows or j / k, Home / End, type a name to jump to it, 1–5 picks a tab']]],
      ['Responsive', [['Desktop', 'the full sidebar stays open'], ['Tablet', 'a rail; its button lays the full sidebar over the page with a scrim, picking closes it'], ['Phone', 'a bottom tab bar of the first three destinations and More; More opens the sidebar as a drawer'], ['Selection', 'one destination stays chosen across all three']]],
      ['Edge cases', [['Long name', 'truncates with an ellipsis, full name on hover'], ['Count over 99', 'the badge reads 99+, hover gives the real number'], ['Zero', 'no badge'], ['Unavailable', '38% and skipped by the arrow keys'], ['Empty section', 'says "Nothing here yet"'], ['Long list', 'scrolls, the section header stays on top'], ['Tabs', '3 to 5, never more']]],
    ],
  },
  {
    id: 'reel', tone: 'Kinetic, The Reel',
    note: 'Point at the half-circle on the left edge and the reel grows out of it; move away and it folds back. Scroll or drag the pages, roll the ruler to change section, or use ↑ ↓ and ← →. Type the start of a page to jump to it.',
    about: 'A workspace sidebar that moves like a title sequence. At rest it is folded into a half-circle on the edge; point at it and the reel grows out: the sections on a curved ruler, the pages rolling past an arrow, counts, and who is in the chosen page.',
    Body: (p) => <ReelSet {...p} />,
    configs: [
      { title: 'Sidebar · at rest and on hover', row: true, items: [
        ['At rest: folded into a half-circle on the left edge, the section\'s icon in a ring of ticks', <div className="rl-stage"><Reel still cat={1} /></div>],
        ['On hover or focus: the reel grows out of it with everything: every section, the pages around, slots, and the chosen page\'s fact line and people', <div className="rl-stage"><Reel still live cat={1} /></div>],
      ] },
      { title: 'Item · the right slot (shown when engaged)', row: true, items: [
        ['Badge: unread', <div className="rl-frozen"><ReelWord it={REEL[1].items[0]} className="is-sel" /></div>],
        ['Text: a short fact', <div className="rl-frozen"><ReelWord it={REEL[1].items[1]} className="is-sel" /></div>],
        ['Icon: shared', <div className="rl-frozen"><ReelWord it={REEL[0].items[2]} className="is-sel" /></div>],
        ['None', <div className="rl-frozen"><ReelWord it={REEL[1].items[3]} className="is-sel" /></div>],
      ] },
      { title: 'Tab bar · at rest and engaged', items: [
        ['At rest: only the chosen tab reads', <div className="rl-stage is-bar"><ReelBar still live={false} value={1} /></div>],
        ['Engaged: the neighbours sharpen, badges and the caption come in', <div className="rl-stage is-bar"><ReelBar still live value={1} /></div>],
      ] },
      { title: 'Edge cases', row: true, items: [
        ['Long name: it truncates at 376, the full name on hover', <div className="rl-frozen"><ReelWord it={{ label: 'quarterly client reports', icon: REEL[0].icon, slot: { type: 'text', v: '14' } }} className="is-sel" /></div>],
        ['Huge count: the badge stops at 99+', <div className="rl-frozen"><ReelWord it={{ ...REEL[1].items[0], slot: { type: 'badge', v: '99+' } }} className="is-sel" /></div>],
        ['Last page: the drum stops, it does not wrap', <div className="rl-stage"><Reel still live cat={6} act={2} /></div>],
        ['Empty section: it says so', <div className="rl-stage"><Reel still live sections={[...REEL, { id: 'drafts', icon: REEL[0].icon, name: 'Drafts', items: [] }]} cat={7} /></div>],
        ['Three tabs: the fewest', <div className="rl-stage is-bar"><ReelBar still live items={TABS.slice(0, 3)} value={1} /></div>],
      ] },
    ],
    states: (
      <StateGrid cols={['Page', 'Tab']} rows={STATES.map(([k, c]) => [k, [
        <div className="rl-frozen"><ReelWord it={REEL[1].items[0]} className={c} /></div>,
        <div className="rl-frozen"><ReelTab c={TABS[0]} sel={c.includes('is-sel')} className={c} /></div>,
      ]])} />
    ),
    spec: [
      ['Use case', [['Product', 'a team workspace: docs, chat, tasks, people'], ['Ruler', 'the 7 sections, with their page count when open'], ['Drum', 'that section\'s pages'], ['Detail', 'one fact about the chosen page and who is in it'], ['Tab bar', 'Home · Inbox · Docs · Tasks · People']]],
      ['Rest and engaged', [['At rest', 'folded into the handle: only the current section\'s icon'], ['Engaged', 'pointer over it or focus inside it · every section · neighbours 72%, 1.2 blur a step · slots · the chosen page unfolds its detail'], ['Leaving', 'it stays open 400 ms after the pointer leaves, 2.5 s after a touch, so passing through never flickers'], ['Hovered page', 'a neighbour you point at sharpens fully before you pick it']]],
      ['Sidebar', [['Size', 'expanded 640 × 480 · collapsed 64 × 480'], ['Container', 'radius 28 · #080808 to #121212, edge white 6%'], ['Handle', 'a 48 × 96 half-circle on the left edge at the middle line: the section\'s icon 20 in a ring of 13 ticks, 15° apart'], ['Open', 'no click: pointing at the handle or focusing the reel grows it out of the handle, 320 ms; it folds back 400 ms after the pointer leaves'], ['Space', 'the reel opens over the page, the page does not move']]],
      ['Ruler · the sections', [['Arc', 'radius 360, centre 170 off the left edge, on the middle line'], ['Ticks', 'every 3°: minor 12 · major 22, one per section · 55% at rest, 100% engaged'], ['Month', 'Geist Mono 12, caps, +8% · 34 inside the ticks · count Geist Mono 10 beside it when engaged'], ['Engaged', 'sections come in from the middle out, 30 ms apart']]],
      ['Drum · the pages', [['Word', 'Inter Bold 44 / 56, lowercase, −3.5% · max 376 wide'], ['Gaps', 'icon 26 to word 14 · word to slot 12'], ['Roll', '60 a step · each step tilts 20° on X with 900 perspective'], ['Opening', 'the pages below the chosen one drop 84 to make room for its detail']]],
      ['Detail', [['Line', 'one fact: unread, last edit, due, online · Geist Mono 12, #a3a3a3'], ['People', 'up to four 30 round faces, overlapping 6, then the rest as +n · none when nobody is in it'], ['In', 'line 120 ms after opening, faces 180 ms, each slides 8 down, 320 ms']]],
      ['Right slot', [['Badge', 'unread · 22 high · radius 11 · Inter Bold 13 · white, ink · grey on unchosen'], ['Text', 'a short fact · Geist Mono 13, #7a7a7a, at the cap line'], ['Icon', 'shared · 18 × 18'], ['At rest', 'hidden, slides 8 in when engaged']]],
      ['Tab bar', [['Size', 'width up to 720 · 150 high'], ['Tab', 'icon 22 beside the word, Inter Bold 24 · 160 apart'], ['Ruler', 'a tick every 16 · major every 160, under each tab · 45% at rest'], ['Caption', 'the chosen tab\'s fact, Geist Mono 12, under the ruler, engaged only'], ['Arrow', '↓ fixed above the centre'], ['Count', '3 to 5 tabs']]],
      ['Color', [['Surface', '#080808'], ['Chosen', '#ffffff'], ['Others', '#5c5c5c'], ['Hover', '#a3a3a3'], ['Detail', '#a3a3a3']]],
      ['States', [['Enabled', 'grey, tilted and blurred by its distance'], ['Hover', 'the word brightens to #a3a3a3, sharpens and nudges 6 right'], ['Pressed', '.97 for 120 ms'], ['Selected', 'white, sharp, flat, on the arrow · the icon gets heavier'], ['Opened', 'a 3 white underline wipes in under the word']]],
      ['Motion', [['Roll', '480 ms cubic-bezier(0.2, 0, 0, 1)'], ['Ruler', '520 ms, same curve'], ['Open the reel', 'fades 420 ms, detail staggered 120 / 180 ms'], ['New section', 'the pages rise 32 out of a 6 blur, 360 ms'], ['Collapse', 'width 320 ms · the reel shrinks into the handle, the handle grows to 48 × 96'], ['Reduced motion', 'everything snaps, no blur']]],
      ['Input', [['Drum', 'scroll, or drag 36 a step · click an page to roll to it, click the chosen one to open it'], ['Ruler', 'scroll, or drag 44 a step · click a section'], ['Keys', '↑ ↓ or j / k move an page · ← → move a section · Home / End · Enter opens · type a name to jump to it'], ['Tab bar', '← → · 1–5 · scroll, drag 72 a step, or click']]],
      ['Laws of UX', [['Progressive disclosure', 'at rest it answers one question, where am I; engaged it answers what is around me'], ['Fitts', 'the chosen page is the largest target, always on the arrow'], ['Hick', 'one section\'s pages at a time'], ['Doherty', 'the reel opens at once and settles within 420 ms'], ['Postel', 'scroll, drag, click, arrows, j / k and typing all roll the same reel']]],
      ['Responsive', [['Desktop', 'the full reel'], ['Phone', 'the reel scales to 52% · a tap opens it for 2.5 s · the tab bar stays full width']]],
      ['Edge cases', [['Long name', 'truncates at 376, full name on hover'], ['Count over 99', '99+'], ['First, last', 'the drum stops, it does not wrap'], ['Empty section', 'says "no pages yet"'], ['Tabs', '3 to 5']]],
    ],
  },
]

/* wall (home page hover background) */
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
  const [cols] = useState(() => Math.max(1, Math.round(window.innerWidth / 640)))
  return (
    <div className="wall" aria-hidden="true">
      {active && Array.from({ length: cols }, (_, c) => {
        const set = SETS[c % SETS.length]
        return <div key={c} className="wall-col"><set.Body auto /></div>
      })}
    </div>
  )
}

const SECTIONS = [['example', 'Example'], ['configurations', 'Configurations'], ['states', 'States'], ['specifications', 'Specifications']]

function SetPage({ set }) {
  const [active, setActive] = useState('example')
  useEffect(() => { document.title = `${set.tone} · Navigation` }, [set])
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
      {note && <p>{note}</p>}
    </header>
  )
  return (
    <div className={`page page-${set.id}`}>
      <aside className="rail">
        <a className="up" href="./">Navigation</a>
        <h1>{set.tone}</h1>
        <p className="about">{set.about}</p>
        <nav className="toc" aria-label="On this page">
          {SECTIONS.map(([id, label], i) => (
            <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined}>
              <span>{String(i + 1).padStart(2, '0')}</span>{label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="content">
        <section className="sec" id="example">
          {head(1, 'Example', set.note || 'Pick items, collapse the sidebar with its top button, move tabs with the arrow keys, and switch the window size below.')}
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
      <h1>Navigation</h1>
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
