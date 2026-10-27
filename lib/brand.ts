/**
 * KiraayaSense brand tokens — lifted from the approved "Key & Trust badge"
 * logo direction. These now resolve through the CSS custom properties
 * defined in app/globals.css, which flip between the dark (default) and
 * light palettes based on the `data-theme` attribute set by
 * lib/themeContext.tsx — so every component that imports `brand` re-themes
 * automatically with no per-component changes needed.
 */
export const brand = {
  navy: "var(--ks-bg)", // primary background
  navyMuted: "var(--ks-text-muted)", // secondary text
  coral: "var(--ks-coral)", // gradient stop 1 / primary accent
  magenta: "var(--ks-magenta)", // gradient stop 2 / secondary accent
  white: "var(--ks-text)", // primary text
  success: "var(--ks-success)", // verified / approved states
  danger: "var(--ks-danger)", // errors, required-field states
  warn: "var(--ks-warn)", // mid-range rating badge
} as const;

export const brandGradient = `linear-gradient(90deg, ${brand.coral}, ${brand.magenta})`;
