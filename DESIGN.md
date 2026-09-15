# Landed design system

This file governs every user interface in Landed. Coding agents and contributors follow it when building or changing UI. Where the file is silent, choose the quieter option.

## Philosophy

Landed is a review tool. People read generated resumes, compare them with their own facts, and decide. The interface must stay out of the way: a near-black (or off-white) canvas lit by a soft glow in two corners in the accent's hue, flat translucent panels and cards with a thin gradient edge, generous whitespace, one accent color, and typography that carries the hierarchy on its own.

The interface is a set of columns. Each column lists cards; opening a card opens the next column. The URL is the navigation stack, so every screen is reachable by address and the back link always exists.

Minimalism here means fewer elements, not smaller ones. Remove before you decorate.

## Hard rules

1. **Rounded corners everywhere.** No square corners on any surface, control, image, or input. Use the radius scale below; nested elements use a smaller radius than their container so the corners look concentric.
2. **One grotesk typeface for everything.** No serif, no monospace, no display font. IDs, dates, numbers, and code-like values render in the same sans-serif family, optionally with tabular figures.
3. **No monospace, and no uppercase labels.** This includes `<code>`, `<kbd>`, and "terminal-style" tags. Status chips and labels use sentence case in the body typeface. The one uppercase word is the LANDED wordmark next to the mark in the sidebar.
4. **No borders.** A child separates from its container in exactly one of two ways: a tonal step (a different surface fill), or a 1px line in `line` when child and container share the same fill. Never both, and never a border around a tonally separated element. Inputs, cards, chips, buttons and columns have no border. Focus rings are outlines, not borders, and are exempt, and so is the 1px gradient edge of a glass surface, which is a highlight of the material, not a border (see Glass material).
5. **No eyebrows.** No small label or category text sitting above a title. Hierarchy comes from size and weight of the title itself, and from spacing. If context is needed, it goes below the title as a subtitle.
6. **No decorative gradients, no drop shadows on text, no icons as decoration.** The only gradients are the canvas glow and the 1px glass edge; no element has a gradient fill. An icon sits in an icon tile next to the word it stands for (column titles, sidebar items, About me cards, record cards, job cards by derived status, material cards) and is hidden from assistive technology, so an accessible name never changes because of an icon. The hamburger, the drawer's close button, the back button, the "+", Filter, Sort and the theme switch are the icon-only controls, and each has an accessible name.
7. **Two grades of glass.** Layered glass (a flat translucent fill and a 1px gradient edge highlight, no blur, nothing inside the fill) is the material of cards, the sidebar panel, the detail column and the round toolbar and back buttons, because nothing scrolls beneath them. Floating glass (the same plus `backdrop-filter`) is reserved for the navigation drawer, sheets and popovers. List columns, forms, tables, inputs and text blocks have no glass of their own.
8. **Respect `prefers-reduced-transparency` and `prefers-reduced-motion`.** With reduced transparency, glass surfaces become opaque solids of the same hue. With reduced motion, remove blur transitions and springs.
9. **Text on glass must meet WCAG AA (4.5:1) over the worst-case backdrop.** The drawer and popover fill is opaque enough (`bg.glass`) that contrast never depends on what sits underneath.
10. **Three tonal steps, used in order.** Canvas is the gradient page and the list columns. Surface is a card in a list column (`glass.card`), the sidebar and the detail column (`glass.panel`). Raised is a card or block inside the detail column (`glass.card.raised`), the fill of an input and the icon tile. Nothing nests deeper; if a design needs a fourth box, it needs a new column instead.

## Tokens

### Color

Neutral first. One accent. Semantic colours only for meaning, as chip tints and text.

