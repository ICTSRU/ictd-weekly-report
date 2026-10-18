/**
 * =====================================================================
 *  ICTD Weekly Status Report — secured web app
 *  Built on SRU Secure Access Kit v1.4
 *  Access: Sulaiman Al Rajhi University Google accounts (@sr.edu.sa),
 *          further restricted to the AllowedUsers list.
 *  ICTD — ITOC
 * ---------------------------------------------------------------------
 *  Files:  Code.gs · Index.html · Logos.html · Denied.html
 *  Bind:   open the sheet "ICTD Weekly Status Report - Data"
 *          -> Extensions > Apps Script
 *  Deploy: Deploy > New deployment > Web app
 *          Execute as: Me
 *          Who has access: Anyone within Sulaiman Al Rajhi University
 * ---------------------------------------------------------------------
 *  WHY THE n8n CALLS MOVED HERE
 *  The page used to call four n8n webhooks straight from the browser, so
 *  those URLs sat in page source on a public GitHub Pages site — anyone
 *  could read every report, overwrite rows, upload into the university
 *  Drive folder, or mail the CIO. They are now called from this file with
 *  UrlFetchApp, behind requireSruUser_(). The browser never sees them.
 * =====================================================================
 */

/* ▼▼▼ CONFIG — change per platform ▼▼▼ */
const APP_NAME       = 'التقرير الأسبوعي لحالة تقنية المعلومات';
const APP_NAME_EN    = 'ICTD Weekly Status Report';
const APP_VERSION    = '5.1';
const ALLOWED_DOMAIN = 'sr.edu.sa';
const FAVICON_URL    = 'https://ictsru.github.io/ITOC/assets/itoc-logo.png';

/* n8n endpoints — server-side only. Never expose these to the page. */
const N8N_BASE    = 'https://elmahdy2020.app.n8n.cloud/webhook';
const N8N_SUBMIT  = N8N_BASE + '/ictd-submit';
const N8N_DATA    = N8N_BASE + '/ictd-data';
const N8N_UPLOAD  = N8N_BASE + '/ictd-upload';
const N8N_MAILER  = N8N_BASE + '/ictd-report-email';
const N8N_TIMEOUT_NOTE = 'UrlFetchApp has a fixed timeout; large uploads may need a retry.';

/* Access log */
const LOG_ENABLED        = true;
const LOG_SPREADSHEET_ID = '';            // '' = the spreadsheet this script is bound to
const SHEET_LOG          = 'AccessLog';
const LOG_TIMEZONE       = 'Asia/Riyadh';
const LOG_DEDUP_MINUTES  = 30;
const LOG_RETENTION_DAYS = 180;

/* Access list (who may open the platform) */
const ACCESS_MODE           = 'LIST';     // 'LIST' = only active emails below · 'DOMAIN' = any @sr.edu.sa
const ACCESS_SPREADSHEET_ID = '';
const SHEET_ACCESS          = 'AllowedUsers';
const OWNER_EMAILS          = ['m.elmahdy@sr.edu.sa'];

/**
 * Default access list. Left at the full ICTD team on purpose: the weekly
 * report is filled by every sector manager and read by the CIO. Trim this
 * array before the first setupAccessList() run if you want it narrower —
 * removing a line later needs the AllowedUsers row removed too.
 */
const DEFAULT_ALLOWED = [
  // [email, name, role, notes]
  ['nabounar@sr.edu.sa',    'Nasser Abounar',  'admin', 'CIO — reads the compiled report'],
  ['m.elmahdy@sr.edu.sa',   'Mohamed ElMahdy', 'admin', 'Owner — IT Operations Manager'],
  ['n.nawaz@sr.edu.sa',     'Mohamed Nawaz',   'user',  'SOC'],
  ['m.omar@sr.edu.sa',      '',                'user',  ''],
  ['m.saleh@sr.edu.sa',     'Mohamed Saleh',   'user',  'AAU'],
  ['a.alrowedan@sr.edu.sa', 'Ammar Al Rowedan','user',  'NOC'],
  ['n.alrashidi@sr.edu.sa', 'Nayed Alrashidi', 'user',  ''],
  ['a.alawaji@sr.edu.sa',   'Abd Alazez Al Awaji', 'user', ''],
  ['a.alaqeel@sr.edu.sa',   'Azzam Al Aqeel',  'user',  'Event Support'],
  ['a.alolayan@sr.edu.sa',  '',                'user',  ''],
  ['s.albusayli@sr.edu.sa', '',                'user',  ''],
  ['i.almutairi@sr.edu.sa', '',                'user',  ''],
  ['a.elnadi@sr.edu.sa',    '',                'user',  '']
];
const ACCESS_CACHE_SECONDS = 120;
/* ▲▲▲ CONFIG ▲▲▲ */

