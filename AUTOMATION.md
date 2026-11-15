# Automated deployment — ICTD Weekly Status Report

Deploys the Apps Script web app from this repo via GitHub Actions + clasp.

## How it triggers

| Trigger | What happens |
| --- | --- |
| **Push to `main`** touching `apps-script/**` | Deploys the version **already in the files** — no bump. You set the version deliberately; CI just ships it. |
| **Actions → Deploy Apps Script → Run workflow** | Optional bump first (`none` / `minor` / `major`), then deploy. |

A deploy = `clasp push --force` (makes the live project match `apps-script/`) → new script version → update the **one existing deployment** in place. The deployment ID is reused so the web-app `/exec` URL never changes.

## Versioning is deliberate

Auto-bump-on-every-push is intentionally **off** — it would fight the one-digit scheme and relabel work (a night-mode change becoming "v6.0" just because it merged). Instead:

```bash
node tools/bump-version.js --check          # show current
node tools/bump-version.js --note "what changed"   # minor: 5.9 -> 6.0
node tools/bump-version.js --major
node tools/bump-version.js --set 7.0
```

The tool updates `VERSION`, `apps-script/Code.gs` (`APP_VERSION`), the three markers in `apps-script/Index.html` (title, header badge, footer), the landing `index.html`, and prepends a `CHANGELOG.md` entry dated in **Asia/Riyadh**. It validates every marker before writing anything — if a version string moved, it fails naming the file and changes nothing, so a page can never ship showing a stale version. One digit after the decimal: after x.9 comes (x+1).0, never x.10.

## Required files (CI refuses to deploy without them)

The "project is complete" guard checks all five, because `clasp push --force` deletes anything not in the folder:

```
apps-script/appsscript.json
apps-script/Code.gs
apps-script/Index.html
apps-script/Denied.html
apps-script/Logos.html
```

## Secrets

| Secret | What it is |
| --- | --- |
| `CLASPRC_JSON` | Contents of your local `~/.clasprc.json` (from `clasp login`) |
| `SCRIPT_ID` | Apps Script project ID |
| `DEPLOYMENT_ID` | The deployment the landing-page URL points at (begins with the same `AKfycb…` as that URL) |

## Things that will bite you

| Issue | Why | Fix |
| --- | --- | --- |
| `Invalid credentials` on push | `CLASPRC_JSON` expired / revoked (password change, admin reset) | re-run `clasp login` locally, update the secret |
| clasp pinned to 2.4.2 | clasp 3.x changed the auth-file format; it rejects a v2 `.clasprc.json` | leave the pin unless you migrate the secret |
| Wrong `DEPLOYMENT_ID` | deploy updates a different deployment → different URL goes live | copy the ID whose prefix matches the URL in `index.html` |
| Secrets in logs | — | never echoed; validated non-empty; `~/.clasprc.json` + `.clasp.json` deleted in an `always()` step |
