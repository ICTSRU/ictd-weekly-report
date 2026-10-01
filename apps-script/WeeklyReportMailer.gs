/**
 * ICTD Weekly Status Report — PDF Mailer
 * ------------------------------------------------------------------
 * Version : 1.0
 * Pairs with : ICTD Weekly Status Report app v4.2
 * Sheet      : "ICTD Weekly Status Report - Data"  (tab: Submissions)
 * Author     : Mohamed ElMahdy, IT Operations Manager, SRU
 *
 * WHAT THIS DOES
 * Builds the compiled weekly report as a PDF straight from the sheet and
 * emails it to the CIO.
 *
 *   TO  : nabounar@sr.edu.sa
 *   CC  : m.elmahdy@sr.edu.sa
 *   Link: https://ictsru.github.io/ictd-weekly-report/   (in every email)
 *
 * It serves BOTH triggers from one code path, so the manual send and the
 * scheduled send can never drift apart:
 *
 *   1. The "Email PDF to CIO" button on the Compiled Report page
 *      -> POSTs here -> PDF built and sent -> confirmation returned.
 *   2. A time-driven trigger every Sunday at 08:00 Riyadh
 *      -> same build, same recipients, no browser involved.
 *
 * WHY SERVER-SIDE
 * At 08:00 on a Sunday nobody has the page open, so the browser cannot be
 * the thing that makes the PDF. Generating it here means the scheduled mail
 * and the button produce an identical document.
 *
 * INSTALL — see README.md. Short version:
 *   1. Sheet -> Extensions -> Apps Script
 *   2. New script file, paste this in, Save
 *   3. Run  setup()  once and approve the prompts
 *   4. Deploy -> New deployment -> Web app
 *        Execute as : Me
 *        Access     : Anyone
 *      Copy the /exec URL into MAILER_URL in the report's index.html
 */

/* ============================== CONFIG ============================== */

var CFG = {
  SHEET_ID: '1SOtq628_WlTon8I6avIOd8537h9qZm1CcuPECAGLcwg',
  TAB:      'Submissions',

  TO:   'nabounar@sr.edu.sa',
  CC:   'm.elmahdy@sr.edu.sa',

  APP_URL: 'https://ictsru.github.io/ictd-weekly-report/',

  TIMEZONE: 'Asia/Riyadh',

  // Scheduled send: Sunday 08:00.
  SEND_DAY:  'SUNDAY',
  SEND_HOUR: 8,

  /**
   * Which week the Sunday 08:00 run reports on.
   * 0 = the week starting that same Sunday. This matches the app, where the
   * ACTIVE WEEK is current+7: sector managers fill the upcoming week in
   * advance, so that week's data is already in the sheet by Sunday morning.
   * Firing Sun 04 Oct 2026 therefore sends W40 — Sun 04 Oct 2026.
   */
  WEEKS_BACK: 0,

  // Shared secret. Leave '' to disable. If set, the button must send it too.
  TOKEN: ''
};

var SECTORS = [
  {code:'NOC',       name:'NOC — Network Operations Center',          color:'#0a6eaa'},
  {code:'SOC',       name:'SOC — Security Operations Center',         color:'#c0272d'},
  {code:'DSSC',      name:'DSSC — Digital Support and Service Center',color:'#0f7b6c'},
  {code:'AAU',       name:'AAU — Applications & Automation Unit',     color:'#8a5a00'},
  {code:'ICTD',      name:'ICTD',                                     color:'#501e8c'},
  {code:'Events',    name:'Event Support',                            color:'#b03a8c'},
  {code:'CoffeeIT',  name:'Coffee with IT',                           color:'#6b4423'},
  {code:'MElMahdy',  name:'M. ElMahdy',                               color:'#3a1464'},
  {code:'Ammar',     name:'Ammar',                                    color:'#3a1464'},
  {code:'Nayed',     name:'Nayed',                                    color:'#3a1464'},
  {code:'AbdAlazez', name:'Abd Alazez',                               color:'#3a1464'},
  {code:'Azzam',     name:'Azzam',                                    color:'#3a1464'}
];

var RAG = {
  Green: {label:'On Track', bg:'#e6f4ea', fg:'#14683a'},
  Amber: {label:'At Risk',  bg:'#fdf1dd', fg:'#8a5a00'},
  Red:   {label:'Critical', bg:'#fdeaea', fg:'#c0272d'}
};

