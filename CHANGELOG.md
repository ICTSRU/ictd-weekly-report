# Changelog

All notable changes to the ICTD Weekly Status Report app.

## v1.3

- Redesigned the top banner: official **ICTD circular logo** on the left and the **Arabic ICTD logo** (الإدارة التنفيذية للإتصالات وتقنية المعلومات) on the right, both on white rounded chips for contrast against the purple header.
- Added a subtle diagonal accent shape to the banner, echoing the ICTD brand design.
- Logos are embedded as base64 so the file stays fully self-contained with no external image dependencies.
- Banner reflows on mobile: logos shrink and the date/Arabic logo move to their own row.

## v1.2

- Added **Coffee with IT** attendance counts (Students / Staff / Admin), shown only when the **ICTD** sector is selected.
- Added a Coffee with IT KPI strip at the top of the Dashboard, with a Total card.
- Added Coffee with IT attendance to the compiled CIO report.
- Added sheet columns `CoffeeStudent`, `CoffeeStaff`, `CoffeeAdmin`.
- **Fixed:** submissions failed silently when the sheet had no data rows. The lookup step returned no items, so the chain stopped before writing while still returning success to the browser. The first submission against an empty sheet was lost.

## v1.1

- Renamed the **Operation** sector to **ICTD** across the form, dashboard, trend table, and compiled report.

## v1.0

- Added version number to the page title, header badge, and footer; version now matches the filename.
- Added **Attachments**: sector managers upload files directly to Google Drive with a short brief for each. Files are auto-shared so the CIO can open them from the report. 10 MB cap.
- Added **Tasks (Key Activities) for Next Week**.
- Removed **KPIs / Metrics** from the form, dashboard, and report. The sheet column is retained for historical data.
- Converted Key Activities, Issues, Support Needed, and Next Week Tasks into numbered add/remove list inputs.
- Visual redesign: Cairo font, Lucide icons, per-sector icons, softer shadows and radii, bold black headings for readability, mobile layout.
- **Fixed:** every sector submitted in the same week overwrote the same row. n8n's `appendOrUpdate` was matching on `WeekOf` only and ignoring `Sector`. Replaced with an explicit lookup-then-update-or-append flow.

## v0.1 — initial build

- Three-tab app: Submit Report, Dashboard, Compiled Report (for CIO).
- Sectors: NOC, SOC, CCCU, AAU.
- Weekly submission keyed on week + sector, with edit-in-place on resubmission.
- Dashboard with per-sector status cards and an 8-week RAG trend table.
- Printable compiled report for the CIO.
- Backend: n8n workflow writing to Google Sheets.