Colour has three layers in the code. `src/app/palettes.css` holds the palettes: each is one block that gives every colour a light (`--l-*`) and a dark (`--d-*`) value. `src/app/tokens.css` picks the light or the dark value into the semantic tokens below according to the scheme, and holds everything that is not a colour. Components use only the semantic tokens. To try a palette, copy the steel block, name it with a new `data-palette` value, change the values, and open the app with `?palette=<name>` (remembered in the browser; `?palette=` returns to the default). Every palette keeps near-black and near-white neutrals with at most a faint cast of its hue; the accent, the selection tint and the glow carry the colour, and the accent and the glow share one hue. One palette exists, `steel`, built from a six-step scale (#2E3A44, #4C5F6B, #7E939C, #B0C2C6, #DDE4E1, #F6F4EE); the values live in `palettes.css`, and the table below names the semantic tokens and their uses.

| Token | Use |
| --- | --- |
| `bg.canvas` | Base colour under the canvas gradient |
| `glow` | Light source of the canvas gradient, in the accent's hue |
| `bg.canvas.gradient` | The page and the list columns |
| `bg.surface` | Cards in a list column, sidebar, detail column |
| `bg.surface.raised` | Cards and blocks inside the detail column, blocks inside a card, secondary buttons |
| `bg.input` | Input fill on a card; on canvas use `bg.surface` |
| `bg.glass` | Drawer and popover material, with `backdrop-filter` |
| `glass.panel` | Sidebar and detail column fill |
| `glass.card` | Card fill in a list column |
| `glass.card.raised` | Card fill inside the detail column |
| `glass.card.selected` | Selected link card (translucent `accent.soft`) |
| `glass.edge` | 1px edge highlight of a glass surface |
| `glass.control` | Round glass buttons (add, filter, sort, back) |
| `icon.tile.bg` | Icon tile fill |
| `line` | The only permitted line, between same-fill items |
| `text.primary` | Body and titles |
| `text.secondary` | Subtitles, helper text |
| `text.tertiary` | Placeholders, timestamps |
| `accent` | Primary actions, links, focus rings, active item |
| `accent.contrast` | Text on an `accent` fill (white in light, near-black in dark, because the dark accents are pale) |
| `accent.soft` | Accent chips, selected card, active nav item |
| `success` | Reviewed, ready, applied, interviewing, offer |
| `warning` | Needs review, expired posting, failed run |
| `danger` | Errors, destructive confirmation only |

Rules: never use pure black or pure white for text. Dark is the system preference or the person's choice (`data-theme` on the root); every token has both values, and nothing else may branch on the scheme except which mark and which toggle glyph show. The canvas is `bg.canvas` lit by the palette's glow; the glow is the only colour that is not a neutral, the accent or a semantic tint, and it appears nowhere else. Accent is for actions, focus and the selected or active item, not for headings or decoration. Semantic colours appear as chip tints or as text, never as a card background. A rejected or withdrawn application is neutral, not red; red means something went wrong or something is about to be deleted.

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

Letter-spacing stays at the font default; tighten titles by at most `-0.01em`. Uppercase text does not exist in this UI except for proper acronyms and the wordmark, which may open up to `0.04em`.

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

Layered glass, for cards, panels and round buttons. The fill is one flat translucent colour. The edge is a `::before` ring: the gradient fills the pseudo-element and a mask keeps only its outer 1px, so no gradient ever sits under the fill. A surface that scrolls puts the scrolling on an inner element and keeps `position: relative` and `overflow: hidden` itself, so the ring stays in place. No blur, because nothing moves beneath these surfaces, and no shadow or gradient inside the fill.

```css
.layered-glass {
  position: relative;
  border-radius: var(--radius-lg);
  background: var(--glass-card); /* or --glass-panel, --glass-card-raised, --glass-control */
}
.layered-glass::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: var(--glass-edge);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}
```

Floating glass, for the drawer and popovers:

```css
.glass {
  background: var(--bg-glass);
  backdrop-filter: blur(20px) saturate(1.6); /* never add the -webkit- prefix by hand: the build then keeps only the prefixed one */
  border-radius: var(--radius-xl);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    0 12px 40px rgba(0, 0, 0, 0.1);
}
@media (prefers-reduced-transparency: reduce) {
  .glass {
    background: var(--bg-surface);
    backdrop-filter: none;
  }
}
@supports not (backdrop-filter: blur(1px)) {
  .glass {
    background: var(--bg-surface);
  }
}
```

The inset highlight and the gradient edge are highlights, not borders, and they are the only lines allowed on glass. Under `prefers-reduced-transparency` every glass token maps back to the opaque surface of the same hue and the edge disappears (in tokens.css, so no component needs its own fallback). Do not add SVG displacement or refraction filters.

### Motion

Durations: 150ms for hover and focus, 250ms for reveal and dismiss, 400ms for the drawer. Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`. Columns do not animate when the path changes; the new column simply appears. Nothing bounces. Under `prefers-reduced-motion`, durations drop to 0 and transforms are removed.

## Layout

**Columns.** The page is a row of columns on canvas. The path decides how many columns exist; the viewport decides how many are visible. Below 768px only the last column is visible. From 768px the last two columns are visible. From 1200px the sidebar is a third, persistent track on the left. A list column is a titled region of canvas with no fill, border or shadow. The detail column (the last one) and the sidebar are layered-glass panels: `glass.panel` fill, `radius.xl`, inset 16px from the viewport edge; on a phone the detail column fills the screen edge to edge. Widths: sidebar 220px; the two visible columns share the remaining width equally, and a form inside the detail column stays within 720px. Each column scrolls on its own, and scrollbars are hidden everywhere.

**Back button.** A column whose parent column is not visible shows a 40px round glass button (`glass.control` fill, gradient edge) with a left-arrow glyph at the top; its accessible name and tooltip are the parent's title. It goes to the parent path. Nothing else is a back control.

**Column header.** An icon tile for the column's kind (the section's icon for a list or a record, a plus for a new-record form, the document's icon for a review column), then the title in `title.lg`, optional count in `text.secondary` after the title in the same size and weight 400, optional subtitle in `body.sm` `text.secondary` below. Then the toolbar, if any. Then the cards.

**Toolbar.** One row. Filter and sort on the left as 40px round glass buttons (`glass.control` fill, gradient edge, sliders and arrows glyphs, accessible names "Filter" and "Sort") that open a popover menu of exclusive options with the current one marked; a non-default choice shows an 8px accent dot on the button. The add control on the right: a 40px round glass button containing a plus, with an accessible name that says what is added ("Add achievement"). A list that cannot be filtered shows only the add control. The toolbar has no fill.

**Placeholder column.** When a list or hub is open and nothing in it is selected, the next column shows one sentence in `text.secondary` ("Select something on the left") from 768px, and does not exist below it.

**Sidebar.** Glass panel, 220px, padding 24px. The brand at the top (the 28px mark from `public/logo`, white in dark and black in light, then LANDED) links to the overview. Items are 40px tall pills in `label` style with a small icon tile before the word; the active item uses `accent.soft` fill and `accent` text. At most five items. The theme switch sits at the bottom: a round glass button whose glyph (sun or moon) names the scheme a click would switch to; it sets `data-theme` on the root and remembers it in the browser, and without a saved choice the system preference applies.

**Drawer.** Below 1200px the sidebar is hidden and a round glass hamburger button sits on the left padding line of the first visible column, level with where its back button sits, 40px, icon only, accessible name "Menu". It opens the same items as a floating-glass panel from the left, inset 16px like the desktop sidebar with `radius.xl` on every corner and the gradient ring, blurring the page beneath it, with a scrim over the rest. While the drawer is open the hamburger is hidden and a round glass close button ("Close menu") sits in the drawer's top right corner and takes focus. Escape, the scrim and the close button close it. The blur lives on the inner panel, not on the element that slides, because Safari drops backdrop filters on transformed elements.

## Components

**Buttons.** Primary: `accent` background, `accent.contrast` text, `radius.md`, 40px tall. Secondary: `bg.surface.raised` background, `text.primary`. Tertiary: text only. Destructive: `danger` text on secondary style, filled only inside a confirmation. No outline-style buttons. Round icon buttons (add, filter, sort, back) are layered glass and turn `accent.soft` on hover.

**Cards.** Layered glass (`glass.card` in a list column, `glass.card.raised` inside the detail column), `radius.lg`, no border, 24px padding. An optional icon tile sits at the left of the header. Title in `title.md`, optional subtitle in `body.sm` `text.secondary` below the title, optional metadata lines in `body.sm`, chips last. A card that opens the next column is one link covering the whole card, with the hover elevation above; the selected card, when its column is visible next to its detail, uses `accent.soft` fill. Actions such as delete live in the detail column, not on list cards. Blocks inside a card use `bg.surface.raised` and `radius.md`.

**Inputs.** `bg.input` fill, no border, `radius.md`, 40px tall, focus ring 2px accent with 2px offset. Labels above in `label` style, sentence case. Helper and error text below in `body.sm`. Textareas share the fill and radius and grow with their content; `rows` is only the minimum, so long text never scrolls inside a short box. Selects and checkboxes use the same fill; the checkbox is 18px with `radius.sm` and the accent as its checked color.

**Icon tile.** A rounded raised square (`icon.tile.bg`, 36px with `radius.md`, or 28px with `radius.sm` in the sidebar) holding one 18px (16px) stroke icon from Lucide in `text.primary`. It sits before column titles, on hub, record, job and material cards and on sidebar items. It is always `aria-hidden`; the word next to it carries the meaning. One icon per kind of thing: briefcase for work history and jobs, graduation cap for education, folder for projects, bulb for skills, award for achievements, person for the profile, and the job card's icon follows its status.

**Popover.** Floating glass, `radius.xl`, 8px padding, opening below its button. Items are 40px rows in `label` style with `radius.md`; the current one is in `accent` with a check glyph. Escape closes it and returns focus; a click outside closes it.

**Chips and status.** `radius.full`, `accent.soft` or the semantic tint mixed at about 15% into `bg.surface`, `label` style, sentence case: "Needs review", "Applied", "Interviewing". No outline. Never uppercase. The word carries the meaning; the tint is secondary.

**Tables.** No vertical rules. Row separation by a 1px `line` between rows of the same fill. Header in `label` style, sentence case. Numeric columns right-aligned with tabular figures.

**Review view (resume, cover letter).** Two columns: generated text in the main column in `body.lg`, supporting evidence in the next column. Each generated bullet reveals its cited evidence on hover or focus. Unsupported claims get a `warning` chip, never a red background.

**Empty states.** One sentence in `text.secondary` and, where an action exists, the toolbar's add control. No illustrations, no separate button.

**Forms.** A form sits directly on the detail column's surface, never inside a card: fields stacked with 16px gaps, then an actions row aligned right with the save status text on its left. A form for a new record opens from the add control at a `new` route; a form for an existing record opens from its card. Delete lives at the bottom of the edit form as the destructive button with its inline confirmation.

## Accessibility

Contrast AA everywhere, including on glass over worst-case content. Focus visible on every interactive element. Touch targets at least 40px. Every icon-only control has an accessible name. Color never carries meaning alone; a status chip has a word. Each visible column is a landmark region named by its title.

## Don'ts

Eyebrow labels. Monospace anything. Uppercase labels. Borders on anything tonally separated. Glass on glass. Blur on cards or panels. Gradient fills on any element; the only gradients are the canvas glow and the 1px glass edge. Icons without a word. Illustrations in empty states. More than one accent color. Square corners. Shadows on text. Collapsible cards. A fourth tonal step. Fills or shadows on list columns. Forms inside cards. Stacked or overlapping cards.