var PURPLE = '#501e8c', PURPLE_DARK = '#3a1464', RED = '#c0272d',
    INK = '#241436', MUTED = '#6b5a80', LINE = '#e4dcf0';

/* ============================ ENTRY POINTS ========================== */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ICTD Report')
    .addItem('Email last week’s report now', 'sendScheduledReport')
    .addSeparator()
    .addItem('Install Sunday 08:00 schedule', 'setup')
    .addItem('Remove schedule', 'removeTriggers')
    .addToUi();
}

/** Run once, manually, to install the Sunday 08:00 trigger. */
function setup() {
  removeTriggers();

  // The trigger fires in the SCRIPT's timezone, so pin it to Riyadh.
  var ss = SpreadsheetApp.openById(CFG.SHEET_ID);
  if (ss.getSpreadsheetTimeZone() !== CFG.TIMEZONE) {
    ss.setSpreadsheetTimeZone(CFG.TIMEZONE);
  }

  ScriptApp.newTrigger('sendScheduledReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay[CFG.SEND_DAY])
    .atHour(CFG.SEND_HOUR)
    .nearMinute(0)
    .create();

  notify_('Scheduled: every ' + CFG.SEND_DAY.toLowerCase() + ' at 0' +
          CFG.SEND_HOUR + ':00 ' + CFG.TIMEZONE + '.');
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendScheduledReport') ScriptApp.deleteTrigger(t);
  });
}

/** The Sunday 08:00 trigger target. */
function sendScheduledReport() {
  var week = weekOfNSundaysAgo_(CFG.WEEKS_BACK);
  var res  = sendReport_(week, 'Scheduled');
  Logger.log(JSON.stringify(res));
  return res;
}

/* ===================== WEB APP (the page button) ==================== */

/**
 * The button POSTs text/plain, which avoids a CORS preflight — Apps Script
 * cannot answer an OPTIONS request, so a JSON content-type would fail.
 */
function doPost(e) {
  return handle_(safeParse_(e && e.postData && e.postData.contents));
}

function doGet(e) {
  return handle_((e && e.parameter) || {});
}

function handle_(params) {
  params = params || {};
  try {
    if (CFG.TOKEN && params.token !== CFG.TOKEN) {
      return json_({ok: false, error: 'Unauthorized'});
    }
    var week = normaliseSunday_(params.week) || weekOfNSundaysAgo_(CFG.WEEKS_BACK);
    return json_(sendReport_(week, 'Manual'));
  } catch (err) {
    return json_({ok: false, error: String(err && err.message || err)});
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeParse_(s) {
  try { return JSON.parse(s); } catch (e) { return {}; }
}

/* ============================ SEND REPORT =========================== */

function sendReport_(weekOf, origin) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return {ok: false, error: 'Another send is in progress.'};

  try {
    var rows = readWeek_(weekOf);
    if (!rows.length) {
      return {ok: false, error: 'No submissions found for week of ' + weekOf + '.', week: weekOf};
    }

    var label = weekLabel_(weekOf);
    var html  = buildReportHtml_(weekOf, rows);

    var pdf = Utilities
      .newBlob(html, MimeType.HTML, 'report.html')
      .getAs(MimeType.PDF)
      .setName('ICTD Weekly Status Report — ' + label + '.pdf');

    MailApp.sendEmail({
      to:          CFG.TO,
      cc:          CFG.CC,
      subject:     'ICTD Weekly Status Report — ' + label,
      htmlBody:    buildEmailBody_(weekOf, rows, origin),
      body:        buildEmailText_(weekOf, rows),
      attachments: [pdf],
      name:        'ICTD Weekly Status Report'
    });

    return {
      ok: true, week: weekOf, label: label,
      sectors: rows.length, to: CFG.TO, cc: CFG.CC, origin: origin
    };
  } finally {
    lock.releaseLock();
  }
}

/* ============================== DATA =============================== */

function readWeek_(weekOf) {
  var sh = SpreadsheetApp.openById(CFG.SHEET_ID).getSheetByName(CFG.TAB);
  if (!sh) throw new Error('Tab "' + CFG.TAB + '" not found.');

  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  var idx = {};
  values[0].forEach(function (h, i) {
    var k = String(h).trim().toLowerCase();
    if (k && !(k in idx)) idx[k] = i;
  });
  var get = function (row, name) {
    var i = idx[name.toLowerCase()];
    return (i === undefined || row[i] === null || row[i] === undefined) ? '' : String(row[i]).trim();
  };

  var byS = {};
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (normaliseSunday_(get(row, 'WeekOf')) !== weekOf) continue;
    var code = get(row, 'Sector');
    if (!code) continue;
    byS[code] = {                       // later row wins — matches the app's upsert
      sector:   code,
      status:   get(row, 'Status'),
      acts:     get(row, 'KeyActivities'),
      issues:   get(row, 'Issues'),
      support:  get(row, 'SupportNeeded'),
      next:     get(row, 'NextWeekTasks'),
      by:       get(row, 'SubmittedBy'),
      attach:   get(row, 'Attachments'),
      events:   get(row, 'Events'),
      sessions: get(row, 'Sessions')
    };
  }

  // Return in the app's sector order, then anything unrecognised.
  var out = [], seen = {};
  SECTORS.forEach(function (s) {
    if (byS[s.code]) { out.push(byS[s.code]); seen[s.code] = true; }
  });
  Object.keys(byS).forEach(function (k) { if (!seen[k]) out.push(byS[k]); });
  return out;
}

