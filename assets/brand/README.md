# Brand assets

The mark is a learner plate: a red **L** on white. Nothing else — no emblem,
seal, lion, wheel, map outline or tricolour, because the app is not a
government product and must not look like one (PRD §9, plan Day 24 icon audit).

Colours: plate red `#C8102E`, white `#FFFFFF`. The L is drawn as a path, so no
font is involved.

`npm run brand:assets` renders every SVG here to the PNGs in `assets/images/`
with Chromium (Playwright). Edit the SVGs, never the PNGs.

| SVG | PNG | Size | Used by |
|---|---|---|---|
| `icon.svg` | `icon.png` | 1024 | iOS icon, Play listing icon (`expo.icon`) |
| `adaptive-foreground.svg` | `android-icon-foreground.png` | 1024 | Android adaptive icon, inside the 66% safe zone |
| `adaptive-background.svg` | `android-icon-background.png` | 1024 | Android adaptive icon background |
| `adaptive-monochrome.svg` | `android-icon-monochrome.png` | 1024 | Android 13+ themed icon (alpha only) |
| `splash-icon.svg` | `splash-icon.png` | 512 | `expo-splash-screen`, drawn 120 dp wide |
| `icon.svg` | `favicon.png` | 48 | web |
