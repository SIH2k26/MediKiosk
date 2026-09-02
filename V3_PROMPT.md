# UI Migrator Prompt: V3 Light Theme Structural Pivot

Migrate the provided Next.js TSX files to the new v3 Light Theme design system.
This is a STRUCTURAL migration, not just color swapping.

## Typography (Mandatory)
- Headlines / Hero text: MUST have ont-serif. (e.g. "Choose your language", "What is your main problem today?")
- Body text / normal labels: MUST remain ont-sans (the default). Use 	ext-ink-secondary.
- Data / Scores / Machine Values: MUST have ont-mono. (e.g. 1/5, Priority Scores, Tags, Extracted Entities).
- Small uppercase labels: MUST use 	ext-[12px] uppercase tracking-wide text-ink-tertiary (or 	ext-accent-text).

## Shapes & Radii (Mandatory)
- REMOVE ALL instances of ounded-full and ounded-2xl except for true circles (e.g. avatars, single small dots).
- Buttons, Inputs, Badges, Pills, Tags MUST use ounded-md (max 6px).
- Cards, Panels MUST use ounded-lg (max 8px).

## Notices & Status Bars
- DO NOT use full-width solid background colors for notices.
- A warning notice row should be: <div className="flex items-center gap-2 p-3 rounded-md bg-signal-warningWash text-ink-primary">...</div> with an icon.
- A success/info notice row: g-accent-wash text-ink-primary with an icon.

## Specific Fixes
- **Language Card Checkmark**: If you see a checkmark for a selected language, it should be a 20px circle, offset -top-2 -right-2 (using absolute positioning inside a elative container), g-paper-raised border border-accent text-accent. NOT flush with the corner.
- **Card Styling**: Normal cards are g-paper-raised border border-rule shadow-card rounded-lg. Hover states can use shadow-raised.

PRESERVE ALL LOGIC, IDs, ria-*, and data-testid!
