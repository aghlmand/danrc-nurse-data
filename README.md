# danrc nurse-jobs data

Nightly snapshot of nursing job ads in Germany from the public job search of the
Bundesagentur für Arbeit (BA), used by https://danrc.com/services/nurse-jobs-germany

- `data/summary.json` – counts (all nursing ads, 14 cities, specialties), ads per federal state, history
- `data/jobs.json` – active ads that mention recognition of foreign degrees (Anerkennung)
- `data/history.json` – daily counts
- `data/db.json` – every ad seen in the last 180 days with first/last seen dates

Updated every day at 02:30 UTC by `.github/workflows/update.yml` (`node scripts/update.mjs`).
Source: Bundesagentur für Arbeit – Jobsuche. Ads belong to the publishing employers.
