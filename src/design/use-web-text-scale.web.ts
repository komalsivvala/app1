/**
 * The web export has no OS text-size setting, so nothing scales there. This
 * stand-in reads a multiplier from localStorage (`aplld.textScale`, 1–3) once
 * per load; the screenshot matrix sets it to 2 to render every screen at 200%
 * the way a phone would. It is not a user-facing preference — the app respects
 * the OS setting on devices, and nothing else.
 */
const KEY = 'aplld.textScale';

function read(): number {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const n = raw === null || raw === undefined ? 1 : Number(raw);
    return Number.isFinite(n) && n >= 1 && n <= 3 ? n : 1;
  } catch {
    return 1;
  }
}

const SCALE = read();

export function useWebTextScale(): number {
  return SCALE;
}