const LOG_HEADERS = ['timestamp', 'date', 'time', 'day', 'email', 'result', 'version'];
const DAYS_AR_    = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/* ----------------------------- Web app ------------------------------ */

function doGet() {
  const email = currentEmail_();
  const status = accessStatus_(email);
  if (status !== 'ok') {
    logAccess_(email || '(unknown)', status === 'list' ? 'not-listed' : 'denied');
    const d = HtmlService.createTemplateFromFile('Denied');
    d.appName = APP_NAME; d.appNameEn = APP_NAME_EN;
    d.userEmail = email || '';
    d.reason = status;
    return d.evaluate().setTitle(APP_NAME + ' | غير مصرح')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  logAccess_(email, 'granted');

  const t = HtmlService.createTemplateFromFile('Index');
  t.appName   = APP_NAME;
  t.appNameEn = APP_NAME_EN;
  t.version   = APP_VERSION;
  t.userEmail = email;
  t.dataJson  = safeJson_(getInitialData_());
  const out = t.evaluate().setTitle(APP_NAME_EN + ' | ' + APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  if (FAVICON_URL) out.setFaviconUrl(FAVICON_URL);
  return out;
}

/**
 * Rendered into the page so the dashboard paints without a round trip.
 * A failure here must not stop the page loading — the client falls back
 * to calling apiGetData() itself.
 */
function getInitialData_() {
  try {
    return { rows: n8nGet_(N8N_DATA), loadedAt: new Date().toISOString() };
  } catch (e) {
    console.error('getInitialData_ failed: ' + e);
    return { rows: [], error: String(e && e.message || e) };
  }
}

/* ------------------- Server calls from the page --------------------- */
/*  Every one starts with requireSruUser_(). The page-load check alone is
 *  not enough: google.script.run is reachable independently of doGet.   */

/** Read every submission row. */
function apiGetData() {
  requireSruUser_();
  return n8nGet_(N8N_DATA);
}

/** Upsert one sector's weekly report. */
function apiSubmit(payload) {
  const email = requireSruUser_();
  if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
  // Stamp the signed-in account so the sheet records who actually saved it,
  // independent of whatever the form's "Submitted By" dropdown says.
  payload.savedBy = email;
  return n8nPost_(N8N_SUBMIT, payload);
}

/** Upload one attachment (base64) and return its shared link. */
function apiUpload(file) {
  requireSruUser_();
  if (!file || !file.fileData) throw new Error('No file supplied');
  const out = n8nPost_(N8N_UPLOAD, {
    fileName: String(file.fileName || 'attachment'),
    mimeType: String(file.mimeType || 'application/octet-stream'),
    fileData: String(file.fileData)
  });
  const url = out && (out.url || (Array.isArray(out) && out[0] && out[0].url));
  if (!url) throw new Error('Upload succeeded but no link was returned');
  return { url: url };
}

/** Email the compiled report for one week to the CIO. */
function apiSendEmail(week) {
  requireSruUser_();
  return n8nPost_(N8N_MAILER, { week: String(week || '') });
}

/* --------------------------- n8n transport -------------------------- */

function n8nGet_(url) {
  const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  return parseN8n_(res, url);
}

function n8nPost_(url, body) {
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  return parseN8n_(res, url);
}

function parseN8n_(res, url) {
  const code = res.getResponseCode();
  const text = res.getContentText();
  if (code < 200 || code >= 300) {
    console.error('n8n ' + code + ' from ' + url + ': ' + text.slice(0, 300));
    throw new Error('The automation service returned ' + code + '. Please try again.');
  }
  if (!text) return {};
  try { return JSON.parse(text); }
  catch (e) { return { raw: text }; }
}

/* ------------------------------ Access ------------------------------ */

function currentEmail_() {
  return String(Session.getActiveUser().getEmail() || '').toLowerCase();
}
function isAllowed_(email) {
  return !!email && email.endsWith('@' + ALLOWED_DOMAIN);
}
function requireSruUser_() {
  const email = currentEmail_();
  const status = accessStatus_(email);
  if (status === 'domain') throw new Error('غير مصرح — الدخول لمنسوبي الجامعة فقط');
  if (status === 'list') throw new Error('غير مصرح — حسابك غير مضاف إلى قائمة المصرّح لهم');
  return email;
}

/* ---------------------------- Access list --------------------------- */

const ACCESS_HEADERS = ['email', 'name', 'role', 'active', 'notes'];

/** 'ok' | 'domain' (not @sr.edu.sa) | 'list' (not on the active list) */
function accessStatus_(email) {
  if (!isAllowed_(email)) return 'domain';
  if (ACCESS_MODE !== 'LIST') return 'ok';
  if (OWNER_EMAILS.map(e => e.toLowerCase()).indexOf(email) !== -1) return 'ok';
  return allowedEmails_().indexOf(email) !== -1 ? 'ok' : 'list';
}

function allowedEmails_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('acl_v1');
  if (hit) return JSON.parse(hit);
  let list = [];
  try {
    const sh = accessSheet_(false);
    if (sh && sh.getLastRow() > 1) {
      list = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues()
        .filter(r => r[0] && r[3] !== false && String(r[3]).toUpperCase() !== 'FALSE')
        .map(r => String(r[0]).trim().toLowerCase());
    }
  } catch (e) { console.error('allowedEmails_ failed: ' + e); }
  cache.put('acl_v1', JSON.stringify(list), ACCESS_CACHE_SECONDS);
  return list;
}

function accessSheet_(create) {
  const ss = ACCESS_SPREADSHEET_ID ? SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_ACCESS);
  if (!sh && create) {
    sh = ss.insertSheet(SHEET_ACCESS);
    sh.getRange(1, 1, 1, ACCESS_HEADERS.length).setValues([ACCESS_HEADERS])
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#501e8c');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    [260, 200, 100, 70, 260].forEach((w, i) => sh.setColumnWidth(i + 1, w));
    sh.getRange(2, 4, 300, 1).insertCheckboxes();
    sh.getRange('A1').setNote('البريد الجامعي كاملًا — name@sr.edu.sa');
    sh.getRange('C1').setNote('admin / user');
    sh.getRange('D1').setNote('ألغِ العلامة لإيقاف الوصول دون حذف الصف');
  }
  return sh;
}

