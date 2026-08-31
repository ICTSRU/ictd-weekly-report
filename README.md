# ICTD Weekly Status Report

Internal web app for **Sulaiman Al Rajhi University — Executive Directorate of Communication & Information Technology (ICTD)**.

Replaces the previous PowerPoint-based weekly report with a structured web form, a live dashboard, and a print-ready report for the CIO.

**Current version: v1.2**

---

## ⚠️ Keep this repository PRIVATE

`index.html` contains live, unauthenticated n8n webhook URLs. If this repo is public, anyone can:

- read all submitted weekly reports,
- write or overwrite rows in the backing Google Sheet,
- upload arbitrary files into the university Google Drive folder.

Do not make this repository public without first adding authentication to the n8n endpoints.

---

## What it does

| Tab | Purpose |
|---|---|
| **Submit Report** | Each sector manager submits their weekly update: status, activities, issues, support needed, next week's tasks, and attachments. |
| **Dashboard** | Live status across all sectors for a chosen week, Coffee with IT attendance KPIs, and an 8-week RAG trend table. |
| **Compiled Report (for CIO)** | All sectors combined into one branded, printable report. Print → Save as PDF. |

### Sectors

- **NOC** — Network Operations Center
- **SOC** — Security Operations Center
- **CCCU** — Contact Center / Customer Unit
- **AAU** — Applications & Automation Unit
- **ICTD** — includes the Coffee with IT attendance counts (Students / Staff / Admin)

### Submission behaviour

Reports are keyed on **week + sector**. Submitting again for the same week and sector **updates** the existing entry rather than creating a duplicate. Use **Load My Existing Entry** to pull back and edit a previous submission.

---

## Architecture

```
index.html  (static, no build step)
     │
     ├── POST /ictd-submit  ──► n8n ──► Google Sheets (upsert by week + sector)
     ├── GET  /ictd-data    ──► n8n ──► Google Sheets (read all rows)
     └── POST /ictd-upload  ──► n8n ──► Google Drive (upload + share) ──► returns link
```

- **Front end:** single self-contained HTML file. No framework, no build, no dependencies to install.
- **Backend:** n8n workflow `ICTD Weekly Report - API`.
- **Data store:** Google Sheet `ICTD Weekly Status Report - Data`, tab `Submissions`.
- **Attachments:** Google Drive folder `ICTD Weekly Report - Attachments`.

### Sheet columns

`Timestamp`, `WeekOf`, `Sector`, `Status`, `KeyActivities`, `Issues`, `KPIs` *(unused)*, `SupportNeeded`, `SubmittedBy`, `NextWeekTasks`, `Attachments`, `CoffeeStudent`, `CoffeeStaff`, `CoffeeAdmin`

---

## Running it

Open `index.html` in a browser. That's it — it calls the n8n endpoints directly.

To serve it locally over HTTP:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## Making changes

Everything lives in `index.html` — styles, markup, and logic in one file.

Common edit points:

| To change | Look for |
|---|---|
| Sectors | the `SECTORS` array, and the `<select id="f-sector">` options |
| Brand colours | the `:root` CSS variables |
| Backend URLs | `API_BASE` and `UPLOAD_URL` |
| Attachment size cap | `MAX_ATTACH_MB` (currently 10) |

### Versioning

Every change must bump the version in **three** places in `index.html`:

1. `<title>` — `ICTD Weekly Status Report — vX.Y`
2. the header badge — `<span class="version-badge">vX.Y</span>`
3. the page footer — `Version X.Y · Sulaiman Al Rajhi University`

- **Minor** (v1.3, v1.4…) — styling, new fields, small fixes
- **Major** (v2.0) — structural change: new backend, new module, reworked data model

Record what changed in `CHANGELOG.md`.

---

## Known limits

- Attachments are capped at **10 MB** (base64 through the n8n webhook).
- Uploaded attachments are shared as **anyone with the link can view**, so the CIO can open them without individual permission grants. Tighten this if data governance requires it.
- The `KPIs` sheet column is retained for historical data but is no longer collected in the form.
- The n8n endpoints have **no authentication**. Anyone with the URLs can read and write data.

---

## Maintainer

Mohamed ElMahdy, IT Operations Manager, Sulaiman Al Rajhi University
