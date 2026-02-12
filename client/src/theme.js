export const T = {
  // Colors
  bg: '#09090b',
  surface: '#131316',
  elevated: '#1a1a1f',
  border: '#27272a',
  text: '#a1a1aa',
  textBright: '#fafafa',
  accent: '#fff',
  accentColor: '#0af',
  gold: '#eab308',
  danger: '#ef4444',
  success: '#22c55e',
  muted: '#71717a',
  nodeColors: { scene: '#4a9eff', choice: '#ff9f43', condition: '#a55eea' },

  // Typography
  font: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
  fontSize: { xs: 11, sm: 13, base: 14, md: 16, lg: 20, xl: 30 },
  leading: { tight: 1.25, snug: 1.375, normal: 1.5, relaxed: 1.625 },
  tracking: { tighter: '-0.02em', tight: '-0.01em', normal: '0', wide: '0.025em', wider: '0.05em', widest: '0.1em' },
  weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },

  // Spacing — Fibonacci-inspired: 2 4 6 8 12 16 24 32 48 64
  sp: [0, 2, 4, 6, 8, 12, 16, 24, 32, 48, 64],

  // Layout
  radius: { sm: 4, md: 6, lg: 8, xl: 12 },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 2px 8px rgba(0,0,0,0.4)',
    lg: '0 8px 24px rgba(0,0,0,0.5)',
  },
}