function sectorMeta_(code) {
  for (var i = 0; i < SECTORS.length; i++) if (SECTORS[i].code === code) return SECTORS[i];
  return {code: code, name: code, color: PURPLE};
}

function countJson_(s) {
  if (!s) return 0;
  try { var a = JSON.parse(s); return Array.isArray(a) ? a.length : 0; } catch (e) { return 0; }
}

function hasRisk_(text) {
  if (!text) return false;
  return String(text).split('\n').some(function (l) {
    return l.replace(/^\s*\d+\s*[.)\-]\s*/, '').trim().length > 0;
  });
}

/* ============================ HTML / PDF ============================ */

/**
 * Apps Script renders HTML to PDF with an old engine: no flexbox, no grid,
 * no CSS variables. Everything below is tables and inline styles on purpose.
 */
function buildReportHtml_(weekOf, rows) {
  var label = weekLabel_(weekOf);
  var generated = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'dd MMM yyyy, HH:mm');

  var counts = {Green: 0, Amber: 0, Red: 0};
  rows.forEach(function (r) { if (counts[r.status] !== undefined) counts[r.status]++; });

  var h = '';
  h += '<html><head><meta charset="utf-8"><style>';
  h += 'body{font-family:Arial,Helvetica,sans-serif;color:' + INK + ';margin:0;padding:0;font-size:11pt;}';
  h += 'table{border-collapse:collapse;width:100%;}';
  h += 'td,th{vertical-align:top;}';
  h += '.lbl{width:150px;color:' + MUTED + ';font-weight:bold;font-size:9.5pt;padding:5px 10px 5px 0;}';
  h += '.val{font-size:10pt;line-height:1.55;padding:5px 0;white-space:pre-wrap;}';
  h += '</style></head><body>';

  // Header band
  h += '<table style="background:' + PURPLE + ';color:#fff;"><tr><td style="padding:20px 26px;">';
  h += '<div style="font-size:19pt;font-weight:bold;">ICTD Weekly Status Report</div>';
  h += '<div style="font-size:10pt;padding-top:5px;">Sulaiman Al Rajhi University — Executive Directorate of Communications &amp; Information Technology</div>';
  h += '</td><td style="padding:20px 26px;text-align:right;white-space:nowrap;">';
  h += '<div style="font-size:12pt;font-weight:bold;">' + esc_(label) + '</div>';
  h += '<div style="font-size:9pt;padding-top:5px;">Generated ' + esc_(generated) + '</div>';
  h += '</td></tr></table>';

  // Summary strip
  h += '<table style="margin:18px 26px 0;width:auto;"><tr>';
  h += summaryCell_('Sectors reporting', String(rows.length), PURPLE_DARK);
  h += summaryCell_('On Track', String(counts.Green), '#14683a');
  h += summaryCell_('At Risk',  String(counts.Amber), '#8a5a00');
  h += summaryCell_('Critical', String(counts.Red),   RED);
  h += '</tr></table>';

  // Sector sections
  rows.forEach(function (d) {
    var meta = sectorMeta_(d.sector);
    var rag  = RAG[d.status] || {label: d.status || '—', bg: '#eee', fg: INK};
    var dedicated = (d.sector === 'CoffeeIT' || d.sector === 'Events');

    h += '<div style="margin:22px 26px 0;border:1px solid ' + LINE + ';page-break-inside:avoid;">';
    h += '<table><tr>';
    h += '<td style="background:' + meta.color + ';color:#fff;padding:9px 14px;font-weight:bold;font-size:11.5pt;">' + esc_(meta.name) + '</td>';
    h += '<td style="background:' + meta.color + ';padding:9px 14px;text-align:right;white-space:nowrap;">';
    h += '<span style="background:' + rag.bg + ';color:' + rag.fg + ';padding:3px 12px;font-size:9.5pt;font-weight:bold;">' + esc_(rag.label) + '</span>';
    h += '</td></tr></table>';

    h += '<table style="padding:0;"><tr><td style="padding:12px 14px;"><table>';
    if (!dedicated) {
      h += row_('Key Activities', d.acts);
      h += riskRow_(d.issues);
      h += row_('Support Needed', d.support);
      h += row_('Tasks for Next Week', d.next);
    }
    if (d.sector === 'Events')   h += row_('Events Supported', String(countJson_(d.events)));
    if (d.sector === 'CoffeeIT') h += row_('Sessions Held',    String(countJson_(d.sessions)));
    h += row_('Attachments', String(countJson_(d.attach) || (d.attach ? d.attach.split('\n').filter(String).length : 0)));
    h += row_('Submitted By', d.by);
    h += '</table></td></tr></table></div>';
  });

  // Footer
  h += '<div style="margin:26px;padding-top:12px;border-top:1px solid ' + LINE + ';color:' + MUTED + ';font-size:9pt;text-align:center;">';
  h += 'ICTD Weekly Status Report · Sulaiman Al Rajhi University<br>';
  h += '<a href="' + CFG.APP_URL + '" style="color:' + PURPLE + ';">' + CFG.APP_URL + '</a>';
  h += '</div></body></html>';
  return h;
}

