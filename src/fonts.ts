// Font choices for the text you type. The rest of the UI stays in Fira Code, like Ghostty.

export interface FontChoice {
  name: string;
  stack: string;
  scale: number; // some fonts look smaller at the same size, so nudge them up
  spacing: string; // extra space between words; mono fonts already have wide spaces
}

export const FONTS: FontChoice[] = [
  { name: 'Crimson Text', stack: "'Crimson Text', Georgia, serif", scale: 1.2, spacing: '0.15em' },
  { name: 'JetBrains Mono', stack: "'JetBrains Mono', ui-monospace, monospace", scale: 1, spacing: '0' },
  { name: 'Fira Code', stack: "'Fira Code', ui-monospace, monospace", scale: 1, spacing: '0' },
  { name: 'Lora', stack: "'Lora', Georgia, serif", scale: 1.05, spacing: '0.12em' },
  { name: 'Inter', stack: "'Inter', system-ui, sans-serif", scale: 1, spacing: '0.1em' },
];

const STORAGE_KEY = 'pt:font';

export function loadFont(): FontChoice {
  try {
    const name = localStorage.getItem(STORAGE_KEY);
    return FONTS.find((f) => f.name === name) ?? FONTS[0];
  } catch {
    return FONTS[0];
  }
}

// Applies the font and resolves once it has loaded, so letter positions can be re-measured.
export async function applyFont(font: FontChoice): Promise<void> {
  const root = document.documentElement.style;
  root.setProperty('--type-font', font.stack);
  root.setProperty('--type-scale', String(font.scale));
  root.setProperty('--type-spacing', font.spacing);
  try {
    localStorage.setItem(STORAGE_KEY, font.name);
  } catch {
    // Not saved (private window); the choice still applies for this visit.
  }
  await document.fonts.load(`1em '${font.name}'`).catch(() => undefined);
}
