# Landed design system

This file governs every user interface in Landed. Coding agents and contributors follow it when building or changing UI. Where the file is silent, choose the quieter option.

## Philosophy

Landed is a review tool. People read generated resumes, compare them with their own facts, and decide. The interface must stay out of the way: near-black or off-white surfaces, generous whitespace, one accent color, and typography that carries the hierarchy on its own.

The interface is a set of columns. Each column lists cards; opening a card opens the next column. The URL is the navigation stack, so every screen is reachable by address and the back link always exists.

Minimalism here means fewer elements, not smaller ones. Remove before you decorate.

## Hard rules

1. **Rounded corners everywhere.** No square corners on any surface, control, image, or input. Use the radius scale below; nested elements use a smaller radius than their container so the corners look concentric.
2. **One grotesk typeface for everything.** No serif, no monospace, no display font. IDs, dates, numbers, and code-like values render in the same sans-serif family, optionally with tabular figures.
3. **No monospace, and no uppercase labels.** This includes `<code>`, `<kbd>`, and "terminal-style" tags. Status chips and labels use sentence case in the body typeface.
4. **No borders.** A child separates from its container in exactly one of two ways: a tonal step (a different surface fill), or a 1px line in `line` when child and container share the same fill. Never both, and never a border around a tonally separated element. Inputs, cards, chips, buttons and columns have no border. Focus rings are outlines, not borders, and are exempt.
5. **No eyebrows.** No small label or category text sitting above a title. Hierarchy comes from size and weight of the title itself, and from spacing. If context is needed, it goes below the title as a subtitle.
6. **No decorative gradients, no drop shadows on text, no icons as decoration.** Icons appear only when they carry meaning a word would not. The hamburger and the "+" are the two icon-only controls, and both have accessible names.
7. **Glass is reserved for the floating layer:** the navigation drawer, sheets, and popovers. Columns, cards, forms, tables, and text blocks are opaque. The persistent sidebar is opaque, since nothing scrolls beneath it.
8. **Respect `prefers-reduced-transparency` and `prefers-reduced-motion`.** With reduced transparency, glass surfaces become opaque solids of the same hue. With reduced motion, remove blur transitions and springs.
9. **Text on glass must meet WCAG AA (4.5:1) over the worst-case backdrop.** The drawer adds a solid tint layer behind its text so contrast never depends on what sits underneath.
10. **Three tonal steps, used in order.** Canvas is the page and the list columns. Surface is a card in a list column, the sidebar, and the detail column. Raised is a card or block inside the detail column and the fill of an input. Nothing nests deeper; if a design needs a fourth box, it needs a new column instead.

## Tokens

### Color

Neutral first. One accent. Semantic colours only for meaning, as chip tints and text.

| Token               | Light                    | Dark                     | Use                                              |
| ------------------- | ------------------------ | ------------------------ | ------------------------------------------------ |
| `bg.canvas`         | `#F5F5F7`                | `#0B0B0D`                | Page and list columns                            |
| `bg.surface`        | `#FFFFFF`                | `#161618`                | Cards in a list column, sidebar, detail column   |
| `bg.surface.raised` | `#EFEFF2`                | `#242428`                | Cards and blocks inside the detail column, blocks inside a card, secondary buttons |
| `bg.input`          | `#EFEFF2`                | `#242428`                | Input fill on a card; on canvas use `bg.surface` |
| `bg.glass`          | `rgba(245,245,247,0.70)` | `rgba(22,22,24,0.70)`    | Drawer material, with `backdrop-filter`          |
| `bg.glass.tint`     | `rgba(245,245,247,0.40)` | `rgba(22,22,24,0.40)`    | Solid tint behind text on glass                  |
| `line`              | `rgba(0,0,0,0.08)`       | `rgba(255,255,255,0.10)` | The only permitted line, between same-fill items |
| `text.primary`      | `#111114`                | `#F5F5F7`                | Body and titles                                  |
| `text.secondary`    | `#5F5F66`                | `#A1A1AA`                | Subtitles, helper text                           |
| `text.tertiary`     | `#8E8E96`                | `#6E6E76`                | Placeholders, timestamps                         |
| `accent`            | `#2F6FED`                | `#5B8DFF`                | Primary actions, links, focus rings, active item |
| `accent.soft`       | `#E8EFFF`                | `#1A2440`                | Accent chips, selected card, active nav item     |
| `success`           | `#1F8A4C`                | `#4CC47E`                | Reviewed, ready, applied, interviewing, offer    |
| `warning`           | `#B7791F`                | `#E3B04B`                | Needs review, expired posting, failed run        |
| `danger`            | `#C5372C`                | `#F0655A`                | Errors, destructive confirmation only            |