function summaryCell_(label, value, color) {
  return '<td style="border:1px solid ' + LINE + ';padding:9px 18px;text-align:center;">' +
         '<div style="font-size:17pt;font-weight:bold;color:' + color + ';">' + esc_(value) + '</div>' +
         '<div style="font-size:8.5pt;color:' + MUTED + ';padding-top:2px;">' + esc_(label) + '</div></td>';
}

function row_(label, value) {
  return '<tr><td class="lbl">' + esc_(label) + '</td>' +
         '<td class="val">' + (esc_(value) || '—') + '</td></tr>';
}

/** Issues / Risk is red and bold when it holds anything — same rule as the app. */
function riskRow_(value) {
  var flag = hasRisk_(value);
  var c = flag ? ('color:' + RED + ';font-weight:bold;') : '';
  return '<tr><td class="lbl" style="' + c + '">Issues / Risk</td>' +
         '<td class="val" style="' + c + '">' + (esc_(value) || '—') + '</td></tr>';
}

/* ============================== EMAIL =============================== */

function buildEmailBody_(weekOf, rows, origin) {
  var label = weekLabel_(weekOf);
  var c = {Green: 0, Amber: 0, Red: 0};
  rows.forEach(function (r) { if (c[r.status] !== undefined) c[r.status]++; });

  var risky = rows.filter(function (r) { return r.status === 'Red' || r.status === 'Amber'; });

  var h = '<div style="font-family:Arial,Helvetica,sans-serif;color:' + INK + ';font-size:14px;line-height:1.6;">';
  h += '<p>Dear Dr. Nasser,</p>';
  h += '<p>Please find attached the ICTD Weekly Status Report for <b>' + esc_(label) + '</b>, ' +
       'covering <b>' + rows.length + '</b> sector' + (rows.length === 1 ? '' : 's') + '.</p>';

  h += '<table style="border-collapse:collapse;margin:16px 0;"><tr>';
  h += '<td style="border:1px solid ' + LINE + ';padding:8px 16px;"><b style="color:#14683a;">' + c.Green + '</b> On Track</td>';
  h += '<td style="border:1px solid ' + LINE + ';padding:8px 16px;"><b style="color:#8a5a00;">' + c.Amber + '</b> At Risk</td>';
  h += '<td style="border:1px solid ' + LINE + ';padding:8px 16px;"><b style="color:' + RED + ';">' + c.Red + '</b> Critical</td>';
  h += '</tr></table>';

  if (risky.length) {
    h += '<p style="margin-bottom:6px;"><b>Requiring attention:</b></p><ul style="margin-top:0;">';
    risky.forEach(function (r) {
      var rag = RAG[r.status] || {label: r.status, fg: INK};
      h += '<li><b>' + esc_(sectorMeta_(r.sector).name) + '</b> — ' +
           '<span style="color:' + rag.fg + ';font-weight:bold;">' + esc_(rag.label) + '</span></li>';
    });
    h += '</ul>';
  }

  h += '<p style="margin-top:22px;">' +
       '<a href="' + CFG.APP_URL + '" style="background:' + PURPLE + ';color:#fff;padding:11px 22px;' +
       'text-decoration:none;font-weight:bold;display:inline-block;">Open the Weekly Report</a></p>';
  h += '<p style="font-size:12px;color:' + MUTED + ';">' +
       '<a href="' + CFG.APP_URL + '" style="color:' + PURPLE + ';">' + CFG.APP_URL + '</a></p>';

  h += '<p style="margin-top:22px;">Best regards,<br>' +
       'Mohamed ElMahdy, IT Operations Manager, Sulaiman Al Rajhi University</p>';
  h += '<p style="font-size:11px;color:' + MUTED + ';border-top:1px solid ' + LINE + ';padding-top:10px;">' +
       esc_(origin === 'Scheduled' ? 'Sent automatically every Sunday at 08:00.' : 'Sent manually from the Compiled Report page.') +
       '</p></div>';
  return h;
}

