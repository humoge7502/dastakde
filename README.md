# DastakDe — दस्तक दे

**Verified opportunities for students: scholarships, hackathons, internships, fellowships, exams
and government schemes — every item links to its official source. Never miss a deadline.**

- Live site: https://humoge7502.github.io/dastakde/ (GitHub Pages, served from `docs/`)
- Feed API: `feed/index.json`, `feed/all.json`, `feed/{hackathons,internships,scholarships,fellowships,exams,schemes}.json`
- Business model: [BUSINESS_MODEL.md](BUSINESS_MODEL.md) — free verified core, paid verified posting for
  organisations, college plan, later a labelled sponsorship tier
- Honesty rules: only items parsed from real official sources (Devpost API, Devfolio, NTA, CBSE,
  PIB Government of India, and a link-checked curated programme registry). A failing source
  contributes nothing — no demo data, ever. Pay-to-apply scam patterns are filtered out.
- Android app: `sahimauka-app/` (Expo SDK 58 / React Native; package `app.dastakde.android`)

## What the app does

- **Live feed** of verified opportunities with deadline countdowns and category filters.
- **Deadline reminders** and optional new-opportunity alerts, scheduled on-device.
- **Saved items**, tracked categories and a daily 09:00 digest stored locally.
- **Guided tour** on first launch, replayable from More.
- **Official source only** — every item opens its issuing organisation's page.
- No account, no analytics SDK, no ads SDK. Nothing about the user leaves the device.

## Update pipeline

`.github/workflows/feed.yml` runs every 2 hours (and on demand):

1. Runs the ingest tests (`python -m unittest discover -s ingest -t . -p "test_*.py"`).
2. Rebuilds the feed from the official sources (`python ingest/ingest.py`).
3. Commits and pushes `docs/feed/` only when the content changed.

The app refreshes the feed on launch, on foreground after 5 minutes, and via an Android
background task. It always shows the live state of the official sources.

## Business model

The verified feed, reminders and alerts are free forever. Revenue comes from organisations that
want a verified posting (₹499; free for government, non-profit and student-club postings) and from
a college plan (₹25,000/year; ₹10,000 charter price for the first 25 colleges). Sponsorship is
labelled, never disguised, and only opens after a real usage gate. See
[BUSINESS_MODEL.md](BUSINESS_MODEL.md) and the public pages at `/organizers.html` and
`/colleges.html`.

## Repository layout

| Path | Purpose |
|---|---|
| `sahimauka-app/` | Expo / React Native app (typed routes, React Compiler) |
| `ingest/` | Python stdlib ingestion, source adapters, tests |
| `docs/` | GitHub Pages site, feed JSON, privacy policy, demo media |
| `brand/` | Asset generator and exported icons, splash, feature graphic, OG image |
| `store/` | Play listing copy, release checklist, contact URLs |
| `.github/` | Feed refresh workflow and listing/college issue forms |

## Development

```bash
# App
cd sahimauka-app
npm install
npx tsc --noEmit
npx expo start

# Ingest + tests
python -m unittest discover -s ingest -t . -p "test_*.py" -v
python ingest/ingest.py

# Brand assets
python brand/make_assets.py
```

Android builds use the generated native project (CNG). See `store/RELEASE_CHECKLIST.md`.

## Privacy

No sign-up, no account, no analytics, no advertising SDK. Preferences and reminders stay in
app-local storage. The full policy is at
[`docs/privacy.html`](docs/privacy.html) and matches the Play Data Safety declaration (no data
collected, no data shared).

## Content corrections

Found a dead link or a wrong deadline? Open an issue:
https://github.com/humoge7502/dastakde/issues
