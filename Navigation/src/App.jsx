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
      aria-current={sel ? 'page' : undefined} onClick={() => onPick?.(it.id)} {...rest}>
      <span className="nv-ic">{li(it.icon)}</span>
      <span className="nv-label">{it.label}</span>
      <Slot slot={it.slot} />
    </button>
  )
}

// sidebar: category headers and items; collapses to a rail of icons, where a tooltip names the item you point at
function Sidebar({ sys, title, sections, value, onChange, collapsed, onToggle, still, label }) {
  const list = useRef(null)
  const [hot, setHot] = useState(null)
  // sections fold away under their header (a disclosure control); the slab only shows while its item is visible
  const [shut, setShut] = useState([])
  const hidden = !collapsed && sections.some((sec) => shut.includes(sec.title) && sec.items.some((it) => it.id === value))
  const sel = useMarker(list, hidden ? null : `[data-id="${value}"]`, [value, collapsed, shut.join()])
  const all = sections.flatMap((s) => s.items)
  const keys = (e) => {
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const btns = [...list.current.querySelectorAll('.nv-item')]
    const i = btns.indexOf(document.activeElement)
    btns[(i + d + btns.length) % btns.length]?.focus()
  }
  return (
    <nav className={`nv-side ${sys}-side ${collapsed ? 'is-col' : ''}`} aria-label={label}>
      <div className="nv-top">
        <span className="nv-title">{title}</span>
        <button type="button" className="nv-toggle" aria-expanded={!collapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={onToggle} disabled={still}>
          {li(IC.rail)}
        </button>
      </div>
      <div className="nv-list" ref={list} onKeyDown={keys} onPointerLeave={() => setHot(null)}>
        {sel && <i className="nv-sel" aria-hidden="true" style={{ transform: `translate(${sel.x}px, ${sel.y}px)`, width: sel.w, height: sel.h }} />}
        {sections.map((sec) => (
          <div key={sec.title} className="nv-sec" role="group" aria-label={sec.title}>
            <button type="button" className="nv-head" aria-expanded={!shut.includes(sec.title)} disabled={still || collapsed} tabIndex={collapsed ? -1 : undefined}
              onClick={() => setShut((v) => (v.includes(sec.title) ? v.filter((t) => t !== sec.title) : [...v, sec.title]))}>
              <span>{sec.title}</span><span className="nv-disc">{li(['M6 8l4 4 4-4'])}</span>
            </button>
            <div className={`nv-items ${shut.includes(sec.title) && !collapsed ? 'is-shut' : ''}`}><div className="nv-items-in">
            {sec.items.map((it) => (
              <Item key={it.id} it={it} sel={it.id === value} onPick={onChange} aria-label={collapsed ? it.label : undefined}
                onPointerEnter={(e) => setHot({ id: it.id, y: e.currentTarget.offsetTop + e.currentTarget.offsetHeight / 2 })}
                onFocus={(e) => setHot({ id: it.id, y: e.currentTarget.offsetTop + e.currentTarget.offsetHeight / 2 })} onBlur={() => setHot(null)} />
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
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const i = items.findIndex((t) => t.id === value)
    const n = items[(i + d + items.length) % items.length]
    onChange(n.id)
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
  { name: 'Music', icon: IC.note, title: 'Library',
    sections: [
      { title: 'Library', items: [
        { id: 'songs', icon: IC.note, label: 'Songs', slot: { type: 'text', v: '1,204', more: '71 hours' }, note: '1,204 songs · 71 hours' },
        { id: 'albums', icon: IC.album, label: 'Albums', slot: { type: 'text', v: '86', more: '86 albums' }, note: '86 albums, 12 added this month' },
        { id: 'lists', icon: IC.list, label: 'Playlists', slot: { type: 'badge', v: '2', more: '2 updated' }, note: '2 playlists updated since you last listened' },
      ] },
      { title: 'On this device', items: [
        { id: 'down', icon: IC.down, label: 'Downloads', slot: { type: 'text', v: '3.2 GB', more: '3.2 of 64 GB' }, note: 'Downloads · 3.2 GB of 64 GB used' },
        { id: 'radio', icon: IC.radio, label: 'Radio', slot: { type: 'icon', v: IC.out, more: IC.out }, note: 'Radio · opens the live player' },
      ] },
    ],
    tabs: [{ id: 'now', icon: IC.home, label: 'Listen' }, { id: 'browse', icon: IC.grid, label: 'Browse' }, { id: 'radio', icon: IC.radio, label: 'Radio' }, { id: 'lib', icon: IC.note, label: 'Library', slot: { type: 'badge', v: '2' } }] },
  { name: 'Settings', icon: IC.user, title: 'Account',
    sections: [
      { title: 'General', items: [
        { id: 'profile', icon: IC.user, label: 'Profile', note: 'Profile · name, photo, email' },
        { id: 'alerts', icon: IC.bell, label: 'Notifications', slot: { type: 'badge', v: '4', more: '4 new' }, note: '4 notifications need a look' },
        { id: 'privacy', icon: IC.lock, label: 'Privacy', slot: { type: 'text', v: 'On', more: '2FA on' }, note: 'Two-factor sign-in is on' },
      ] },
      { title: 'Billing', items: [
        { id: 'plan', icon: IC.card, label: 'Plan', slot: { type: 'text', v: 'Pro', more: 'renews 1 Dec' }, note: 'Pro · renews 1 December' },
        { id: 'invoices', icon: IC.receipt, label: 'Invoices', slot: { type: 'icon', v: IC.out, more: IC.out }, note: 'Invoices · opens the billing portal' },
      ] },
    ],
    tabs: [{ id: 'over', icon: IC.home, label: 'Overview' }, { id: 'team', icon: IC.team, label: 'Team' }, { id: 'bill', icon: IC.card, label: 'Billing', slot: { type: 'badge', v: '1' } }, { id: 'help', icon: IC.help, label: 'Help' }] },
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
  { name: 'Museum', icon: IC.temple, title: 'The Hall',
    sections: [
      { title: 'Floors', items: [
        { id: 'ground', icon: IC.stairs, label: 'Ground', slot: { type: 'text', v: '12' }, note: 'Ground floor · 12 rooms' },
        { id: 'first', icon: IC.stairs, label: 'First', slot: { type: 'text', v: '9' }, note: 'First floor · 9 rooms' },
        { id: 'roof', icon: IC.tower, label: 'Roof', slot: { type: 'badge', v: 'Open' }, note: 'Roof terrace · open until 18:00' },
      ] },
      { title: 'Tours', items: [
        { id: 'guided', icon: IC.team, label: 'Guided', slot: { type: 'text', v: '11:00' }, note: 'Next guided tour at 11:00' },
        { id: 'audio', icon: IC.audio, label: 'Audio', slot: { type: 'icon', v: IC.out }, note: 'Audio guide · opens the player' },
      ] },
    ],
    tabs: [{ id: 'visit', icon: IC.temple, label: 'Visit' }, { id: 'hmap', icon: IC.map, label: 'Map' }, { id: 'tickets', icon: IC.ticket, label: 'Tickets', slot: { type: 'badge', v: '2' } }, { id: 'shop', icon: IC.shop, label: 'Shop' }] },
  { name: 'Reading room', icon: IC.book, title: 'Reading Room',
    sections: [
      { title: 'Shelves', items: [
        { id: 'drawings', icon: IC.book, label: 'Drawings', slot: { type: 'text', v: '2,410' }, note: '2,410 drawings on the shelves' },
        { id: 'models', icon: IC.box, label: 'Models', slot: { type: 'text', v: '312' }, note: '312 models, by appointment' },
        { id: 'letters', icon: IC.draft, label: 'Letters', slot: { type: 'badge', v: 'New' }, note: 'Letters · newly catalogued' },
      ] },
      { title: 'Requests', items: [
        { id: 'pending', icon: IC.clock, label: 'Pending', slot: { type: 'text', v: '3' }, note: '3 requests waiting for the desk' },
        { id: 'ready', icon: IC.box, label: 'Ready', slot: { type: 'icon', v: IC.out }, note: 'Ready · collect at desk 2' },
      ] },
    ],
    tabs: [{ id: 'rsearch', icon: IC.search, label: 'Search' }, { id: 'shelves', icon: IC.book, label: 'Shelves' }, { id: 'reqs', icon: IC.clock, label: 'Holds', slot: { type: 'badge', v: '3' } }, { id: 'desk', icon: IC.user, label: 'Desk' }] },
]

function NavSet({ sys, scenes, auto }) {
  const [si, setSi] = useState(0)
  const data = scenes[si]
  const [side, setSide] = useState(data.sections[0].items[0].id)
  const [tab, setTab] = useState(data.tabs[0].id)
  const [col, setCol] = useState(false)
  const all = data.sections.flatMap((s) => s.items)
  const pickScene = (id) => {
    const i = scenes.findIndex((sc) => sc.name === id)
    setSi(i); setSide(scenes[i].sections[0].items[0].id); setTab(scenes[i].tabs[0].id)
  }

  /* wall: it moves by itself */
  const latest = useRef(); latest.current = { all, data }
  useEffect(() => {
    if (!auto) return
    let k = 0
    const t = setInterval(() => {
      k++
      const L = latest.current
      if (k % 9 === 0) pickScene(scenes[(k / 9) % scenes.length].name)
      else if (k % 5 === 0) setCol((v) => !v)
      else { setSide(L.all[k % L.all.length].id); setTab(L.data.tabs[k % L.data.tabs.length].id) }
    }, 1100)
    return () => clearInterval(t)
  }, [auto]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ex nv-ex">
      <div className="nv-part">
        <h3 className="group-k">Sidebar · {col ? 'collapsed' : 'expanded'}</h3>
        <Sidebar key={si} sys={sys} title={data.title} sections={data.sections} value={side} onChange={setSide} collapsed={col} onToggle={() => setCol((v) => !v)} label={`${data.title} sidebar`} />
        {!auto && <p className="tb-status" aria-live="polite">{all.find((it) => it.id === side)?.note}</p>}
      </div>
      <div className="nv-part">
        <h3 className="group-k">Tab bar</h3>
        <TabBar key={si} sys={sys} items={data.tabs} value={tab} onChange={setTab} label={`${data.title} tabs`} />
        {!auto && <p className="tb-status" aria-live="polite">{data.tabs.find((t) => t.id === tab)?.label}</p>}
      </div>
      {!auto && (
        <div className="nv-part">
          <h3 className="group-k">Scenario · the same parts somewhere else</h3>
          <TabBar sys={sys} items={scenes.map((sc) => ({ id: sc.name, icon: sc.icon, label: sc.name }))} value={data.name} onChange={pickScene} label="Scenario" />
        </div>
      )}
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
]

const SETS = [
  {
    id: 'mf', tone: 'Matter-of-fact, Heads Up',
    about: 'Navigation that tells you what is there before you go, shown in mail, music and settings: point at an item and its slot says a little more ("12" becomes "12 unread").',
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
    ],
  },
  {
    id: 'ix', tone: 'Monumental, The Index',
    about: 'Navigation for an archive, a museum and a reading room, cut like carved lettering: heavy capitals, 3 rules, one bone block for where you are, and a rule that wipes in under the item you point at.',
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
          {head(1, 'Example', 'Pick items, collapse the sidebar with its top button, move tabs with the arrow keys, and switch the scenario below.')}
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
