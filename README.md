# ICTD Weekly Status Report — v5.2 (secured)

Sulaiman Al Rajhi University — Executive Directorate of Communications & Information Technology

**Current version: v5.2** · Secure Access Kit v1.4 applied

---

## What changed in v5.0

The report used to be a static page on GitHub Pages that called four n8n webhooks straight from the browser. Anyone who opened the page could read every sector's report, and anyone who viewed source could read, write or mail without being a university user at all.

v5.0 moves the app behind a Google sign-in restricted to **@sr.edu.sa** accounts on an allow-list, and moves every server call into Apps Script.

```
ictsru.github.io/ictd-weekly-report   →   Google sign-in (@sr.edu.sa)   →   Apps Script Web App
   (branded landing page, no data)         (Google's own page)              (the report; domain + list checked)
                                                                                      │
                                                                                      └── UrlFetchApp → n8n → Sheets / Drive / Gmail
```

| | Before (v4.7) | After (v5.0) |
|---|---|---|
| Who can open the report | anyone with the link | @sr.edu.sa, on the `AllowedUsers` list |
| Webhook URLs | in page source, publicly readable | server-side only, never sent to the browser |
| Who submitted | whatever the dropdown said | dropdown **plus** the signed-in account, stamped server-side |
| Sign-in record | none | every sign-in logged to `AccessLog` |

---

## ⚠️ Rotate the n8n webhook paths

The four webhook URLs sat in a public page for weeks. Removing them from the page does **not** un-publish them — anyone who copied them can still call them, and the GitHub history still holds them.

After this migration works, change the path on each n8n webhook node (for example `ictd-submit` → `ictd-submit-v5`), then update the four `N8N_*` constants in `Code.gs`. Until you do, the old URLs remain usable by anyone who kept them.

---

## Contents

| Path | Purpose |
|---|---|
| `index.html`, `assets/`, `.nojekyll` | the branded sign-in landing page — this is what GitHub Pages serves |
| `apps-script/Code.gs` | CONFIG, access check, access log, and the four n8n proxy functions |
| `apps-script/Index.html` | the report itself (the v4.7 app, with `fetch` replaced by `google.script.run`) |
| `apps-script/Logos.html` | SRU / ICTD / ITOC logos, used by `Denied.html` |
| `apps-script/Denied.html` | shown to non-university or non-listed accounts |
| `n8n/` | the email workflow — unchanged by this migration |

---

## Deploy (about 20 minutes)

### 1. Apps Script

1. Open the sheet **ICTD Weekly Status Report - Data** → **Extensions → Apps Script**
2. Create four files and paste in the matching contents:
   - `Code.gs` (replaces the default `Code.gs`)
   - `Index.html` · `Logos.html` · `Denied.html` (**File → + → HTML**, name them exactly, no `.html` suffix in the name field)
3. **Save**
4. Run **`setupAccessList`** once and approve the permission prompt. It creates the `AllowedUsers` tab and seeds the ICTD team.
5. Run **`setupSectorOwners`** once. It creates the `SectorOwners` tab from the access matrix — who may *save* each sector.
6. Run **`testN8nEndpoints`** — it should log `DATA: ok, N rows`. If it fails, the n8n side is wrong, not this.
7. **Deploy → New deployment → Web app**
   - Execute as **Me**
   - Who has access **Anyone within Sulaiman Al Rajhi University**
8. Copy the **`/exec`** URL

### 2. Landing page

1. In the repo, replace the old root `index.html` with the one from this package, and add `assets/` and `.nojekyll`
2. `CONFIG.WEB_APP_URL` is already set to the live deployment:
   `https://script.google.com/a/macros/sr.edu.sa/s/AKfycbz…/exec`
   Only change it if you ever create a *new* deployment rather than a new version.
3. Commit and let Pages rebuild

### 3. Test

| Test | Expected |
|---|---|
| Your own account | the report opens |
| Incognito | Google sign-in, then the report |
| A personal Gmail | the "university accounts only" page |
| An @sr.edu.sa account not on the list | the "الوصول مقيّد" page, with their e-mail |
| The sheet | a new row in `AccessLog` for each of the above |