Rules: never use pure black or pure white for text. Accent is for actions, focus and the selected or active item, not for headings or decoration. Semantic colours appear as chip tints or as text, never as a card background. A rejected or withdrawn application is neutral, not red; red means something went wrong or something is about to be deleted.

### Typography

Family: **Helvetica Neue** (grotesk), used as a system font through a plain CSS stack, no web font download: `"Helvetica Neue", Helvetica, Inter, "SF Pro Text", Arial, sans-serif`. Enable `font-feature-settings: "tnum"` on numeric columns.

| Style      | Size / line height | Weight | Use                                         |
| ---------- | ------------------ | ------ | ------------------------------------------- |
| `title.xl` | 32 / 38            | 600    | Overview title                              |
| `title.lg` | 24 / 30            | 600    | Column titles                               |
| `title.md` | 18 / 24            | 600    | Card titles                                 |
| `body.lg`  | 17 / 26            | 400    | Long-form reading (resume review)           |
| `body`     | 15 / 22            | 400    | Default UI text                             |
| `body.sm`  | 13 / 18            | 400    | Helper text, metadata                       |
| `label`    | 13 / 16            | 500    | Buttons, chips, form labels (sentence case) |

Letter-spacing stays at the font default; tighten titles by at most `-0.01em`. Never letter-space uppercase text, because uppercase text does not exist in this UI except for proper acronyms.

### Spacing and layout

Base unit 4px. Scale: 4, 8, 12, 16, 24, 32, 48, 64. Column padding 24px on desktop, 16px on mobile. Card padding 24px on desktop, 16px on mobile. Gap between cards 16px. Gap between a column title, its toolbar and its first card 16px.

### Radius

| Token         | Value  | Use                                    |
| ------------- | ------ | -------------------------------------- |
| `radius.sm`   | 8px    | Chips, small inputs, checkboxes        |
| `radius.md`   | 12px   | Inputs, buttons, blocks inside a card  |
| `radius.lg`   | 16px   | Cards                                  |
| `radius.xl`   | 24px   | Drawer, sheets, popovers               |
| `radius.full` | 9999px | Pills, the "+" button, avatars         |

Nested radius rule: inner radius = outer radius minus the padding between them, with a floor of `radius.sm`.

### Elevation

Cards: no shadow by default; the tonal step against canvas is enough. A card that is a link or a button gets `0 8px 24px rgba(0,0,0,0.06)` in light and `0 8px 24px rgba(0,0,0,0.4)` in dark on hover and focus. The drawer: `0 12px 40px rgba(0,0,0,0.10)` light, `0 12px 40px rgba(0,0,0,0.5)` dark.

### Glass material

```css
.glass {
  background: var(--bg-glass);
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  border-radius: var(--radius-xl);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 12px 40px rgba(0, 0, 0, 0.1);
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

The inset highlight is a highlight, not a border, and it is the only line allowed on glass. Do not add SVG displacement or refraction filters.

### Motion

Durations: 150ms for hover and focus, 250ms for reveal and dismiss, 400ms for the drawer. Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`. Columns do not animate when the path changes; the new column simply appears. Nothing bounces. Under `prefers-reduced-motion`, durations drop to 0 and transforms are removed.

## Layout

**Columns.** The page is a row of columns on canvas. The path decides how many columns exist; the viewport decides how many are visible. Below 768px only the last column is visible. From 768px the last two columns are visible. From 1200px the sidebar is a third, persistent track on the left. A list column is a titled region of canvas with no fill, border or shadow. The detail column (the last one) and the sidebar are surface panels: `bg.surface` fill, `radius.xl`, inset 16px from the viewport edge, no border or shadow; on a phone the detail column fills the screen edge to edge. Widths: sidebar 220px, list column 360px, detail column flexible with a 480px minimum and a 720px maximum for forms. Each column scrolls on its own.

