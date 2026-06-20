// ui.jsx — theme tokens, context, and shared primitives for Cleared.
// Exports to window: ThemeCtx, makeTheme, Icon, Sym, StatusDot, Pill, Card,
//   SectionLabel, ProgressRail, Segmented, useNow

const ThemeCtx = React.createContext(null);

// Base palette is fixed (green-black canvas). accent + vibe come from tweaks.
function makeTheme({ accent, vibe }) {
  const dense = vibe === 'sharp';
  return {
    accent,
    vibe,
    dense,
    bg:       '#0b1310',
    bgTop:    '#0e1813',
    surface:  '#121b16',
    surface2: '#18241d',
    raised:   '#1d2a22',
    line:     'rgba(255,255,255,0.07)',
    lineSoft: 'rgba(255,255,255,0.045)',
    text:     '#eaf3ec',
    dim:      '#8ba095',
    faint:    '#5e7268',
    green:    '#3ddc84',
    amber:    '#f6c454',
    red:      '#ff6f61',
    // vibe-driven scale
    pad:      dense ? 14 : 20,
    gap:      dense ? 10 : 14,
    radius:   dense ? 14 : 22,
    radiusSm: dense ? 10 : 14,
    heroNum:  dense ? 52 : 64,
    rowGap:   dense ? 2 : 8,
    display:  "'Space Grotesk', sans-serif",
    body:     "'Manrope', sans-serif",
    mono:     "'JetBrains Mono', monospace",
  };
}
function useTheme() { return React.useContext(ThemeCtx); }

// Material Symbols glyph
function Sym({ name, size = 22, color, weight = 400, fill = 0, style }) {
  return (
    <span className="msym" style={{
      fontSize: size, color, lineHeight: 1, userSelect: 'none',
      fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
      ...style,
    }}>{name}</span>
  );
}

function StatusDot({ color, size = 8, pulse = false }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 99, background: color,
      display: 'inline-block', flexShrink: 0,
      boxShadow: pulse ? `0 0 0 0 ${color}` : 'none',
      animation: pulse ? 'cl-pulse 1.8s infinite' : 'none',
    }} />
  );
}

function Pill({ children, color, soft, t, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 99, background: soft,
      color, fontFamily: t.body, fontSize: 12.5, fontWeight: 700,
      letterSpacing: 0.2, lineHeight: 1, whiteSpace: 'nowrap', ...style,
    }}>{children}</span>
  );
}

function Card({ children, t, pad, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: t.surface, border: `1px solid ${t.line}`,
      borderRadius: t.radius, padding: pad == null ? t.pad : pad,
      boxSizing: 'border-box', ...style,
    }}>{children}</div>
  );
}

function SectionLabel({ children, t, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '0 2px 10px', }}>
      <span style={{
        fontFamily: t.mono, fontSize: 11, letterSpacing: 1.5,
        textTransform: 'uppercase', color: t.faint, fontWeight: 600 }}>{children}</span>
      {right && <span style={{ fontFamily: t.mono, fontSize: 11, color: t.faint }}>{right}</span>}
    </div>
  );
}

// segmented control (also used by tweaks fallbacks where handy)
function Segmented({ options, value, onChange, t }) {
  return (
    <div style={{
      display: 'flex', gap: 3, padding: 3, borderRadius: 99,
      background: t.surface2, border: `1px solid ${t.line}` }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            flex: 1, border: 'none', cursor: 'pointer', borderRadius: 99,
            padding: '8px 6px', fontFamily: t.body, fontSize: 12.5, fontWeight: 700,
            background: active ? t.accent : 'transparent',
            color: active ? '#06140d' : t.dim, transition: 'all .18s ease',
            whiteSpace: 'nowrap' }}>{o.label}</button>
        );
      })}
    </div>
  );
}

// live ticking clock (cosmetic) — anchored to trip "now", advances real-time
function useNow(startMin) {
  const [sec, setSec] = React.useState(0);
  React.useEffect(() => {
    const iv = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  return startMin + Math.floor(sec / 30); // gentle drift for liveness
}

Object.assign(window, {
  ThemeCtx, makeTheme, useTheme, Sym, StatusDot, Pill, Card,
  SectionLabel, Segmented, useNow,
});
