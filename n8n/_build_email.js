// ICTD Weekly Report — Build Email
// Renders the full report INLINE in the email body (Option A: no PDF attachment).
//
// Email clients strip <style> blocks and ignore flexbox/grid, so everything
// here is tables with inline styles — the same constraint as a PDF renderer.

const APP_URL = 'https://ictsru.github.io/ictd-weekly-report/';

const PURPLE = '#501e8c', RED = '#c0272d', INK = '#241436',
      MUTED  = '#6b5a80', LINE = '#e4dcf0';

const SECTORS = [
  {code:'NOC',       name:'NOC — Network Operations Center',           color:'#0a6eaa'},
  {code:'SOC',       name:'SOC — Security Operations Center',          color:'#c0272d'},
  {code:'DSSC',      name:'DSSC — Digital Support and Service Center', color:'#0f7b6c'},
  {code:'AAU',       name:'AAU — Applications & Automation Unit',      color:'#8a5a00'},
  {code:'ICTD',      name:'ICTD',                                           color:'#501e8c'},
  {code:'Events',    name:'Event Support',                                  color:'#b03a8c'},
  {code:'CoffeeIT',  name:'Coffee with IT',                                 color:'#6b4423'},
  {code:'MElMahdy',  name:'M. ElMahdy',                                     color:'#3a1464'},
  {code:'Ammar',     name:'Ammar',                                          color:'#3a1464'},
  {code:'Nayed',     name:'Nayed',                                          color:'#3a1464'},
  {code:'AbdAlazez', name:'Abd Alazez',                                     color:'#3a1464'},
  {code:'Azzam',     name:'Azzam',                                          color:'#3a1464'}
];

const RAG = {
  Green: {label:'On Track', bg:'#e6f4ea', fg:'#14683a'},
  Amber: {label:'At Risk',  bg:'#fdf1dd', fg:'#8a5a00'},
  Red:   {label:'Critical', bg:'#fdeaea', fg:'#c0272d'}
};

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function nl2br(s) { return esc(s).replace(/\r?\n/g, '<br>'); }

function meta(code) {
  return SECTORS.find(s => s.code === code) || {code: code, name: code, color: PURPLE};
}

// Blank rows must not count as a risk — matches the app's own rule.
function hasRisk(text) {
  if (!text) return false;
  return String(text).split('\n')
    .some(l => l.replace(/^\s*\d+\s*[.)\-]\s*/, '').trim().length > 0);
}

function countJson(s) {
  if (!s) return 0;
  try { const a = JSON.parse(s); return Array.isArray(a) ? a.length : 0; }
  catch (e) { return 0; }
}

