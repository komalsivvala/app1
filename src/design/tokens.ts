/**
 * Design tokens — the exact values from docs/03-UIUX-Design.md §2.
 *
 * Every colour pair is asserted against WCAG AA in src/design/__tests__ —
 * both foreground-on-`bg` AND text-on-fill (`accent.on` etc.). The second set
 * is the one that is easy to get wrong: white on the dark-mode accent is 3.43:1
 * and fails, which is why `on` is a token and not an assumption.
 *
 * Near-monochrome plus ONE accent. Colour carries meaning only: green =
 * correct, red = incorrect, accent = the single primary action on screen.
 */

export interface Palette {
  readonly bg: string;
  readonly surface: string;
  readonly border: string;
  readonly text: { readonly primary: string; readonly secondary: string };
  readonly accent: { readonly fill: string; readonly on: string };
  readonly success: { readonly fill: string; readonly on: string };
  readonly danger: { readonly fill: string; readonly on: string };
}

export const light: Palette = {
  bg: '#FFFFFF',
  surface: '#F7F7F8',
  border: '#E5E5E7',
  text: { primary: '#111113', secondary: '#6B6B70' },
  accent: { fill: '#2B5FD9', on: '#FFFFFF' },
  success: { fill: '#0F7A45', on: '#FFFFFF' },
  danger: { fill: '#C42B2B', on: '#FFFFFF' },
};

/** Designed, not inverted: accents lighten so they don't glare on near-black,
 *  which means labels on them must DARKEN, not stay white. */
export const dark: Palette = {
  bg: '#0B0B0D',
  surface: '#151517',
  border: '#26262A',
  text: { primary: '#F2F2F3', secondary: '#9A9AA0' },
  accent: { fill: '#5B85F5', on: '#0B0B0D' },
  success: { fill: '#3DBA7A', on: '#0B0B0D' },
  danger: { fill: '#F06A6A', on: '#0B0B0D' },
};

export const palettes = { light, dark } as const;
export type Scheme = keyof typeof palettes;

/** 4 · 8 · 12 · 16 · 24 · 32 · 48. Screen gutter 20. Nothing off-scale
 *  except hairlines and the timer bar, which are measured in device pixels. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, gutter: 20 } as const;

export const radius = { sm: 8, md: 12, lg: 16, full: 999 } as const;

/** Fast and purposeful. Nothing bounces. */
export const motion = {
  micro: 150,
  transition: 220,
  easing: [0.2, 0, 0, 1] as const, // cubic-bezier(0.2, 0, 0, 1)
} as const;

/** Minimum tap target; option rows are 56. */
export const touch = { min: 48, optionRow: 56, button: 56 } as const;

/** Content max-width on tablets — one column, never a wall of text. */
export const layout = { maxContentWidth: 560 } as const;