/** Run once from the editor: creates AllowedUsers and seeds the team. */
function setupAccessList() {
  const sh = accessSheet_(true);
  const n = Math.max(sh.getLastRow() - 1, 0);
  const data = n ? sh.getRange(2, 1, n, 5).getValues() : [];

  const kept = data.filter(r => String(r[0]).trim())
    .map(r => [String(r[0]).trim(), r[1], r[2], r[3] === true || String(r[3]).toUpperCase() === 'TRUE', r[4]]);
  const have = kept.map(r => r[0].toLowerCase());

  const seed = OWNER_EMAILS.map(e => [e, 'Owner', 'admin', 'owner'])
    .concat(typeof DEFAULT_ALLOWED !== 'undefined' ? DEFAULT_ALLOWED : []);
  let added = 0;
  seed.forEach(r => {
    const e = String(r[0]).trim().toLowerCase();
    if (e && have.indexOf(e) === -1) {
      kept.push([e, r[1] || '', r[2] || 'user', true, r[3] || 'added by setupAccessList']);
      have.push(e); added++;
    }
  });

  if (n) sh.getRange(2, 1, n, 5).clearContent();
  const rows = Math.max(n, kept.length, 50);
  sh.getRange(2, 4, rows, 1).insertCheckboxes();
  if (kept.length) sh.getRange(2, 1, kept.length, 5).setValues(kept);

  CacheService.getScriptCache().remove('acl_v1');
  console.log('AllowedUsers ready: ' + kept.length + ' entries (' + added + ' added).');
  try { SpreadsheetApp.getActive().toast('قائمة المصرّح لهم جاهزة: ' + kept.length + ' بريدًا (أُضيف ' + added + ').', SHEET_ACCESS, 8); } catch (e) {}
}

/* ---------------------------- Access log ---------------------------- */

