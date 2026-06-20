// timeline.jsx — leg-by-leg Timeline screen + Live status/notifications screen.
// Exports to window: TimelineScreen, LiveScreen

// ── a single leg row (expandable to show data provenance) ──────────────
function LegRow({ leg, t, color, changed, expanded, onToggle, last }) {
  const { fmtTime, fmtDur } = window;
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {/* rail */}
      <div style={{ width: 28, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: t.surface2,
          border: `1px solid ${changed ? t.amber : t.line}`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sym name={leg.icon} size={17} color={changed ? t.amber : color} />
        </div>
        {!last && <div style={{ flex: 1, width: 2, background: t.line, marginTop: 2, minHeight: 14 }} />}
      </div>
      {/* body */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: t.dense ? 12 : 16 }}>
        <div onClick={onToggle} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: t.body, fontWeight: 700, fontSize: 14.5, color: t.text }}>{leg.title}</span>
              {leg.live && <StatusDot color={changed ? t.amber : t.green} size={6} pulse />}
            </div>
            <div style={{ fontFamily: t.body, fontSize: 12, color: t.dim, marginTop: 2, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leg.sub}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: t.mono, fontSize: 13, color: t.text, fontWeight: 600 }}>{fmtDur(leg.dur)}</div>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginTop: 2 }}>{fmtTime(leg.start)}</div>
          </div>
        </div>
        {expanded && (
          <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: t.bg,
            border: `1px solid ${t.lineSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <Sym name="cell_tower" size={14} color={t.accent} />
              <span style={{ fontFamily: t.mono, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase',
                color: t.faint }}>Source · {leg.source}</span>
            </div>
            <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, lineHeight: 1.45 }}>{leg.detail}</div>
            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginTop: 8 }}>
              {fmtTime(leg.start)} → {fmtTime(leg.end)}{leg.day ? ' · +1 day' : ''}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseHeader({ icon, city, tz, sub, t, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '4px 0 14px' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: color + '1c',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sym name={icon} size={19} color={color} fill={1} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: t.display, fontWeight: 600, fontSize: 17, color: t.text }}>{city}</div>
        <div style={{ fontFamily: t.body, fontSize: 11.5, color: t.faint }}>{sub}</div>
      </div>
      <span style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, padding: '4px 8px',
        border: `1px solid ${t.line}`, borderRadius: 7 }}>{tz}</span>
    </div>
  );
}

function FlightBlock({ f, t, changed }) {
  const { fmtTime, fmtDur } = window;
  return (
    <div style={{ margin: '2px 0 18px', marginLeft: 42 }}>
      <div style={{ background: `linear-gradient(150deg, ${t.raised}, ${t.surface})`,
        border: `1px solid ${changed ? t.amber + '55' : t.line}`, borderRadius: 16, padding: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sym name="flight" size={18} color={t.accent} fill={1} style={{ transform: 'rotate(45deg)' }} />
            <span style={{ fontFamily: t.mono, fontWeight: 600, fontSize: 13, color: t.text }}>{f.carrier} {f.code}</span>
          </div>
          {changed
            ? <Pill t={t} color={t.amber} soft={t.amber + '22'}>Delayed {f.delay}m</Pill>
            : <Pill t={t} color={t.green} soft={t.green + '1e'}>On time</Pill>}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: t.display, fontWeight: 600, fontSize: 22, color: t.text, whiteSpace: 'nowrap' }}>{fmtTime(f.start)}</div>
            <div style={{ fontFamily: t.mono, fontSize: 12, color: t.dim, marginTop: 2 }}>{f.from} · {f.termFrom}</div>
            <div style={{ fontFamily: t.body, fontSize: 10.5, color: t.faint }}>San Francisco · PDT</div>
          </div>
          <div style={{ flex: 1, padding: '0 12px', textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.faint }}>{fmtDur(f.dur)}</div>
            <div style={{ position: 'relative', height: 2, background: t.line, margin: '6px 0' }}>
              <span style={{ position: 'absolute', right: -2, top: -3, width: 8, height: 8, borderRadius: 99, background: t.accent }} />
            </div>
            <div style={{ fontFamily: t.mono, fontSize: 10, color: t.faint }}>seat {f.seat}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: t.display, fontWeight: 600, fontSize: 22, color: t.text, whiteSpace: 'nowrap' }}>{fmtTime(f.end)}</div>
            <div style={{ fontFamily: t.mono, fontSize: 12, color: t.dim, marginTop: 2 }}>{f.to} · {f.termTo}</div>
            <div style={{ fontFamily: t.body, fontSize: 10.5, color: t.faint }}>Shanghai · CST · +1 day</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineScreen({ s, t, changedSet }) {
  const { fmtTime, fmtDur, TRIP } = window;
  const [open, setOpen] = React.useState(null);
  const toggle = (id) => setOpen(open === id ? null : id);
  return (
    <div style={{ padding: `12px ${t.pad}px 30px` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: t.display, fontWeight: 600, fontSize: 21, color: t.text }}>Door to door</div>
          <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim }}>
            Leave {fmtTime(s.leaveBy)} → arrive {fmtTime(s.arrive)} · {s.buffer < 0 ? `${fmtDur(-s.buffer)} late` : `${fmtDur(s.buffer)} buffer`}</div>
        </div>
        <Pill t={t} color={s.status.color} soft={s.status.soft}><StatusDot color={s.status.color} /> {fmtDur(Math.abs(s.buffer))}</Pill>
      </div>

      <PhaseHeader icon="flight_takeoff" city="San Francisco" tz="PDT" sub="Today · depart side" t={t} color={t.accent} />
      {s.preLegs.map((leg, i) => (
        <LegRow key={leg.id} leg={leg} t={t} color={t.accent} changed={changedSet.has(leg.id)}
          expanded={open === leg.id} onToggle={() => toggle(leg.id)} last={false} />
      ))}

      <FlightBlock f={s.flightLeg} t={t} changed={changedSet.has('flight')} />

      <PhaseHeader icon="flight_land" city="Shanghai" tz="CST · +1" sub="Tomorrow · arrival side" t={t} color="#b794f6" />
      {s.postLegs.map((leg, i) => (
        <LegRow key={leg.id} leg={leg} t={t} color="#b794f6" changed={changedSet.has(leg.id)}
          expanded={open === leg.id} onToggle={() => toggle(leg.id)} last={false} />
      ))}

      {/* arrival / meeting terminus */}
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ width: 28, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: s.status.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sym name="flag" size={17} color="#06140d" fill={1} />
          </div>
        </div>
        <div style={{ flex: 1, background: s.status.soft, border: `1px solid ${s.status.color}44`,
          borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: t.body, fontWeight: 700, fontSize: 14.5, color: t.text }}>Arrive at meeting</span>
            <span style={{ fontFamily: t.display, fontWeight: 600, fontSize: 20, color: s.status.color }}>{fmtTime(s.arrive)}</span>
          </div>
          <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, marginTop: 4 }}>
            {TRIP.MEETING.title} · 2:00 PM · {s.buffer < 0 ? `${fmtDur(-s.buffer)} late` : `${fmtDur(s.buffer)} to spare`}</div>
        </div>
      </div>
    </div>
  );
}

// ── LIVE screen: monitored feeds + push-style event notifications ───────
function LiveScreen({ s, t, fired, setFired, impacts, go }) {
  const { fmtTime, fmtDur, TRIP } = window;
  const watching = [
    { icon: 'flight', label: 'UA857 status', src: 'United / FlightAware' },
    { icon: 'security', label: 'SFO security wait', src: 'TSA feed' },
    { icon: 'fingerprint', label: 'PVG immigration', src: 'Airport queue' },
    { icon: 'directions_car', label: 'Shanghai traffic', src: 'AMap' },
  ];
  const events = TRIP.EVENTS;
  return (
    <div style={{ padding: `12px ${t.pad}px 30px`, display: 'flex', flexDirection: 'column', gap: t.gap }}>
      {/* live verdict banner */}
      <div style={{ background: `linear-gradient(150deg, ${t.surface2}, ${t.surface})`,
        border: `1px solid ${s.status.color}44`, borderRadius: t.radius, padding: t.pad }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: t.body,
            fontWeight: 700, fontSize: 13, color: s.status.color }}>
            <StatusDot color={s.status.color} pulse /> {s.status.label}</span>
          <span style={{ fontFamily: t.mono, fontSize: 11, color: t.faint }}>auto-updating</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
          <span style={{ fontFamily: t.display, fontWeight: 600, fontSize: 38, color: t.text, letterSpacing: -1 }}>
            {s.buffer < 0 ? `−${fmtDur(-s.buffer)}` : fmtDur(s.buffer)}</span>
          <span style={{ fontFamily: t.body, fontSize: 13, color: t.dim }}>buffer · arrive {fmtTime(s.arrive)}</span>
        </div>
      </div>

      {/* monitored feeds */}
      <Card t={t}>
        <SectionLabel t={t} right={`${watching.length} feeds`}>Watching for you</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          {watching.map((w) => (
            <div key={w.label} style={{ display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 10px', borderRadius: 12, background: t.surface2, border: `1px solid ${t.lineSoft}` }}>
              <Sym name={w.icon} size={18} color={t.accent} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: t.body, fontWeight: 700, fontSize: 12, color: t.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.label}</div>
                <div style={{ fontFamily: t.mono, fontSize: 9.5, color: t.faint }}>{w.src}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* notification feed */}
      <div>
        <SectionLabel t={t} right={fired > 0 ? `${fired} alert${fired > 1 ? 's' : ''}` : 'all quiet'}>Updates</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fired === 0 && (
            <div style={{ padding: 22, textAlign: 'center', borderRadius: t.radius,
              border: `1px dashed ${t.line}`, background: t.surface }}>
              <Sym name="notifications_active" size={26} color={t.faint} />
              <div style={{ fontFamily: t.body, fontSize: 13, color: t.dim, marginTop: 8 }}>
                No disruptions yet. We’ll ping you the moment a wait, delay, or traffic jam threatens your 2:00 PM.</div>
            </div>
          )}
          {events.slice(0, fired).map((e, i) => {
            const imp = impacts[i];
            const drop = imp.after < imp.before;
            return (
              <div key={e.id} style={{ background: t.surface, border: `1px solid ${t.line}`,
                borderRadius: t.radius, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: t.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sym name="bolt" size={15} color="#06140d" fill={1} />
                  </div>
                  <span style={{ fontFamily: t.body, fontWeight: 800, fontSize: 11.5, color: t.text }}>Cleared</span>
                  <span style={{ fontFamily: t.mono, fontSize: 10.5, color: t.faint, marginLeft: 'auto' }}>{e.time}</span>
                </div>
                <div style={{ fontFamily: t.body, fontWeight: 700, fontSize: 14.5, color: t.text }}>{e.title}</div>
                <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, marginTop: 3, lineHeight: 1.45 }}>{e.body}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11,
                  paddingTop: 11, borderTop: `1px solid ${t.lineSoft}` }}>
                  <Sym name={drop ? 'south_east' : 'north_east'} size={16} color={drop ? t.red : t.green} />
                  <span style={{ fontFamily: t.mono, fontSize: 12, color: t.dim }}>Buffer</span>
                  <span style={{ fontFamily: t.mono, fontSize: 12.5, color: t.faint, textDecoration: 'line-through' }}>
                    {imp.before < 0 ? `−${Math.abs(imp.before)}` : imp.before}m</span>
                  <Sym name="arrow_forward" size={13} color={t.faint} />
                  <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: imp.color }}>
                    {imp.after < 0 ? `−${Math.abs(imp.after)}` : imp.after}m</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* simulate control */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {fired < events.length ? (
            <button onClick={() => setFired(fired + 1)} style={{ flex: 1, cursor: 'pointer',
              background: t.accent, border: 'none', borderRadius: 99, padding: '13px',
              fontFamily: t.body, fontWeight: 800, fontSize: 14, color: '#06140d',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Sym name="play_arrow" size={20} color="#06140d" fill={1} /> Simulate next update
            </button>
          ) : (
            <button onClick={() => go('timeline')} style={{ flex: 1, cursor: 'pointer',
              background: t.accent, border: 'none', borderRadius: 99, padding: '13px',
              fontFamily: t.body, fontWeight: 800, fontSize: 14, color: '#06140d' }}>
              See updated timeline
            </button>
          )}
          {fired > 0 && (
            <button onClick={() => setFired(0)} style={{ width: 52, cursor: 'pointer',
              background: t.surface, border: `1px solid ${t.line}`, borderRadius: 99,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sym name="restart_alt" size={20} color={t.dim} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TimelineScreen, LiveScreen });