Then submit one sector and press **Email Report to CIO** to confirm the proxied calls work end to end.

---

## Access list

The `AllowedUsers` tab decides who gets in: `email · name · role · active · notes`.

- Add a row to grant access, untick **active** to suspend, delete the row to remove. Changes apply within two minutes.
- `OWNER_EMAILS` (`m.elmahdy@sr.edu.sa`) is always allowed, so you cannot lock yourself out.
- The list is seeded with the full 13-account ICTD team. The weekly report is filled by every sector manager and read by the CIO, so it was left wide rather than guessed narrow — trim `DEFAULT_ALLOWED` in `Code.gs` and remove the rows if you want it tighter.
- To drop the list entirely and allow any university account, set `ACCESS_MODE = 'DOMAIN'`.

---

## Sector ownership — who may save what

Signing in lets you **read** every sector. **Saving** is limited by the `SectorOwners` tab, from `Access_weekely_report_matrix.xlsx`:

| Sector | May save |
|---|---|
| NOC · SOC | `n.nawaz@sr.edu.sa` *(+ Atef — see below)* |
| DSSC | `m.omar@sr.edu.sa` |
| AAU | `m.saleh@sr.edu.sa` |
| ICTD · Event Support · Coffee with IT | `ALL` — any allow-listed user |
| M. ElMahdy / Ammar / Nayed / Abd Alazez / Azzam | that person only |

`m.elmahdy@sr.edu.sa` can save every sector (`SECTOR_SUPER_EDITORS`).

- Edit the `owners` cell to change ownership — `ALL`, or e-mails separated by commas. No redeploy; changes apply within two minutes.
- Enforcement is **server-side** in `apiSubmit`. The disabled Save button is a courtesy, not the control.
- A missing or empty tab falls back to the matrix in `Code.gs`, so a fresh install is enforced rather than open.

### ⚠️ Add Atef's e-mail

The matrix gives NOC and SOC to `n.nawaz` **and "Atef"**. No address in the ICTD list clearly matches that name, so rather than guess and hand someone edit rights by accident, both rows were seeded with `n.nawaz@sr.edu.sa` only.

Open `SectorOwners`, and in the `owners` cell for **NOC** and **SOC** make it:

```
n.nawaz@sr.edu.sa, atef.actual.address@sr.edu.sa
```

Until then, Atef can read those sectors but not save them.

---

## Access log

`AccessLog` records `timestamp · date · time · day · email · result · version`. Same user within 30 minutes counts once. Denied attempts are logged too — `مرفوض` for a non-university account, `غير مدرج` for one not on the list.

The sheet menu **ICTD Weekly Status Report** has a 30-day summary and a purge for entries older than 180 days.

**Keep this spreadsheet private.** It now holds staff e-mail addresses as well as the reports.

---

## Updating later

| To change | Do |
|---|---|
| The report UI | edit `Index.html`, then **Deploy → Manage deployments → ✏️ → Version: New version** (the URL stays the same) |
| Who can get in | edit the `AllowedUsers` tab — no redeploy |
| An n8n endpoint | edit the `N8N_*` constants in `Code.gs`, then redeploy |

A new deployment (rather than a new version) issues a **new URL** and would break the landing page link. Always use *Manage deployments → edit → New version*.

---

## Notes and limits

- **Execute as Me** lets the page read the sheet without sharing it with every user. The trade-off is that all n8n calls are made as you, so the `AccessLog` and the server-side `savedBy` stamp are what identify the actual user.
- Attachments are capped at **10 MB**, now passed through `google.script.run` as base64. Large files are slower than before, since they travel browser → Apps Script → n8n rather than straight to n8n.
- `Index.html` is a single file of about 165 KB, served by the Apps Script HTML service inside a sandboxed iframe. Browser storage APIs are unavailable there — the app does not use any.
- One `onOpen` per Apps Script project. If you later add the PDF mailer to this same project, merge its menu items into the `onOpen` in `Code.gs` instead of declaring a second one.

---

## Maintainer

Mohamed ElMahdy, IT Operations Manager, Sulaiman Al Rajhi University
