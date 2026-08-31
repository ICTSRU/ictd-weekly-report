# Changelog

All notable changes to the ICTD Weekly Status Report app.

## v2.0

- **Week Of (Sunday) is now a dropdown of Sundays only**, replacing the free date picker. Every option is guaranteed to be a Sunday, so a mid-week date can no longer be selected by mistake and split a week's data across two entries.
- Each option shows its ISO week number and full date — for example `W35 — Sun 30 Aug 2026` — with the current week marked and preselected.
- The list covers 12 past weeks through 4 weeks ahead, so late submissions and advance planning are both possible.
- Migrated the existing `CCCU` row in the Google Sheet to `DSSC` so its history stays visible under the renamed sector.

## v1.9

- Renamed the **CCCU — Contact Center / Customer Unit** sector to **DSSC — Digital Support and Service Center**, across the submission form, dashboard cards, trend table, and compiled report.

  Note: rows already saved under the old `CCCU` sector code remain in the Google Sheet under that code and will not appear under DSSC.

## v1.8

- Added visual separation on the Dashboard between the Coffee with IT attendance KPIs and the sector status cards: a fading divider line plus a **Sector Status** heading.
- The divider hides automatically when there are no Coffee with IT figures for the selected week, so the layout stays clean.

## v1.7

- **The form now clears automatically after a successful save.** Activities, issues, support needed, next week's tasks, events, attachments, Coffee with IT counts, status, and Submitted By are all reset, so the next person starts from a blank form with no risk of submitting someone else's data by mistake.
- The week and sector selections are kept, and the page scrolls back to the top after saving.
- Fixed spacing above the Event Support and Coffee with IT section headings.

## v1.6

- Moved the **Status Trend** table to the top of the Dashboard, above the sector status cards.
- Corrected the Dashboard description, which still referred to "all four sectors".

## v1.5

- **Event Support is now its own sector**, alongside NOC, SOC, CCCU, AAU and ICTD. It has its own dashboard card, trend column, and section in the compiled report.
- The event entry fields appear only when the **Event Support** sector is selected, matching how Coffee with IT appears only for ICTD.

## v1.4

- Added event entry fields: Event Name, Date, Time (From – To), Location, Attendees, Event Supported By, and Comment / Feedback. Add and remove entries freely; each card is numbered and titled by the event name.
- Events appear in the compiled CIO report as a formatted list, and as an "Events Supported" count on the dashboard.
- Added the `Events` sheet column (stored as JSON so all fields round-trip cleanly).
- **Fixed:** the "Add attachment" and "Add event" buttons threw a JavaScript error on every click. The generic add-item handler ran for any `.btn-add` button, including those with no `data-target`. Present since v1.0 and affecting the attachments button.

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