function logAccess_(email, result) {
  if (!LOG_ENABLED) return;
  try {
    if (LOG_DEDUP_MINUTES > 0 && result === 'granted') {
      const cache = CacheService.getScriptCache();
      const key = 'log_' + email;
      if (cache.get(key)) return;
      cache.put(key, '1', LOG_DEDUP_MINUTES * 60);
    }
    const now = new Date();
    const f = p => Utilities.formatDate(now, LOG_TIMEZONE, p);
    getLogSheet_().appendRow([now, f('yyyy-MM-dd'), f('HH:mm:ss'), DAYS_AR_[Number(f('u')) % 7],
      email, result === 'granted' ? 'دخول' : (result === 'not-listed' ? 'غير مدرج' : 'مرفوض'), APP_VERSION]);
  } catch (e) {
    console.error('logAccess_ failed: ' + e);
  }
}

function getLogSheet_() {
  const ss = LOG_SPREADSHEET_ID ? SpreadsheetApp.openById(LOG_SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet: bind the script to a Sheet or set LOG_SPREADSHEET_ID');
  let sh = ss.getSheetByName(SHEET_LOG);
  if (!sh) {
    sh = ss.insertSheet(SHEET_LOG);
    sh.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS])
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#3a1464');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    sh.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    [170, 100, 80, 80, 260, 80, 70].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  }
  return sh;
}

function showLogSummary() {
  const sh = getLogSheet_();
  const ui = SpreadsheetApp.getUi();
  const last = sh.getLastRow();
  if (last < 2) { ui.alert('سجل الدخول', 'لا توجد سجلات بعد.', ui.ButtonSet.OK); return; }
  const since = new Date(Date.now() - 30 * 864e5);
  const rows = sh.getRange(2, 1, last - 1, LOG_HEADERS.length).getValues()
    .filter(r => r[0] instanceof Date && r[0] >= since && r[5] === 'دخول');
  const users = {};
  rows.forEach(r => { users[r[4]] = (users[r[4]] || 0) + 1; });
  const top = Object.keys(users).sort((a, b) => users[b] - users[a]).slice(0, 10)
    .map((u, i) => (i + 1) + '. ' + u + ' — ' + users[u]).join('\n');
  ui.alert('سجل الدخول — آخر 30 يومًا — ' + APP_NAME,
    'عدد الزيارات: ' + rows.length + '\nعدد المستخدمين: ' + Object.keys(users).length + '\n\nالأكثر دخولًا:\n' + (top || '—'),
    ui.ButtonSet.OK);
}

function purgeOldLogs() {
  const sh = getLogSheet_();
  const last = sh.getLastRow();
  let removed = 0;
  if (last > 1) {
    const cutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 864e5);
    const stamps = sh.getRange(2, 1, last - 1, 1).getValues();
    for (let i = stamps.length - 1; i >= 0; i--) {
      if (stamps[i][0] instanceof Date && stamps[i][0] < cutoff) { sh.deleteRow(i + 2); removed++; }
    }
  }
  SpreadsheetApp.getActive().toast('حُذف ' + removed + ' سجل أقدم من ' + LOG_RETENTION_DAYS + ' يومًا.', APP_NAME_EN, 6);
}

/**
 * Sheet menu. NOTE: one onOpen per Apps Script project. If you later add
 * the Weekly Report PDF mailer to this same project, merge its menu items
 * here rather than declaring a second onOpen.
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu(APP_NAME_EN)
      .addItem('إعداد قائمة المصرّح لهم (AllowedUsers)', 'setupAccessList')
      .addSeparator()
      .addItem('ملخص سجل الدخول (30 يومًا)', 'showLogSummary')
      .addItem('حذف سجلات الدخول القديمة', 'purgeOldLogs')
      .addSeparator()
      .addItem('عرض رابط المنصة', 'showWebAppUrl')
      .addToUi();
  } catch (e) { /* standalone script: no sheet UI */ }
}

function showWebAppUrl() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('رابط ' + APP_NAME, ScriptApp.getService().getUrl() || 'لم يُنشر بعد: Deploy ▸ New deployment ▸ Web app', ui.ButtonSet.OK);
}

/* ----------------------------- Helpers ------------------------------ */

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
function safeJson_(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/* ----------------------------- Diagnostics -------------------------- */

/** Run from the editor to confirm the four n8n endpoints answer. */
function testN8nEndpoints() {
  const out = [];
  try { const r = n8nGet_(N8N_DATA); out.push('DATA: ok, ' + (Array.isArray(r) ? r.length + ' rows' : 'non-array')); }
  catch (e) { out.push('DATA: FAILED — ' + e.message); }
  out.push('SUBMIT/UPLOAD/MAILER: not called here (they write or send). Use the page to test those.');
  console.log(out.join('\n'));
  return out.join('\n');
}
