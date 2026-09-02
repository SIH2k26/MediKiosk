# Goal: Rebuild MediKiosk Frontend to NYAAY AI Quality Standards

The frontend must be entirely redesigned to achieve Apple-level interaction discipline and NYAAY-level editorial visual design. We are pivoting to a premium, structured clinical software aesthetic.

## Task
You must completely rebuild the requested files based on the strict architectural and design requirements below.

## 1. Typography & Hierarchy (Mandatory)
- **Display/Major Headings**: Use ont-serif (Newsreader) for large editorial statements (e.g., hero headlines).
- **Section Headings**: Strong ont-sans (Inter) for structural headings.
- **Eyebrows/Labels**: Use ont-mono uppercase tracking-wide text-[12px] text-ink-tertiary for small system/status labels.
- **Data Points**: Use ont-mono selectively for timestamps, vital signs, system status, priority scores, and extracted entities.
- **Body**: Highly readable ont-sans text-ink-secondary.

## 2. Palette (Strict Tokens)
Do not use arbitrary hex values. Use Tailwind tokens:
- **Canvas/Surfaces**: g-paper, g-paper-raised, g-paper-sunken. Dark mode sections use g-dark and g-dark-raised.
- **Text**: 	ext-ink-primary, 	ext-ink-secondary, 	ext-ink-tertiary, 	ext-ink-muted. On dark sections, use 	ext-paper.
- **Accent**: 	ext-accent, g-accent-wash, order-accent. This is MediKiosk Teal.
- **Borders**: order-rule (or order-dark-rule for dark).
- **Signal**: g-signal-warningWash, 	ext-signal-critical, etc.

## 3. Spacing, Density & Grid
- Avoid massive empty spaces.
- Use consistent max-width containers (e.g., max-w-[1200px] mx-auto px-4), deliberate grid columns (grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4), and vertical rhythm (gap-6, my-12).

## 4. Animation & Interaction (Framer Motion)
- Use Framer Motion (ramer-motion) for subtle, meaningful animations.
- Cards must have hover/active states (e.g., hover:shadow-raised).
- Transitions between views must be staggered and smooth (e.g., ade + translate y).
- Do not make it static.

