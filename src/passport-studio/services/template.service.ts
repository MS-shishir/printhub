import { PassportTemplate, PaperSize } from '../types/passport-types';
import templatesJson from '../templates/templates.json';

// ── Template Registry ──────────────────────────────────────────────────────
// Loaded from JSON. Add templates by editing templates.json — no code change needed.
const templateRegistry: Map<string, PassportTemplate> = new Map(
  (templatesJson as PassportTemplate[]).map((t) => [t.id, t])
);

export function getTemplate(id: string, customW?: number, customH?: number): PassportTemplate {
  const base = templateRegistry.get(id) ?? templateRegistry.get('bd_pp')!;
  if (id === 'custom') {
    const w = customW || 40;
    const h = customH || 50;
    return {
      ...base,
      id: 'custom',
      name: `Custom (${w}×${h}mm)`,
      widthMm: w,
      heightMm: h,
      aspectRatio: w / h,
      category: 'custom',
    };
  }
  return base;
}

export function getAllTemplates(): PassportTemplate[] {
  return Array.from(templateRegistry.values());
}

export function getTemplatesByCategory(category: string): PassportTemplate[] {
  return getAllTemplates().filter((t) => t.category === category);
}

export function addTemplate(template: PassportTemplate): void {
  templateRegistry.set(template.id, template);
}

export function removeTemplate(id: string): boolean {
  const builtIn = new Set(['bd_pp', 'bd_visa', 'bd_nid', 'bd_dl']);
  if (builtIn.has(id)) return false;
  return templateRegistry.delete(id);
}

// ── Paper Sizes ────────────────────────────────────────────────────────────
export const PAPER_SIZES: PaperSize[] = [
  { id: 'a4',     name: 'A4 (210×297mm)',        widthMm: 210,   heightMm: 297   },
  { id: 'letter', name: 'Letter (216×279mm)',     widthMm: 215.9, heightMm: 279.4 },
  { id: '4r',     name: '4R Photo (102×152mm)',   widthMm: 101.6, heightMm: 152.4 },
  { id: '5r',     name: '5R Photo (127×178mm)',   widthMm: 127.0, heightMm: 177.8 },
  { id: 'custom', name: 'Custom Size',            widthMm: 210,   heightMm: 297   },
];

export function getPaperSize(id: string): PaperSize {
  return PAPER_SIZES.find((p) => p.id === id) ?? PAPER_SIZES[0];
}

// ── Preset Copy Counts ─────────────────────────────────────────────────────
export const COPY_COUNTS = [1, 2, 4, 6, 8, 12, 16] as const;