function sundayOf(v) {
  if (!v) return '';
  const s = String(v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const m = s.split('-');
  const d = new Date(Number(m[0]), Number(m[1]) - 1, Number(m[2]));
  d.setDate(d.getDate() - d.getDay());
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/* ------------------------------------------------------------------ */

const ctx       = $('Resolve Week').first().json;
const weekOf    = ctx.weekOf;
const weekLabel = ctx.weekLabel;

// Keep this week's rows; a later row for the same sector wins, matching upsert.
const bySector = {};
for (const item of $('Get Submissions').all()) {
  const r = item.json;
  if (sundayOf(r.WeekOf) !== weekOf) continue;
  const code = String(r.Sector || '').trim();
  if (!code) continue;
  bySector[code] = {
    sector:   code,
    status:   String(r.Status || '').trim(),
    acts:     String(r.KeyActivities || '').trim(),
    issues:   String(r.Issues || '').trim(),
    support:  String(r.SupportNeeded || '').trim(),
    next:     String(r.NextWeekTasks || '').trim(),
    by:       String(r.SubmittedBy || '').trim(),
    attach:   String(r.Attachments || '').trim(),
    events:   String(r.Events || '').trim(),
    sessions: String(r.Sessions || '').trim()
  };
}

const rows = [];
SECTORS.forEach(s => { if (bySector[s.code]) rows.push(bySector[s.code]); });
Object.keys(bySector).forEach(k => {
  if (!SECTORS.some(s => s.code === k)) rows.push(bySector[k]);
});

if (!rows.length) {
  return [{ json: {
    skip: true, ok: false, week: weekOf, label: weekLabel, sectors: 0,
    error: 'No submissions found for ' + weekLabel + ' — nothing sent.'
  }}];
}

const counts = {Green: 0, Amber: 0, Red: 0};
rows.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

const attention = rows.filter(r => r.status === 'Red' || r.status === 'Amber');

/* ----------------------------- HTML ------------------------------- */

function row(label, value, red) {
  const c = red ? ('color:' + RED + ';font-weight:bold;') : '';
  return '<tr>' +
    '<td style="width:150px;padding:6px 12px 6px 0;color:' + (red ? RED : MUTED) +
      ';font-weight:bold;font-size:12px;vertical-align:top;' + (red ? 'font-weight:bold;' : '') + '">' +
      esc(label) + '</td>' +
    '<td style="padding:6px 0;font-size:13px;line-height:1.6;vertical-align:top;' + c + '">' +
      (nl2br(value) || '&mdash;') + '</td></tr>';
}

function statCell(value, label, color) {
  return '<td style="border:1px solid ' + LINE + ';padding:10px 20px;text-align:center;">' +
    '<div style="font-size:20px;font-weight:bold;color:' + color + ';">' + value + '</div>' +
    '<div style="font-size:11px;color:' + MUTED + ';padding-top:3px;">' + label + '</div></td>';
}

let h = '';
h += '<div style="background:#f1eef7;padding:20px 0;">';
h += '<table cellpadding="0" cellspacing="0" border="0" style="max-width:760px;margin:0 auto;' +
     'background:#ffffff;border:1px solid ' + LINE + ';font-family:Arial,Helvetica,sans-serif;color:' + INK + ';">';

// Header
h += '<tr><td style="background:' + PURPLE + ';padding:22px 26px;">' +
     '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
     '<td style="color:#fff;font-size:19px;font-weight:bold;">ICTD Weekly Status Report</td>' +
     '<td align="right" style="color:#fff;font-size:14px;font-weight:bold;white-space:nowrap;">' + esc(weekLabel) + '</td>' +
     '</tr><tr><td colspan="2" style="color:#e8dcf7;font-size:11.5px;padding-top:5px;">' +
     'Sulaiman Al Rajhi University — Executive Directorate of Communications &amp; Information Technology' +
     '</td></tr></table></td></tr>';

// Intro + stats
h += '<tr><td style="padding:24px 26px 0;">';
h += '<p style="margin:0 0 14px;font-size:14px;line-height:1.6;">Dear Dr. Nasser,</p>';
h += '<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Below is the ICTD Weekly Status Report for <b>' +
     esc(weekLabel) + '</b>, covering <b>' + rows.length + '</b> sector' + (rows.length === 1 ? '' : 's') + '.</p>';
h += '<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6px;"><tr>' +
     statCell(counts.Green, 'On Track', '#14683a') +
     statCell(counts.Amber, 'At Risk',  '#8a5a00') +
     statCell(counts.Red,   'Critical', RED) +
     '</tr></table>';

if (attention.length) {
  h += '<p style="margin:16px 0 6px;font-size:14px;"><b>Requiring attention:</b></p>';
  h += '<ul style="margin:0 0 4px;padding-left:20px;font-size:13.5px;line-height:1.7;">';
  attention.forEach(r => {
    const rag = RAG[r.status] || {label: r.status, fg: INK};
    h += '<li><b>' + esc(meta(r.sector).name) + '</b> — <span style="color:' + rag.fg +
         ';font-weight:bold;">' + esc(rag.label) + '</span></li>';
  });
  h += '</ul>';
}
h += '</td></tr>';

// Sector cards — built once, reused by the email body and the PDF.
function sectorCards(pad) {
  let c = '';
  rows.forEach(d => {
    const m   = meta(d.sector);
    const rag = RAG[d.status] || {label: d.status || '\u2014', bg: '#eeeeee', fg: INK};
    const dedicated = (d.sector === 'CoffeeIT' || d.sector === 'Events');
    const risk = hasRisk(d.issues);

    c += '<tr><td style="padding:' + pad + ';">';
    c += '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ' + LINE + ';">';
    c += '<tr><td style="background:' + m.color + ';padding:10px 14px;color:#fff;font-weight:bold;font-size:14px;">' +
         esc(m.name) + '</td>' +
         '<td align="right" style="background:' + m.color + ';padding:10px 14px;white-space:nowrap;">' +
         '<span style="background:' + rag.bg + ';color:' + rag.fg +
         ';padding:4px 12px;font-size:11.5px;font-weight:bold;border-radius:3px;">' + esc(rag.label) + '</span>' +
         '</td></tr>';
    c += '<tr><td colspan="2" style="padding:12px 14px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">';
    if (!dedicated) {
      c += row('Key Activities', d.acts, false);
      c += row('Issues / Risk',  d.issues, risk);
      c += row('Support Needed', d.support, false);
      c += row('Tasks for Next Week', d.next, false);
    }
    if (d.sector === 'Events')   c += row('Events Supported', String(countJson(d.events)), false);
    if (d.sector === 'CoffeeIT') c += row('Sessions Held',    String(countJson(d.sessions)), false);
    c += row('Attachments', d.attach ? nl2br(d.attach) : '0', false);
    c += row('Submitted By', d.by, false);
    c += '</table></td></tr></table></td></tr>';
  });
  return c;
}

h += sectorCards('18px 26px 0');

// CTA + footer
h += '<tr><td style="padding:26px 26px 6px;" align="center">' +
     '<a href="' + APP_URL + '" style="background:' + PURPLE + ';color:#ffffff;padding:13px 28px;' +
     'text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;border-radius:4px;">' +
     'Open the Weekly Report</a></td></tr>';
h += '<tr><td align="center" style="padding:0 26px 18px;font-size:12px;">' +
     '<a href="' + APP_URL + '" style="color:' + PURPLE + ';">' + APP_URL + '</a></td></tr>';
h += '<tr><td style="padding:0 26px 22px;font-size:13.5px;line-height:1.6;">' +
     'Best regards,<br>Mohamed ElMahdy, IT Operations Manager, Sulaiman Al Rajhi University</td></tr>';
h += '<tr><td style="border-top:1px solid ' + LINE + ';padding:12px 26px 20px;color:' + MUTED +
     ';font-size:11px;">' +
     (ctx.origin === 'Scheduled'
        ? 'Sent automatically every Sunday at 08:00 (Asia/Riyadh).'
        : 'Sent manually from the Compiled Report page.') +
     '</td></tr>';
h += '</table></div>';

const text = 'ICTD Weekly Status Report — ' + weekLabel + '\n\n' +
  rows.length + ' sector(s) reporting: ' + counts.Green + ' On Track, ' +
  counts.Amber + ' At Risk, ' + counts.Red + ' Critical.\n\n' +
  'Open the Weekly Report: ' + APP_URL + '\n\n' +
  'Mohamed ElMahdy, IT Operations Manager, Sulaiman Al Rajhi University';

/* ----------------------------- PDF ------------------------------- *
 * The same sector cards, wrapped for print instead of for an inbox:
 * no page background, no CTA button, a generated-on line, a footer.
 * Built from sectorCards(), so the attachment and the email body
 * cannot drift apart.                                                 */

const stamp = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const generated = String(stamp.getDate()).padStart(2,'0') + ' ' + MON[stamp.getMonth()] + ' ' +
                  stamp.getFullYear() + ', ' + String(stamp.getHours()).padStart(2,'0') + ':' +
                  String(stamp.getMinutes()).padStart(2,'0');

let p = '';
p += '<html><head><meta charset="utf-8"></head>';
p += '<body style="margin:0;font-family:Arial,Helvetica,sans-serif;color:' + INK + ';">';
p += '<table width="100%" cellpadding="0" cellspacing="0" border="0">';

p += '<tr><td style="background:' + PURPLE + ';padding:20px 26px;">' +
     '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
     '<td style="color:#fff;font-size:19px;font-weight:bold;">ICTD Weekly Status Report</td>' +
     '<td align="right" style="color:#fff;font-size:14px;font-weight:bold;white-space:nowrap;">' +
       esc(weekLabel) + '</td></tr>' +
     '<tr><td style="color:#e8dcf7;font-size:11px;padding-top:5px;">' +
       'Sulaiman Al Rajhi University \u2014 Executive Directorate of Communications &amp; Information Technology</td>' +
     '<td align="right" style="color:#e8dcf7;font-size:10px;padding-top:5px;white-space:nowrap;">Generated ' +
       esc(generated) + '</td></tr></table></td></tr>';

p += '<tr><td style="padding:18px 26px 0;">' +
     '<table cellpadding="0" cellspacing="0" border="0"><tr>' +
     statCell(rows.length, 'Sectors reporting', '#3a1464') +
     statCell(counts.Green, 'On Track', '#14683a') +
     statCell(counts.Amber, 'At Risk',  '#8a5a00') +
     statCell(counts.Red,   'Critical', RED) +
     '</tr></table></td></tr>';

p += sectorCards('18px 26px 0');

p += '<tr><td style="padding:26px;border-top:1px solid ' + LINE + ';color:' + MUTED +
     ';font-size:10px;text-align:center;">ICTD Weekly Status Report \u00b7 Sulaiman Al Rajhi University<br>' +
     '<a href="' + APP_URL + '" style="color:' + PURPLE + ';">' + APP_URL + '</a></td></tr>';
p += '</table></body></html>';

return [{ json: {
  skip: false, ok: true,
  week: weekOf, label: weekLabel, sectors: rows.length,
  subject: 'ICTD Weekly Status Report \u2014 ' + weekLabel,
  filename: 'ICTD Weekly Status Report \u2014 ' + weekLabel + '.pdf',
  html: h, text: text, pdfHtml: p, origin: ctx.origin
}}];
