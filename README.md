# Bee Farming Web App (MVP)

A lightweight, content-driven checklist app for one Luxembourg beekeeper managing multiple hives.

## MVP capabilities

- Add/edit/archive hives
- Manually assign current stage
- Hive detail checklist per selected stage:
  - How to determine stage
  - Immediate tasks
  - Near-future tasks
  - Key risks
  - Simple progress/timeline (previous → current → likely next)
- Stage guide pages for all fixed stages
- Risks/incidents library with categorized detail pages
- Source metadata attached per stage/risk record

## Content-driven approach

Stage and risk guidance is stored in seedable JSON:

- `data/stages.json`
- `data/risks.json`

Each record has source metadata (1–3 curated sources), with Luxembourg authority/local practical sources prioritized first.

## Run locally

Serve statically from repo root, e.g.:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

> Hive data is persisted in browser `localStorage` (`bee_hives_v1`).
