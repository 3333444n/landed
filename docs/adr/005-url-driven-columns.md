# ADR 005 — Interface as URL-driven columns

Date: 2026-09-14. Status: accepted, implemented.

## Context

The Phase 0 interface was a set of flat pages with a floating top navigation and a create form at the top of every list. The maintainer rejected that layout and asked for nested panels: a sidebar, a list, and a detail, where opening a card opens the next panel, on a black, white, grey and one-blue palette with no borders. Nesting has no natural depth limit (Jobs → job → resume → evidence), while a screen holds at most three columns, and the resume review view itself needs two.

## Decision

The path is the only navigation state. Each route segment contributes one column through its `layout.tsx`, followed by `children`; fragments keep the columns as siblings inside one shell, and CSS shows the last column on a phone, the last two from 768px, and adds a persistent sidebar from 1200px (a hamburger drawer below that). A column whose parent is hidden shows a back link to the parent path. Creating a record is a `new` route; selecting a record is its `[id]` route; filters and sort, when they arrive, are search parameters. No client-side navigation store exists.

Visual rules moved into DESIGN.md at the same time: no borders (a 1px line only between items that share a fill), three tonal steps (canvas for list columns, surface for cards, the sidebar and the detail column, raised for inputs and blocks inside the detail column), and semantic tints reserved for status chips.

The job status shown in the Jobs list is derived at render time from job availability, application status and run state (doc 05), never stored, so the single list the maintainer wants does not merge the lifecycles the architecture keeps separate.

## Alternatives

A client-side panel stack in React state: quick to build, lost on reload, unaddressable, and invisible to server components. Modals over a fixed list: fine for one level, collapses at two. Parallel routes: right when columns are independent siblings, unnecessary while each column is the parent of the next.

## Consequences

Every screen has an address, which constrains design and simplifies tests. Deep paths render hidden ancestor columns on the server; the ancestors are cheap lists today, and a lazy or lighter projection is the answer if a hidden list becomes expensive. The old Phase 0 addresses (`/profile`, `/experience`, `/skills`, `/achievements`) redirect from `next.config.ts`. Employment records are called "Work history" in the interface so that "Jobs" can mean postings, matching the domain model (doc 02).
