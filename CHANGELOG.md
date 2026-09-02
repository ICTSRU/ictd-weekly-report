# Changelog

All notable changes to the ICTD Weekly Status Report app.

## v3.0

- Sectors now display a readable label instead of their internal code: **Coffee with IT** rather than `CoffeeIT`, and **Event Support** rather than `Events`. Applied to the dashboard cards, the trend table headers, the compiled report cover chips, and the "no submission" message.
- The stored sector codes are unchanged, so existing sheet data is unaffected.

## v2.9

- **Removed the manual Coffee with IT count fields from the ICTD sector.** Since v2.8 the dashboard derives these figures from the Coffee with IT session entries, so the manual fields no longer affected anything and were misleading to fill in.
- Also removed the matching "Coffee with IT — Attendance" row from the compiled report, and the now-unused styles.
- The `CoffeeStudent` / `CoffeeStaff` / `CoffeeAdmin` columns are left in the Google Sheet with their existing values, so no historical data is lost. They are simply no longer written to or read.

## v2.8

- **Coffee with IT status is now set automatically from the session count** — 1 or fewer = Critical, 2–3 = At Risk, more than 3 = On Track. The manual status buttons are replaced by a live badge that updates as sessions are added or removed, and the computed value is what gets saved.
- The dashboard **Coffee with IT KPI strip now reads from the session entries** rather than the manual counts under ICTD. It shows total sessions plus a breakdown by audience (Academic / Student / Admin), and hides itself when no sessions were recorded for that week.

  Note: the manual Coffee with IT count fields under the **ICTD** sector no longer feed the dashboard. They still save to the `CoffeeStudent` / `CoffeeStaff` / `CoffeeAdmin` columns, but nothing displays them.

## v2.7

- Added **Session Date** and **Attendance Email** to the Coffee with IT session entries. Both appear in the compiled CIO report alongside the existing session details.
- No sheet change was needed: sessions are stored as JSON in the existing `Sessions` column, so older entries without these fields still load correctly.

## v2.6

- **Fixed a timezone bug that could save a report against the wrong week.** Date strings were built with `toISOString()`, which converts to UTC; in Saudi time (UTC+3) any moment before 03:00 local rolled the date back a day, so a report filed early on a Sunday was stored against the previous Saturday and appeared as its own row on the dashboard trend. All week handling now uses local date parts.
- Weeks are displayed as `W35 — Sun 30 Aug 2026` everywhere — the dashboard week selector, the trend table, the compiled report selector, and the report cover — instead of a bare date.
- Any stored week value that is not a Sunday is normalised to the Sunday of its week when read, so older or imported rows merge into the correct week instead of creating a phantom column.

## v2.5

- **Event Supported By** is now a dropdown drawing from the same shared `TEAM_NAMES` list as Submitted By and Presented By.
- As with the other name fields, a value from an older entry that is not on the list is preserved and added to the dropdown when that entry is loaded.

## v2.4

- **Submitted By** and **Presented By** are now dropdown lists instead of free-text fields, drawing from one shared list of team members. This keeps names spelled consistently so they group correctly in reporting.
- If an older entry contains a name that is no longer on the list, that name is added to the dropdown when the entry is loaded, so existing data is never silently changed.

To edit the list of names, change the `TEAM_NAMES` array near the top of the script in `index.html`.

## v2.3

- The generic fields (Key Activities, Issues / Risks, Support Needed, Tasks for Next Week) are now **hidden for the Coffee with IT and Event Support sectors**, which have their own dedicated fields instead.
- Those fields are also omitted from the dashboard cards and the compiled report for those two sectors, so their sections show only what is relevant.
- Anything typed into the generic fields before switching to one of those sectors is not submitted, so no stale text can leak into a Coffee with IT or Event Support entry.

## v2.2

- Added a **Coffee with IT** sector, with its own dashboard card, trend column, and section in the compiled report.
- Its session entries capture Session Topic, Duration, Type of Attendance (Academic / Student / Admin), and Presented By. Add one entry per session; each card is numbered and titled by the topic.
- Sessions appear in the compiled CIO report as a formatted list, and as a "Sessions Held" count on the dashboard.
- Added the `Sessions` sheet column (stored as JSON so all fields round-trip cleanly).

  Note: the Coffee with IT **attendance counts** (Students / Staff / Admin) still live under the **ICTD** sector and feed the dashboard KPI strip. The two are independent.

## v2.1

- Centred the navigation tabs (Submit Report / Dashboard / Compiled Report) in the purple bar instead of left-aligning them.

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
