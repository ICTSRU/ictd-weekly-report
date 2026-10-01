# ICTD Weekly Report — Email to CIO (n8n)

**Workflow version 1.1** · pairs with the Weekly Status Report app **v4.5**
Sulaiman Al Rajhi University — ICTD

Emails the full weekly report to the CIO — from a button on the Compiled Report page, and automatically every Sunday at 08:00.

| | |
|---|---|
| **To** | nabounar@sr.edu.sa |
| **CC** | m.elmahdy@sr.edu.sa |
| **Link in every email** | https://ictsru.github.io/ictd-weekly-report/ |
| **Schedule** | `0 8 * * 0` — Sunday 08:00, workflow timezone `Asia/Riyadh` |
| **Source** | Google Sheet `ICTD Weekly Status Report - Data`, tab `Submissions` |

---

## Which week gets sent

**The Sunday it fires is the week it reports.** Firing **Sunday 04 Oct 2026 at 08:00** sends **W40 — Sun 04 Oct 2026**.

This works because the app marks **current week + 7** as the ACTIVE WEEK, so sector managers fill the upcoming week in advance. By Sunday morning, that Sunday's week already holds its submissions.

Verified against the clock:

| Fires (Riyadh) | Sends |
|---|---|
| Sun 27 Sep 2026, 08:00 | W39 — Sun 27 Sep 2026 |
| **Sun 04 Oct 2026, 08:00** | **W40 — Sun 04 Oct 2026** |
| Sun 11 Oct 2026, 08:00 | W41 — Sun 11 Oct 2026 |

If a week has no submissions, **nothing is sent** — the `Has Data?` branch stops it, so the CIO never receives an empty report.

---

## The report is both inline AND attached as a PDF

The email body carries the full report — header band, RAG summary, a card per sector, Issues / Risk in bold red, link button — so the CIO can read it without opening anything, including on a phone.

A **PDF of the same report is attached** for filing and forwarding.

### How the PDF is made

n8n Cloud has no HTML-to-PDF node. Rather than send university report data to a third-party converter, a tiny Apps Script endpoint does the conversion:

```
Build Email ──► Render PDF (Apps Script) ──► PDF to File ──► Send to CIO
   │                                                              ▲
   └──────────────── email body HTML ─────────────────────────────┘
```

**`Build Email` produces both outputs from the same `sectorCards()` function**, so the attachment and the email body cannot drift apart. The Apps Script knows nothing about the report — it takes HTML and returns a PDF, and that is all it does.

The two differ only in their wrapper: the PDF drops the page background and the CTA button, and adds a "Generated" timestamp.

---

## Install

### Step 1 — Deploy the PDF renderer (do this first)