**Back link.** A column whose parent column is not visible shows a text link at the top with the parent's title, in `label` style and `accent`. The link goes to the parent path. Nothing else is a back control.

**Column header.** Title in `title.lg`, optional count in `text.secondary` after the title in the same size and weight 400, optional subtitle in `body.sm` `text.secondary` below. Then the toolbar, if any. Then the cards.

**Toolbar.** One row. Filter and sort controls on the left, as secondary buttons or selects. The add control on the right: a 40px circle in `bg.surface.raised` containing a plus, with an accessible name that says what is added ("Add achievement"). A list that cannot be filtered shows only the add control. The toolbar has no fill.

**Placeholder column.** When a list or hub is open and nothing in it is selected, the next column shows one sentence in `text.secondary` ("Select something on the left") from 768px, and does not exist below it.

**Sidebar.** Surface panel, 220px, padding 24px. The brand at the top links to the overview. Items are 40px tall pills in `label` style; the active item uses `accent.soft` fill and `accent` text. At most five items.

**Drawer.** Below 1200px the sidebar is hidden and a hamburger button sits at the top left of the first visible column, 40px, icon only, accessible name "Menu". It opens the same items as a glass drawer from the left with `radius.xl` on the right corners, a solid tint layer behind its text, and a scrim over the page. Escape and the scrim close it.

## Components

**Buttons.** Primary: accent background, white text, `radius.md`, 40px tall. Secondary: `bg.surface.raised` background, `text.primary`. Tertiary: text only. Destructive: `danger` text on secondary style, filled only inside a confirmation. No outline-style buttons. The add control is a round secondary button.

**Cards.** Opaque `bg.surface`, `radius.lg`, no border, 24px padding. Title in `title.md`, optional subtitle in `body.sm` `text.secondary` below the title, optional metadata lines in `body.sm`, chips last. A card that opens the next column is one link covering the whole card, with the hover elevation above; the selected card, when its column is visible next to its detail, uses `accent.soft` fill. Actions such as delete live in the detail column, not on list cards. Blocks inside a card use `bg.surface.raised` and `radius.md`.

**Inputs.** `bg.input` fill, no border, `radius.md`, 40px tall, focus ring 2px accent with 2px offset. Labels above in `label` style, sentence case. Helper and error text below in `body.sm`. Textareas share the fill and radius. Selects and checkboxes use the same fill; the checkbox is 18px with `radius.sm` and the accent as its checked color.

**Chips and status.** `radius.full`, `accent.soft` or the semantic tint mixed at about 15% into `bg.surface`, `label` style, sentence case: "Needs review", "Applied", "Interviewing". No outline. Never uppercase. The word carries the meaning; the tint is secondary.

**Tables.** No vertical rules. Row separation by a 1px `line` between rows of the same fill. Header in `label` style, sentence case. Numeric columns right-aligned with tabular figures.

**Review view (resume, cover letter).** Two columns: generated text in the main column in `body.lg`, supporting evidence in the next column. Each generated bullet reveals its cited evidence on hover or focus. Unsupported claims get a `warning` chip, never a red background.

**Empty states.** One sentence in `text.secondary` and, where an action exists, the toolbar's add control. No illustrations, no separate button.

**Forms.** A form sits directly on the detail column's surface, never inside a card: fields stacked with 16px gaps, then an actions row aligned right with the save status text on its left. A form for a new record opens from the add control at a `new` route; a form for an existing record opens from its card. Delete lives at the bottom of the edit form as the destructive button with its inline confirmation.

## Accessibility

Contrast AA everywhere, including on glass over worst-case content. Focus visible on every interactive element. Touch targets at least 40px. Every icon-only control has an accessible name. Color never carries meaning alone; a status chip has a word. Each visible column is a landmark region named by its title.

## Don'ts

Eyebrow labels. Monospace anything. Uppercase labels. Borders on anything tonally separated. Glass on glass. Glass on content. Gradients for decoration. Illustrations in empty states. More than one accent color. Square corners. Shadows on text. Collapsible cards. A fourth tonal step. Fills or shadows on list columns. Forms inside cards. Stacked or overlapping cards.
