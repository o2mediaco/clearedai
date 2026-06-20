// hero.jsx — the "Today" screen + 4 hero verdict explorations.
// Exports to window: TodayScreen

function DoorRibbon({ s, t }) {
  const { fmtTime } = window;
  const nodes = [
    { label: 'Leave',    time: fmtTime(s.leaveBy),  tz: 'PDT' },
    { label: 'Wheels up',time: fmtTime(s.depart),   tz: 'PDT' },
    { label: 'Land',     time: fmtTime(s.land),     tz: 'CST', day: '+1' },
    { label: 'Meeting',  time: fmtTime(s.meeting),  tz: 'CST', day: '+1' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '2px 2px 0' }}>
      {nodes.map((n, i) => (
        <div key={n.label} style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          {/* connector */}
          {i < nodes.length - 1 && (
            <div style={{ position: 'absolute', top: 5, left: '50%', right: '-50%',
              height: 2, background: t.line }} />
          )}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <span style={{ width: 12, height: 12, borderRadius: 99,
              background: i === 0 ? t.accent : t.surface2,
              border: `2px solid ${i === 0 ? t.accent : t.line}`,
              boxShadow: i === 0 ? `0 0 0 4px ${t.accent}22` : 'none' }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 9, padding: '0 2px' }}>
            <div style={{ fontFamily: t.mono, fontSize: 12.5, fontWeight: 600,
              color: t.text, whiteSpace: 'nowrap' }}>{n.time}</div>
            <div style={{ fontFamily: t.body, fontSize: 10.5, color: t.faint, marginTop: 2 }}>
              {n.label}{n.day ? ` ·${n.day}d` : ''}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── HERO VARIANTS ──────────────────────────────────────────────────────
function HeroVerdict({ s, t }) {
  const { fmtTime, fmtDur } = window;
  const made = s.buffer >= 0;
  return (
    <div>
      <div style={{ display: 'inline-flex' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '6px 12px', borderRadius: 99, background: s.status.soft, color: s.status.color,
          fontFamily: t.body, fontWeight: 700, fontSize: 13 }}>
          <StatusDot color={s.status.color} pulse /> {s.status.label}
        </span>
      </div>
      <div style={{ fontFamily: t.display, fontWeight: 600, color: t.text,
        fontSize: t.dense ? 30 : 34, lineHeight: 1.08, letterSpacing: -0.5,
        marginTop: 16, textWrap: 'balance' }}>
        {made ? 'You’ll make your' : 'You may miss your'}<br/>
        <span style={{ color: s.status.color }}>2:00 PM meeting.</span>
      </div>
      <div style={{ display: 'flex', gap: 22, marginTop: 18 }}>
        <div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, letterSpacing: 1, textTransform: 'uppercase' }}>Arrive</div>
          <div style={{ fontFamily: t.display, fontSize: 26, fontWeight: 600, color: t.text, marginTop: 3 }}>{fmtTime(s.arrive)}</div>
        </div>
        <div style={{ width: 1, background: t.line }} />
        <div>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, letterSpacing: 1, textTransform: 'uppercase' }}>Buffer</div>
          <div style={{ fontFamily: t.display, fontSize: 26, fontWeight: 600, color: s.status.color, marginTop: 3 }}>
            {s.buffer < 0 ? `−${fmtDur(-s.buffer)}` : fmtDur(s.buffer)}</div>
        </div>
      </div>
    </div>
  );
}

function HeroLeaveBy({ s, t }) {
  const { fmtTime } = window;
  const [hh, ap] = fmtTime(s.leaveBy).split(' ');
  return (
    <div>
      <div style={{ fontFamily: t.mono, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase',
        color: t.faint }}>Leave home by</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <span style={{ fontFamily: t.display, fontWeight: 600, fontSize: t.heroNum + 8,
          lineHeight: 0.9, color: t.text, letterSpacing: -2 }}>{hh}</span>
        <span style={{ fontFamily: t.display, fontWeight: 500, fontSize: 24, color: t.dim }}>{ap}</span>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 16,
        padding: '6px 12px', borderRadius: 99, background: s.status.soft, color: s.status.color,
        fontFamily: t.body, fontWeight: 700, fontSize: 13 }}>
        <StatusDot color={s.status.color} pulse /> {s.status.label} · arrive {fmtTime(s.arrive)} Shanghai
      </div>
    </div>
  );
}

function HeroCountdown({ s, t, now }) {
  const { fmtTime } = window;
  const mins = s.leaveBy - now;
  const neg = mins < 0;
  return (
    <div>
      <div style={{ fontFamily: t.mono, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase',
        color: t.faint }}>{neg ? 'You should have left' : 'Leave in'}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
        <span style={{ fontFamily: t.display, fontWeight: 600, fontSize: t.heroNum + 16,
          lineHeight: 0.9, color: neg ? t.red : t.accent, letterSpacing: -2 }}>{Math.abs(mins)}</span>
        <span style={{ fontFamily: t.display, fontWeight: 500, fontSize: 22, color: t.dim }}>min</span>
      </div>
      <div style={{ fontFamily: t.body, fontSize: 14, color: t.dim, marginTop: 14 }}>
        Order your Uber by <span style={{ color: t.text, fontWeight: 700 }}>{fmtTime(s.leaveBy)}</span> to land
        in time for your <span style={{ color: t.text, fontWeight: 700 }}>2:00 PM</span> meeting.</div>
    </div>
  );
}