1. Go to [script.google.com](https://script.google.com) → **New project**, name it `ICTD HTML to PDF`
2. Paste in all of `HtmlToPdf.gs`, **Save**
3. Run **`testRender`** once and approve the permission prompt. It writes a test PDF to your Drive and logs the link — open it to confirm conversion works before wiring anything up.
4. **Deploy → New deployment → Web app** · Execute as **Me** · Access **Anyone** → **Deploy**
5. Copy the **`/exec`** URL

### Step 2 — Import the workflow

1. n8n → **Workflows → Import from File** → `ICTD_Weekly_Report_Email.json`
2. Open **Render PDF** → replace `PASTE_APPS_SCRIPT_EXEC_URL_HERE` in the URL field with the `/exec` URL from step 1
3. Open **Get Submissions** → pick your **Google Sheets** credential
4. Open **Send to CIO** → pick your **Gmail** credential
   *(Using SMTP instead? Replace this node with **Send Email** — To, CC, Subject `{{ $('Build Email').item.json.subject }}`, HTML `{{ $('Build Email').item.json.html }}`, and attach the binary property `data`.)*
5. Confirm the workflow timezone is **Asia/Riyadh** — Workflow **Settings → Timezone**
6. **Save**, then toggle **Active** (the schedule only runs while the workflow is active)

### The shared token

The Apps Script endpoint is public, so it is gated on a token. The same value appears in two places and must match:

- `HtmlToPdf.gs` → `var TOKEN = '...'`
- n8n **Render PDF** node → the `token` field in the JSON body

A token is already set in both. Change it if you like — just change it in both.

### Wire up the button

Open **Email Button Webhook**, copy the **Production URL**, and paste it into `index.html`:

```js
const MAILER_URL = '';   // <-- paste the n8n Production webhook URL here
```

Until that is set the button reads **"Not configured"** rather than failing silently.

---

## Test before going live

1. Open **Resolve Week** → **Execute step**. Check `weekOf` and `weekLabel` are the week you expect.
2. **Execute Workflow** with **Send to CIO** disabled (right-click → Deactivate) and inspect the output — **Build Email** `html` is the email body, and **PDF to File** should show a binary PDF of a few tens of KB.
3. Re-enable **Send to CIO** and run once with your own address in `sendTo` before pointing it at the CIO.

---

## The workflow

```
Every Sunday 08:00 ─┐
                    ├─► Resolve Week ─► Get Submissions ─► Build Email ─► Has Data? ─┬─► Render PDF ─► PDF to File ─► Send to CIO ─► Sent
Email Button Webhook┘                                                                 └─► Nothing to Send
```

| Node | Does |
|---|---|
| **Every Sunday 08:00** | Schedule trigger, `0 8 * * 0` |
| **Email Button Webhook** | `POST /ictd-report-email`, CORS open, responds with the last node |
| **Resolve Week** | Picks the week: the firing Sunday, or the week the button asked for |
| **Get Submissions** | Reads the sheet |
| **Build Email** | Filters to the week, orders sectors, renders **both** the email HTML and the PDF HTML |
| **Has Data?** | Stops the send when the week is empty |
| **Render PDF** | POSTs the PDF HTML to the Apps Script endpoint, gets base64 back |
| **PDF to File** | Turns that base64 into a binary PDF attachment |
| **Send to CIO** | Gmail — To, CC, HTML body, PDF attached |
| **Sent** / **Nothing to Send** | Shapes the JSON the button reads back |

---

## Design notes

- **Both triggers share one path.** The schedule and the button differ only in how `Resolve Week` picks the week, so the two emails can never drift apart.
- **Tables and inline styles only.** Email clients strip `<style>` blocks and ignore flexbox and grid. Editing the HTML with modern CSS will silently break it in Outlook.
- **Riyadh time is taken explicitly.** Code nodes run in UTC, so `Resolve Week` re-reads the clock in `Asia/Riyadh` before taking date parts. Tested at 00:30 Riyadh, where a naïve UTC read would roll back to Saturday and send the wrong week.
- **Later row wins** when a sector appears twice in a week, matching the app's upsert.
- **Sector order follows the app's** `SECTORS` array, not sheet order.
- **Blank rows are not risks** — the same rule as the app, so an empty starter row does not turn Issues / Risk red.

---

## Security

The webhook is unauthenticated: anyone with the URL can trigger a send to the CIO. Content comes only from your own sheet, so this is nuisance rather than data loss. To close it, add a Header Auth credential to the webhook node and send the matching header from the page — note that puts the secret in the page source, so it only helps while the repo is private.

---

## Files

| File | Purpose |
|---|---|
| `ICTD_Weekly_Report_Email.json` | the workflow — import this |
| `HtmlToPdf.gs` | the PDF renderer — deploy this as an Apps Script web app |
| `_resolve_week.js` | the Resolve Week code, standalone for review |
| `_build_email.js` | the Build Email code, standalone for review |
| `README.md` | this file |

The two `_*.js` files are the same code embedded in the JSON, kept separately so they can be read and diffed outside n8n.

---

## Maintainer

Mohamed ElMahdy, IT Operations Manager, Sulaiman Al Rajhi University
