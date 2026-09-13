# Landed design system

This file governs every user interface in Landed. Coding agents and contributors follow it when building or changing UI. Where the file is silent, choose the quieter option.

## Philosophy

Landed is a review tool. People read generated resumes, compare them with their own facts, and decide. The interface must stay out of the way: calm surfaces, generous whitespace, one accent color, and typography that carries the hierarchy on its own.

The visual reference is Apple's Liquid Glass (iOS 26 onward): a translucent, softly refractive material used for the **navigation and control layer** that floats above content. Content itself stays opaque and legible. Apple's own guidance applies: glass is for the layer that persists while content scrolls, never for everything, and never glass on glass.

Minimalism here means fewer elements, not smaller ones. Remove before you decorate.

## Hard rules

1. **Rounded corners everywhere.** No square corners on any surface, control, image, or input. Use the radius scale below; nested elements use a smaller radius than their container so the corners look concentric.
2. **One grotesk typeface for everything.** No serif, no monospace, no display font. IDs, dates, numbers, and code-like values render in the same sans-serif family, optionally with tabular figures.
3. **No monospace, and no uppercase monospace labels.** This includes `<code>`, `<kbd>`, and "terminal-style" tags. Status chips and labels use sentence case in the body typeface.
4. **No borders on cards.** Cards separate from the page through tonal contrast (a slightly different surface color) and, at most, a soft ambient shadow. Never `border: 1px solid`. Inputs may have a subtle border in their resting state; cards may not.
5. **No eyebrows.** No small label or category text sitting above a title. Hierarchy comes from size and weight of the title itself, and from spacing. If context is needed, it goes below the title as a subtitle.
6. **No decorative gradients, no drop shadows on text, no icons as decoration.** Icons appear only when they carry meaning a word would not.
7. **Glass is reserved for the floating layer:** top navigation, bottom action bars, floating toolbars, sheets, and popovers. Content cards, forms, tables, and text blocks are opaque.
8. **Respect `prefers-reduced-transparency` and `prefers-reduced-motion`.** With reduced transparency, glass surfaces become opaque solids of the same hue. With reduced motion, remove blur transitions and springs.
9. **Text on glass must meet WCAG AA (4.5:1) over the worst-case backdrop.** If a glass bar sits over user content, add a subtle solid tint layer behind the text so contrast never depends on what scrolls underneath.

## Tokens

### Color

Neutral first. One accent. Semantic colors only for meaning.

| Token               | Light                    | Dark                  | Use                                             |
| ------------------- | ------------------------ | --------------------- | ----------------------------------------------- |
| `bg.canvas`         | `#F5F5F7`                | `#0B0B0D`             | Page background                                 |
| `bg.surface`        | `#FFFFFF`                | `#161618`             | Cards, panels (opaque)                          |
| `bg.surface.raised` | `#FAFAFC`                | `#1D1D20`             | Nested surfaces inside a card                   |
| `bg.glass`          | `rgba(255,255,255,0.55)` | `rgba(22,22,24,0.55)` | Floating layer material, with `backdrop-filter` |
| `bg.glass.tint`     | `rgba(255,255,255,0.35)` | `rgba(22,22,24,0.35)` | Solid tint behind text on glass                 |
| `text.primary`      | `#111114`                | `#F5F5F7`             | Body and titles                                 |
| `text.secondary`    | `#5F5F66`                | `#A1A1AA`             | Subtitles, helper text                          |
| `text.tertiary`     | `#8E8E96`                | `#6E6E76`             | Placeholders, timestamps                        |
| `accent`            | `#2F6FED`                | `#5B8DFF`             | Primary actions, links, focus rings             |
| `accent.soft`       | `#E8EFFF`                | `#1A2440`             | Accent backgrounds (chips, selected rows)       |
| `success`           | `#1F8A4C`                | `#4CC47E`             | Reviewed, submitted                             |
| `warning`           | `#B7791F`                | `#E3B04B`             | Needs review, unknown data                      |
| `danger`            | `#C5372C`                | `#F0655A`             | Errors, destructive actions                     |

Rules: never use pure black for text or backgrounds. Accent is for actions and focus, not for headings or decoration. Semantic colors appear as small chips or text, never as full-card backgrounds.

### Typography

Family: **Helvetica Neue** (grotesk), used as a system font through a plain CSS stack, no web font download: `"Helvetica Neue", Helvetica, Inter, "SF Pro Text", Arial, sans-serif`. Enable `font-feature-settings: "tnum"` on numeric columns.

