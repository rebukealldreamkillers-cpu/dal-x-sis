# DAL-X-SIS — Project Guardrails

DAL-X-SIS is a **static publication website** for www.DAL-X.com.

It publishes the Decision Governance Strategic Intelligence Series, establishes Kevin Moore and Jochanni Labs, explains Decision Governance and runtime authority, and progressively positions DAL-X as the emerging runtime authority layer for AI-generated work before execution.

## Framework

- **Astro 4** with `output: 'static'`
- **Package manager:** npm
- **Styling:** Plain CSS in `src/styles/global.css` — no Tailwind, no CSS framework
- **Content:** Astro Content Collections in `src/content/briefings/` (Markdown)
- **Sitemap:** `@astrojs/sitemap@3.1.6` — do NOT upgrade to 3.4+ (requires Astro 5, breaks build)

## Routes

| URL | File | Purpose |
|---|---|---|
| `/` | `src/pages/index.astro` | Homepage with hero + latest briefings |
| `/briefings` | `src/pages/briefings/index.astro` | Full briefings index |
| `/briefings/[slug]` | `src/pages/briefings/[slug].astro` | Individual briefing page |
| `/decision-governance` | `src/pages/decision-governance.astro` | Concept explanation |
| `/dal-x` | `src/pages/dal-x.astro` | DAL-X initiative page |
| `/about` | `src/pages/about.astro` | About Kevin Moore |
| `/jochanni-labs` | `src/pages/jochanni-labs.astro` | Jochanni Labs |

## Navigation

Five items, defined in `src/layouts/Base.astro`:
**Briefings · Decision Governance · DAL-X · About Kevin Moore · Jochanni Labs**

Active state is set via `aria-current="page"` using `Astro.url.pathname` — no JavaScript required.

## Briefing Metadata — Static Data File

All 20 briefings are defined in `src/data/briefings.ts`. This is the authoritative map.

**Interfaces exported:** `Briefing`, `Phase`, `BriefingStatus`
**Arrays exported:** `BRIEFINGS` (all 20), `PHASES` (4 phase definitions)
**Helpers exported:** `getBriefingsByPhase(phase)`, `getPhase(number)`, `getPublishedBriefings()`

Each briefing has: `briefingNumber`, `title`, `phase`, `phaseName`, `corePosition`, `estimatedReadTime`, `approximateWordCount`, `purpose`, `publicationDate`, `status`, `slug`

Statuses: `'Published'` | `'Scheduled'` | `'Upcoming'`

The briefings index page (`/briefings`) renders all 20 organized by phase — Published briefings are linked, Scheduled and Upcoming are shown but not linked.

The homepage pulls from `getPublishedBriefings()` — it only shows briefings with `status: 'Published'`.

## Adding Published Briefing Content

When a briefing moves to `Published`, create a Markdown file in `src/content/briefings/` with this frontmatter:

```markdown
---
title: "Briefing Title"
description: "One-paragraph description for index cards and meta tags."
date: YYYY-MM-DD
issue: 2
author: Kevin Moore
draft: false
---
```

The content collection is named `briefings` — use `getCollection('briefings')` in pages.

## Hard Constraints

Do NOT add:

- Databases (Supabase, Postgres, Redis, etc.)
- Authentication or user accounts
- Backend services or serverless functions
- Dashboards or admin panels
- Pricing pages
- Startup SaaS patterns (lead capture, testimonials, fake social proof)
- Unnecessary JavaScript or client-side interactivity

This is a **publication**, not a product.

## Commands

```bash
npm run dev      # development server
npm run build    # static build → dist/
npm run preview  # preview built output
```
