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
    fontFamily: 'inherit',
    className: '',
    category: 'sans',
    sampleText: 'Cosmic Starlight & Celestial Thoughts',
  },
  {
    id: 'Bentos Script',
    name: 'Bentos Script',
    fontFamily: 'Bentos Script',
    className: 'font-bentos',
    category: 'script',
    sampleText: 'Bentos Script — expressive handwritten wonder',
  },
  {
    id: 'Flywheel',
    name: 'Flywheel',
    fontFamily: 'Flywheel',
    className: 'font-flywheel',
    category: 'script',
    sampleText: 'Flywheel — smooth cosmic curves & dancing baseline',
  },
  {
    id: 'Stars',
    name: 'Stars',
    fontFamily: 'Stars',
    className: 'font-stars',
    category: 'decorative',
    sampleText: 'STARS — CELESTIAL MAJESTY & ANCIENT AURA',
  },
  {
    id: 'Daisy Script',
    name: 'Daisy Script',
    fontFamily: 'Daisy Script',
    className: 'font-daisy',
    category: 'script',
    sampleText: 'Daisy Script — delicate poetry & starlit whispers',
  },
  {
    id: 'Earwig Factory',
    name: 'Earwig Factory',
    fontFamily: 'Earwig Factory',
    className: 'font-earwig',
    category: 'display',
    sampleText: 'Earwig Factory — bold interstellar collage signal',
  },
  {
    id: 'Glamorous',
    name: 'Glamorous',
    fontFamily: 'Glamorous',
    className: 'font-glamorous',
    category: 'script',
    sampleText: 'Glamorous — radiant luxury & elegant calligraphy',
  },
];

/**
 * Returns the CSS utility class corresponding to a font ID or family name.
 */
export function getFontFamilyClass(fontFamilyOrId?: string): string {
  if (!fontFamilyOrId || fontFamilyOrId === 'default' || fontFamilyOrId === 'inherit') return '';
  const normalized = fontFamilyOrId.trim().toLowerCase();
  const found = CUSTOM_FONTS.find(
    (f) =>
      f.id.toLowerCase() === normalized ||
      f.name.toLowerCase() === normalized ||
      f.fontFamily.toLowerCase() === normalized
  );
  return found ? found.className : '';
}

/**
 * Returns the CSS font-family string value for inline styling with fallbacks.
 */
export function getFontFamilyStyle(fontFamilyOrId?: string): string {
  if (!fontFamilyOrId || fontFamilyOrId === 'default' || fontFamilyOrId === 'inherit') {
    return 'inherit';
  }
  const normalized = fontFamilyOrId.trim();
  // Check if it's one of our defined custom fonts
  const found = CUSTOM_FONTS.find(
    (f) =>
      f.id.toLowerCase() === normalized.toLowerCase() ||
      f.name.toLowerCase() === normalized.toLowerCase() ||
      f.fontFamily.toLowerCase() === normalized.toLowerCase()
  );
  const targetFamily = found && found.id !== 'default' ? found.fontFamily : normalized;
  return `'${targetFamily}', cursive, sans-serif`;
}