| Style      | Size / line height | Weight | Use                                         |
| ---------- | ------------------ | ------ | ------------------------------------------- |
| `title.xl` | 32 / 38            | 600    | Page titles                                 |
| `title.lg` | 24 / 30            | 600    | Section titles                              |
| `title.md` | 18 / 24            | 600    | Card titles                                 |
| `body.lg`  | 17 / 26            | 400    | Long-form reading (resume review)           |
| `body`     | 15 / 22            | 400    | Default UI text                             |
| `body.sm`  | 13 / 18            | 400    | Helper text, metadata                       |
| `label`    | 13 / 16            | 500    | Buttons, chips, form labels (sentence case) |

Letter-spacing stays at the font default; tighten titles by at most `-0.01em`. Never letter-space uppercase text, because uppercase text does not exist in this UI except for proper acronyms.

### Spacing and layout

Base unit 4px. Scale: 4, 8, 12, 16, 24, 32, 48, 64. Content max width 960px for forms and review screens, 1200px for tables. Card padding 24px on desktop, 16px on mobile. Gap between cards 16px. Section gap 48px.

### Radius

| Token         | Value  | Use                             |
| ------------- | ------ | ------------------------------- |
| `radius.sm`   | 8px    | Chips, small inputs             |
| `radius.md`   | 12px   | Inputs, buttons                 |
| `radius.lg`   | 16px   | Cards                           |
| `radius.xl`   | 24px   | Sheets, floating bars, popovers |
| `radius.full` | 9999px | Pills, avatars                  |

Nested radius rule: inner radius = outer radius minus the padding between them, with a floor of `radius.sm`.

### Elevation

Cards: no shadow by default; tonal contrast against `bg.canvas` is enough. Raised interactive cards on hover: `0 8px 24px rgba(0,0,0,0.06)` in light, `0 8px 24px rgba(0,0,0,0.4)` in dark. Floating glass layer: `0 12px 40px rgba(0,0,0,0.10)` light, `0 12px 40px rgba(0,0,0,0.5)` dark.

### Glass material

```css
.glass {
  background: var(--bg-glass);
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  border-radius: var(--radius-xl);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    /* top highlight, the "edge of the glass" */ 0 12px 40px rgba(0, 0, 0, 0.1);
}
@media (prefers-reduced-transparency: reduce) {
  .glass {
    background: var(--bg-surface);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
@supports not (backdrop-filter: blur(1px)) {
  .glass {
    background: var(--bg-surface);
  }
}
```

The inset highlight is the only "border-like" line allowed on glass, and it is a highlight, not a border. Do not add SVG displacement or refraction filters; they are heavy, Chromium-only, and not needed for a review tool.

### Motion

Durations: 150ms for hover and focus, 250ms for reveal and dismiss, 400ms for sheets. Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`. Glass bars may shrink slightly (scale 0.98, opacity 0.9) while content scrolls, then restore. Nothing bounces. Under `prefers-reduced-motion`, durations drop to 0 and transforms are removed.

## Components

**Buttons.** Primary: accent background, white text, `radius.md`, 40px tall. Secondary: `bg.surface.raised` background, `text.primary`. Tertiary: text only. Destructive: `danger` text on secondary style, filled only inside a confirmation. No outline-style buttons.

**Cards.** Opaque `bg.surface`, `radius.lg`, no border, 24px padding. Title in `title.md`, optional subtitle in `body.sm` `text.secondary` below the title. Actions bottom-right or top-right, never both.

**Inputs.** `bg.surface.raised` background, 1px border in `rgba(0,0,0,0.08)` (light) or `rgba(255,255,255,0.10)` (dark), `radius.md`, 40px tall, focus ring 2px accent outside the border. Labels above in `label` style, sentence case. Helper and error text below in `body.sm`.

**Chips and status.** `radius.full`, `accent.soft` or the semantic soft tone, `label` style, sentence case: "Needs review", "Applied", "Interviewing". Never uppercase.

**Navigation bar.** Glass material, `radius.xl`, floating with 16px inset from the viewport edges on desktop, full width with top radius on mobile. Contains at most five items. Active item uses `accent.soft` pill.

**Tables.** No vertical rules. Row separation by 1px `bg.canvas` line or zebra tint. Header in `label` style, sentence case. Numeric columns right-aligned with tabular figures.

**Review view (resume, cover letter).** Two columns on desktop: generated text on the left in `body.lg`, supporting evidence on the right. Each generated bullet reveals its cited evidence on hover or focus. Unsupported claims get a `warning` chip, never a red background.

**Empty states.** One sentence in `text.secondary` and one primary action. No illustrations.

## Accessibility

Contrast AA everywhere, including on glass over worst-case content. Focus visible on every interactive element. Touch targets at least 40px. Every icon-only control has an accessible name. Color never carries meaning alone; a status chip has a word.

## Don'ts

Eyebrow labels. Monospace anything. Uppercase labels. Bordered cards. Glass on glass. Glass on content cards. Gradients for decoration. Illustrations in empty states. More than one accent color. Square corners. Shadows on text.
