// ICTD Weekly Report — Resolve Week
// Decides which week to report on, for both triggers.
//
// Scheduled: the Sunday it fires IS the week. Firing Sun 04 Oct 2026 08:00
// reports W40 — Sun 04 Oct 2026. Sector managers fill the upcoming week in
// advance (the app marks current+7 as ACTIVE WEEK), so that week's data is
// already in the sheet by Sunday morning.
//
// Manual: the button sends the week the user picked.

const SHEET_TZ = 'Asia/Riyadh';

function riyadhNow() {
  // Code nodes run in UTC; re-read the clock in Riyadh before taking date parts.
  return new Date(new Date().toLocaleString('en-US', { timeZone: SHEET_TZ }));
}

function toISO(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function parseLocal(s) {
  const m = String(s).slice(0, 10).split('-');
  return new Date(Number(m[0]), Number(m[1]) - 1, Number(m[2]));
}

// Snap any date back to the Sunday that starts its week.
function sundayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return toISO(x);
}

function isoWeek(d) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() + 4 - (t.getDay() || 7));
  const ys = new Date(t.getFullYear(), 0, 1);
  return Math.ceil((((t - ys) / 86400000) + 1) / 7);
}

function weekLabel(iso) {
  const d = parseLocal(iso);
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return 'W' + String(isoWeek(d)).padStart(2, '0') + ' — Sun ' +
         String(d.getDate()).padStart(2, '0') + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
}

// A webhook run carries a body; a scheduled run does not.
let requested = '';
let origin = 'Scheduled';
try {
  const body = $input.first().json.body;
  if (body) {
    origin = 'Manual';
    const raw = (typeof body === 'string') ? JSON.parse(body) : body;
    if (raw && raw.week) requested = String(raw.week);
  }
} catch (e) { /* malformed body -> fall through to the scheduled week */ }

const weekOf = /^\d{4}-\d{2}-\d{2}$/.test(requested)
  ? sundayOf(parseLocal(requested))
  : sundayOf(riyadhNow());

return [{ json: { weekOf: weekOf, weekLabel: weekLabel(weekOf), origin: origin } }];
