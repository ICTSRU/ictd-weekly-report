# ICTD Weekly Status Report — PDF Mailer

**Version 1.0** · pairs with the Weekly Status Report app **v4.2**
Sulaiman Al Rajhi University — Executive Directorate of Communications & Information Technology

Emails the compiled weekly report as a PDF to the CIO — on demand from a button, and automatically every Sunday at 08:00.

| | |
|---|---|
| **To** | nabounar@sr.edu.sa |
| **CC** | m.elmahdy@sr.edu.sa |
| **Link in every email** | https://ictsru.github.io/ictd-weekly-report/ |
| **Schedule** | Every Sunday, 08:00 Asia/Riyadh |
| **Sheet** | `ICTD Weekly Status Report - Data` → tab `Submissions` |

---

## Why the PDF is built on the server, not in the browser

At 08:00 on a Sunday nobody has the page open, so the browser cannot be the thing that makes the PDF. The scheduled send has to build it server-side regardless.

Rather than write that twice, **the button calls the same function the schedule does**. One code path, so the two can never drift apart — a change to the report layout lands in both at once, and what the CIO receives on Sunday is byte-for-byte what you see when you press the button.

```
Button on Compiled Report  ─┐
                            ├─► Apps Script ─► sheet ─► HTML ─► PDF ─► email (TO + CC + link)
Sunday 08:00 trigger       ─┘
```

---

## Install

### 1. Add the script

1. Open the sheet **ICTD Weekly Status Report - Data**
2. **Extensions → Apps Script**
3. **Files → + → Script**, name it `WeeklyReportMailer`
4. Paste in all of `WeeklyReportMailer.gs`, then **Save**

### 2. Check it builds before sending anything

Select **`testBuildOnly`** in the function dropdown and **Run**. Approve the permission prompts (Google will warn it is unverified — **Advanced → Go to WeeklyReportMailer**; it is your own script).

It writes a preview PDF to your Drive and logs the link. **No email is sent.** Open it and confirm the layout before going further.

### 3. Install the Sunday schedule

Select **`setup`** and **Run**. This also pins the spreadsheet's timezone to `Asia/Riyadh`, so 08:00 means 08:00 in Riyadh rather than wherever Google's default sits.

### 4. Deploy the web app, so the button can reach it

1. **Deploy → New deployment → ⚙ → Web app**
2. **Execute as:** Me · **Who has access:** Anyone
3. **Deploy**, then copy the **`/exec`** URL

### 5. Point the page at it

In `index.html`, find:

```js
const MAILER_URL = '';   // <-- paste the Apps Script /exec URL here
```

Paste the `/exec` URL between the quotes, save, and publish. The button goes live immediately.

Until that URL is set, the button says **"Not configured"** rather than failing silently.

---

## Using it

| Where | What happens |
|---|---|
| **Button** on the Compiled Report page | Asks for confirmation, then sends the selected week. Shows **Sent ✓** in green, or **Failed** in red with the reason. |
| **Sheet menu** → ICTD Report → Email last week's report now | Same send, without opening the app. |
| **Sunday 08:00** | Sends automatically. Nothing to remember. |

---

## Which week the Sunday run sends

It sends **the week that just ended** — the previous Sunday.

This is deliberate. At 08:00 on a Sunday the week starting that morning has no submissions in it yet, so reporting on it would email an empty document. The week that closed the night before is the one that is complete.

To change it, edit one constant:

```js
WEEKS_BACK: 1   // 1 = the week that just ended.  0 = the week starting this morning.
```

If a week has no submissions at all, nothing is sent and the reason is logged — the CIO never receives a blank report.

---

## Design notes

- **PDF rendering.** Apps Script converts HTML with an older engine: no flexbox, no CSS grid, no CSS variables. The report HTML is therefore built from **tables with inline styles** throughout. Editing it with modern CSS will silently break the layout.
- **No CORS preflight.** The button POSTs `text/plain`. Apps Script web apps cannot answer an `OPTIONS` request, so `application/json` would fail the preflight and the send would never arrive.
- **Issues / Risk stays red.** The PDF applies the same rule as the app — bold red wherever a sector entered anything, blank rows ignored.
- **Dates use local parts.** `toISOString()` is avoided throughout; it shifts to UTC and rolls the date back a day before 03:00 Riyadh, which would send the wrong week.
- **Week numbering matches the app.** Verified against the live dropdown: Sun 04 Oct 2026 is **W40** in both.
- **Concurrent sends are locked** with `LockService`, so the button and the trigger firing together cannot send twice.
- **Later row wins** when a sector appears more than once for a week, matching the app's upsert behaviour.

---

## Optional: lock the endpoint

The deployed URL is unauthenticated — anyone holding it can trigger a send to the CIO. The content is drawn only from your own sheet, so the exposure is nuisance rather than data loss, but to close it:

1. In the script, set `TOKEN: 'some-long-random-string'`
2. In `index.html`, set `MAILER_TOKEN` to the same string
3. Redeploy

Note this puts the token in the page source, so it only helps if the repo is private.

---

## Quotas

`MailApp` allows 1,500 recipients/day on Workspace. This uses 2 per send, so the limit is irrelevant in practice.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Button says **Not configured** | `MAILER_URL` is still empty in `index.html` |
| Button says **Failed**, "could not reach the mail service" | Deployment is not set to **Anyone**, or the `/exec` URL is wrong |
| **"No submissions found"** | That week genuinely has no rows — check the week selector |
| Mail never arrives on Sunday | Run `setup` again; check **Triggers** in the Apps Script sidebar shows `sendScheduledReport` |
| PDF layout looks broken | Modern CSS was added to the report HTML — it must stay tables + inline styles |

---

## Files

| File | Purpose |
|---|---|
| `WeeklyReportMailer.gs` | the script — paste into Apps Script |
| `README.md` | this file |

---

## Maintainer

Mohamed ElMahdy, IT Operations Manager, Sulaiman Al Rajhi University