function buildEmailText_(weekOf, rows) {
  return 'ICTD Weekly Status Report — ' + weekLabel_(weekOf) + '\n\n' +
         rows.length + ' sector(s) reporting. The full report is attached as a PDF.\n\n' +
         'Open the Weekly Report: ' + CFG.APP_URL + '\n\n' +
         'Mohamed ElMahdy, IT Operations Manager, Sulaiman Al Rajhi University';
}

/* ============================== DATES =============================== */
/* Local date parts throughout. toISOString() would shift to UTC and roll the
   date back a day before 03:00 Riyadh — the same bug fixed in the app. */

function toLocalISO_(d) {
  return Utilities.formatDate(d, CFG.TIMEZONE, 'yyyy-MM-dd');
}

function parseLocalDate_(s) {
  var m = String(s).slice(0, 10).split('-');
  return new Date(Number(m[0]), Number(m[1]) - 1, Number(m[2]));
}

/** Snap any date to the Sunday that starts its week, as yyyy-MM-dd. */
function normaliseSunday_(v) {
  if (!v) return '';
  var d;
  if (v instanceof Date) {
    d = parseLocalDate_(toLocalISO_(v));
  } else {
    var s = String(v).trim();
    if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return '';
    d = parseLocalDate_(s);
  }
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() - d.getDay());
  return Utilities.formatDate(d, CFG.TIMEZONE, 'yyyy-MM-dd');
}

function weekOfNSundaysAgo_(n) {
  var today = parseLocalDate_(toLocalISO_(new Date()));
  today.setDate(today.getDate() - today.getDay() - (7 * (n || 0)));
  return Utilities.formatDate(today, CFG.TIMEZONE, 'yyyy-MM-dd');
}

/** ISO 8601 week number. */
function isoWeek_(d) {
  var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() + 4 - (t.getDay() || 7));
  var yearStart = new Date(t.getFullYear(), 0, 1);
  return Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
}

function weekLabel_(iso) {
  var d = parseLocalDate_(iso);
  return 'W' + ('0' + isoWeek_(d)).slice(-2) + ' — Sun ' +
         Utilities.formatDate(d, CFG.TIMEZONE, 'dd MMM yyyy');
}

/* ============================= HELPERS ============================== */

function esc_(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function notify_(msg) {
  try { SpreadsheetApp.getActive().toast(msg, 'ICTD Report', 8); }
  catch (e) { Logger.log(msg); }
}

/* ============================== TESTING ============================= */

/** Run this from the editor to check the build without emailing anyone. */
function testBuildOnly() {
  var week = weekOfNSundaysAgo_(CFG.WEEKS_BACK);
  var rows = readWeek_(week);
  Logger.log('Week: ' + week + ' (' + weekLabel_(week) + ')  Sectors: ' + rows.length);
  if (!rows.length) { Logger.log('No data for that week.'); return; }
  var pdf = Utilities.newBlob(buildReportHtml_(week, rows), MimeType.HTML, 'r.html').getAs(MimeType.PDF);
  var f = DriveApp.createFile(pdf.setName('TEST — ICTD Weekly Report ' + week + '.pdf'));
  Logger.log('Preview PDF written to Drive: ' + f.getUrl());
}

/** Run this to send a real email for last week, outside the schedule. */
function testSendNow() {
  Logger.log(JSON.stringify(sendScheduledReport()));
}
