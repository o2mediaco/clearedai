"use client";
// ui.tsx — theme tokens + shared visual primitives (ported from the prototype).

import React from "react";

export function makeTheme({ accent, vibe }: { accent: string; vibe: "calm" | "sharp" }) {
  const dense = vibe === "sharp";
  return {
    accent,
    vibe,
    dense,
    bg: "#0b1310",
    bgTop: "#0e1813",
    surface: "#121b16",
    surface2: "#18241d",
    raised: "#1d2a22",
    line: "rgba(255,255,255,0.07)",
    lineSoft: "rgba(255,255,255,0.045)",
    text: "#eaf3ec",
    dim: "#8ba095",
    faint: "#5e7268",
    green: "#3ddc84",
    amber: "#f6c454",
    red: "#ff6f61",
    pad: dense ? 14 : 20,
    gap: dense ? 10 : 14,
    radius: dense ? 14 : 22,
    radiusSm: dense ? 10 : 14,
    heroNum: dense ? 52 : 64,
    rowGap: dense ? 2 : 8,
    display: "'Space Grotesk', sans-serif",
    body: "'Manrope', sans-serif",
    mono: "'JetBrains Mono', monospace",
  };
}

export type Theme = ReturnType<typeof makeTheme>;

export function Sym({
  name,
  size = 22,
  color,
  weight = 400,
  fill = 0,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  weight?: number;
  fill?: number;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="msym"
      style={{
        fontSize: size,
        color,
        lineHeight: 1,
        userSelect: "none",
        fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}

export function StatusDot({ color, size = 8, pulse = false }: { color: string; size?: number; pulse?: boolean }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        background: color,
        display: "inline-block",
        flexShrink: 0,
        boxShadow: pulse ? `0 0 0 0 ${color}` : "none",
        animation: pulse ? "cl-pulse 1.8s infinite" : "none",
      }}
    />
  );
}

export function Pill({
  children,
  color,
  soft,
  t,
  style,
}: {
  children: React.ReactNode;
  color: string;
  soft: string;
  t: Theme;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 99,
        background: soft,
        color,
        fontFamily: t.body,
        fontSize: 12.5,
        fontWeight: 700,
        letterSpacing: 0.2,
        lineHeight: 1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  t,
  pad,
  style,
  onClick,
}: {
  children: React.ReactNode;
  t: Theme;
  pad?: number;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: t.surface,
        border: `1px solid ${t.line}`,
        borderRadius: t.radius,
        padding: pad == null ? t.pad : pad,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, t, right }: { children: React.ReactNode; t: Theme; right?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 2px 10px" }}>
      <span
        style={{
          fontFamily: t.mono,
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: t.faint,
          fontWeight: 600,
        }}
      >
        {children}
      </span>
      {right && <span style={{ fontFamily: t.mono, fontSize: 11, color: t.faint }}>{right}</span>}
    </div>
  );
}
