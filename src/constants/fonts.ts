export interface FontOption {
  id: string;
  name: string;
  fontFamily: string;
  className: string;
  category: 'script' | 'display' | 'decorative' | 'serif' | 'sans';
  sampleText: string;
}

export const CUSTOM_FONTS: FontOption[] = [
  {
    id: 'default',
    name: 'Modern Sans (Plus Jakarta)',
    fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    className: '',
    category: 'sans',
    sampleText: 'Cosmic Starlight & Celestial Thoughts',
  },
  {
    id: 'bentos',
    name: 'Bentos Script',
    fontFamily: '"Bentos Script", "Caveat", cursive, sans-serif',
    className: 'font-bentos',
    category: 'script',
    sampleText: 'Bentos Script — expressive handwritten wonder',
  },
  {
    id: 'flywheel',
    name: 'Flywheel',
    fontFamily: '"Flywheel", "Pacifico", cursive, sans-serif',
    className: 'font-flywheel',
    category: 'script',
    sampleText: 'Flywheel — smooth cosmic curves & dancing baseline',
  },
  {
    id: 'stars',
    name: 'Stars',
    fontFamily: '"Stars", "Cinzel Decorative", "Cinzel", Georgia, serif',
    className: 'font-stars',
    category: 'decorative',
    sampleText: 'STARS — CELESTIAL MAJESTY & ANCIENT AURA',
  },
  {
    id: 'daisy',
    name: 'Daisy Script',
    fontFamily: '"Daisy Script", "Marck Script", cursive, sans-serif',
    className: 'font-daisy',
    category: 'script',
    sampleText: 'Daisy Script — delicate poetry & starlit whispers',
  },
  {
    id: 'earwig',
    name: 'Earwig Factory',
    fontFamily: '"Earwig Factory", "Special Elite", monospace, sans-serif',
    className: 'font-earwig',
    category: 'display',
    sampleText: 'Earwig Factory — bold interstellar collage signal',
  },
  {
    id: 'glamorous',
    name: 'Glamorous',
    fontFamily: '"Glamorous", "Great Vibes", "Playfair Display", cursive, serif',
    className: 'font-glamorous',
    category: 'script',
    sampleText: 'Glamorous — radiant luxury & elegant calligraphy',
  },
];

/**
 * Returns the CSS utility class corresponding to a font ID or family name.
 */
export function getFontFamilyClass(fontFamilyOrId?: string): string {
  if (!fontFamilyOrId || fontFamilyOrId === 'default') return '';
  const found = CUSTOM_FONTS.find(
    (f) =>
      f.id === fontFamilyOrId ||
      f.name.toLowerCase() === fontFamilyOrId.toLowerCase() ||
      f.fontFamily === fontFamilyOrId
  );
  return found ? found.className : '';
}

/**
 * Returns the CSS font-family string value for inline styling if needed.
 */
export function getFontFamilyStyle(fontFamilyOrId?: string): string | undefined {
  if (!fontFamilyOrId || fontFamilyOrId === 'default') return undefined;
  const found = CUSTOM_FONTS.find(
    (f) =>
      f.id === fontFamilyOrId ||
      f.name.toLowerCase() === fontFamilyOrId.toLowerCase() ||
      f.fontFamily === fontFamilyOrId
  );
  return found ? found.fontFamily : undefined;
}
