# De Book

De Book is a book in space and time.

It is a platform and framework to log important events from the past across both timeline and geography.
The database is intentionally expandable so events, places, links, and interpretations can be enriched over time.

The project starts as a structured map of time and space, with minimal context, and waits to be filled in progressively.

## Vision

De Book is intended to be:

- a long-term space-time framework for world history
- an expandable event database, not a fixed final dataset
- a neutral base layer first, with context added progressively
- a tool for comparing what happened across places in the same era

Each record can grow over time with:

- time (year or period)
- actors (empire/state/culture)
- regions (one or more world areas)
- narrative (short or long historical explanation)

The goal is to let a reader explore:

- a region
- a culture spread
- an empire
- an era

and observe what shaped the modern world, when it happened, and where it happened.

## What Is In This Project

This repository currently contains:

- a static web app for public access (`index.html`, `app.js`, `styles.css`)
- canonical event data JSON for timeline rendering (`data/events.json`)
- a Google Sheets template for structured data entry (`data/events.template.csv`)
- Apps Script code to validate and publish JSON to GitHub (`apps-script/`)
- legacy notebook and geospatial files kept for reference

## Key Files

- `index.html`: main De Book web app page (GitHub Pages entry point).
- `app.js`: timeline/map logic and filtering behavior.
- `styles.css`: UI theme and responsive layout.
- `data/events.json`: normalized event dataset consumed by the web app.
- `data/events.template.csv`: canonical Sheet import template.
- `apps-script/Code.gs`: Google Apps Script for validation and GitHub sync.
- `apps-script/README.md`: Apps Script setup instructions.
- `docs/DEPLOYMENT.md`: end-to-end deployment guide.
- `De_Book.ipynb`: legacy prototype notebook retained for reference.

## Quick Start

### Option 1: Run The Web App Locally

Open `index.html` in your browser.

The app reads from `data/events.json` and supports:

- year timeline slider + play mode
- actor/region filters
- cumulative view mode
- historical event list + map rendering
- `Last synced` status from `meta.generated_at`
- admin event input form (submits to Apps Script `doPost`)

### Option 2: Deploy As A Public Web App (GitHub Pages)

Follow `docs/DEPLOYMENT.md`.

### Option 3: Use Notebook Prototype (Legacy)

`De_Book.ipynb` is still available, but the primary direction is now the web app stack.

## Web Stack

De Book now follows this architecture:

1. Google Sheets as editable event database
2. Apps Script to validate rows, accept admin event submissions, and publish JSON
3. GitHub repository as versioned storage
4. GitHub Pages as public website

## Data Model (Current)

Canonical event schema:

- `id`: stable unique identifier
- `year`: integer (`-221` for BCE, `1915` for CE)
- `title`: event headline
- `actors`: array of states/empires/cultures
- `regions`: array of world regions
- `summary`: event narrative
- `lat`/`lng` (optional): exact map placement
- `sources` (optional): references

The canonical source file is `data/events.json`.

## Current State Notes

- The web app is active and ready to publish through GitHub Pages.
- Apps Script sync is prepared in `apps-script/Code.gs`.
- Legacy notebook/geodata artifacts are preserved and not removed.

## Suggested Next Improvements

- add actor and region detail pages with cross-links
- attach source links and confidence fields per event
- add multilingual fields (`title_en`, `title_zh`, `summary_en`, `summary_zh`)
- use custom polygons per event for higher map precision