function HeroGo({ s, t }) {
  const { fmtTime, fmtDur } = window;
  const word = s.status.id === 'ontrack' ? 'GO'
    : s.status.id === 'tight' ? 'TIGHT'
    : s.status.id === 'risk' ? 'RISK' : 'LATE';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ flexShrink: 0, width: 96, height: 96, borderRadius: 24,
        background: s.status.soft, border: `1.5px solid ${s.status.color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: t.display, fontWeight: 700, fontSize: word.length > 2 ? 22 : 34,
          color: s.status.color, letterSpacing: 0.5 }}>{word}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: t.display, fontSize: 22, fontWeight: 600, color: t.text, lineHeight: 1.1 }}>
          {s.buffer < 0 ? 'No buffer left' : `${fmtDur(s.buffer)} to spare`}</div>
        <div style={{ fontFamily: t.body, fontSize: 13.5, color: t.dim, marginTop: 6 }}>
          Leave {fmtTime(s.leaveBy)} · land {fmtTime(s.land)} · arrive {fmtTime(s.arrive)} for your 2:00 PM</div>
      </div>
    </div>
  );
}

function TodayScreen({ s, t, heroStyle, now, go }) {
  const { fmtTime, TRIP } = window;
  const Hero = { verdict: HeroVerdict, leaveby: HeroLeaveBy, countdown: HeroCountdown, go: HeroGo }[heroStyle] || HeroVerdict;
  return (
    <div style={{ padding: `8px ${t.pad}px 28px`, display: 'flex', flexDirection: 'column', gap: t.gap }}>
      {/* trip identity */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontFamily: t.mono, fontSize: 14, fontWeight: 600, color: t.text }}>SFO</span>
          <Sym name="trending_flat" size={18} color={t.faint} />
          <span style={{ fontFamily: t.mono, fontSize: 14, fontWeight: 600, color: t.text }}>PVG</span>
          <span style={{ fontFamily: t.body, fontSize: 12.5, color: t.faint, marginLeft: 4 }}>· Today</span>
        </div>
        <span style={{ fontFamily: t.mono, fontSize: 12, color: t.dim }}>{fmtTime(now)}</span>
      </div>

      {/* hero card */}
      <div style={{ background: `linear-gradient(160deg, ${t.surface2}, ${t.surface})`,
        border: `1px solid ${t.line}`, borderRadius: t.radius + 4, padding: t.pad + 4 }}>
        <Hero s={s} t={t} now={now} />
      </div>

      {/* door ribbon */}
      <Card t={t} pad={t.pad}>
        <SectionLabel t={t} right="door to door">Journey</SectionLabel>
        <DoorRibbon s={s} t={t} />
      </Card>

      {/* next action */}
      <div style={{ display: 'flex', gap: t.gap }}>
        <button onClick={() => go('live')} style={{ flex: 1, textAlign: 'left', cursor: 'pointer',
          background: t.accent, border: 'none', borderRadius: t.radius, padding: t.pad,
          display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sym name="local_taxi" size={26} color="#06140d" fill={1} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: t.body, fontWeight: 800, fontSize: 15, color: '#06140d' }}>Order Uber</div>
            <div style={{ fontFamily: t.body, fontSize: 12, color: '#0a2c1c' }}>by {fmtTime(s.leaveBy)} · 4 min away</div>
          </div>
          <Sym name="arrow_forward" size={20} color="#06140d" />
        </button>
        <button onClick={() => go('timeline')} style={{ width: 56, cursor: 'pointer',
          background: t.surface, border: `1px solid ${t.line}`, borderRadius: t.radius,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sym name="checklist" size={24} color={t.dim} />
        </button>
      </div>

      {/* meeting card */}
      <Card t={t}>
        <SectionLabel t={t} right="destination">Why this matters</SectionLabel>
        <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: t.surface2,
            border: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sym name="event" size={22} color={t.accent} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: t.body, fontWeight: 700, fontSize: 15, color: t.text }}>{TRIP.MEETING.title}</div>
            <div style={{ fontFamily: t.body, fontSize: 12.5, color: t.dim, marginTop: 2 }}>
              {TRIP.MEETING.org} · {TRIP.MEETING.place}</div>
            <div style={{ fontFamily: t.mono, fontSize: 12.5, color: t.text, marginTop: 8 }}>
              2:00 PM CST <span style={{ color: t.faint }}>· tomorrow</span></div>
          </div>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { TodayScreen });
