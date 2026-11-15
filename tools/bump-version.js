#!/usr/bin/env node
/**
 * bump-version.js — v1.1
 * ICTD Weekly Status Report — single source of truth for the version number.
 *
 * Reads VERSION at the repo root, bumps it, writes it back, and propagates the
 * new number into every file/marker that displays it. Appends a CHANGELOG entry.
 *
 * This is a DELIBERATE action, not something CI does on every push. The deploy
 * workflow deploys whatever version is already in the files; you bump when you
 * mean to, by running this locally or via the workflow's manual "bump" input.
 *
 * Versioning rule (SRU convention): ONE digit after the decimal point.
 *   5.9 -> 6.0 -> 6.1   (never 5.10)
 *
 * Usage:
 *   node tools/bump-version.js            # minor (5.9 -> 6.0... wait: 5.9 -> 6.0)
 *   node tools/bump-version.js --major    # major (5.9 -> 6.0)
 *   node tools/bump-version.js --set 7.0  # set explicitly
 *   node tools/bump-version.js --check    # print current version, change nothing
 *   node tools/bump-version.js --note "text for the CHANGELOG"
 *
 * Validates every marker BEFORE writing anything: if a version string was moved
 * or renamed, it fails naming the file and changes nothing, so a page can never
 * ship showing a stale version.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.env.REPO_ROOT || process.cwd();
const VERSION_FILE = path.join(ROOT, 'VERSION');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');

// Each file lists the version markers it carries. A marker whose file is present
// MUST match (unless patternOptional) — a present-but-unmatched marker is an error.
const TARGETS = [
  { file: 'VERSION', fileOptional: false, patterns: [
      { re: /^(\s*)([0-9]+\.[0-9])(\s*)$/m, what: 'VERSION body' },
  ]},
  { file: 'apps-script/Code.gs', fileOptional: false, patterns: [
      { re: /(APP_VERSION\s*=\s*['"])([0-9]+\.[0-9])(['"])/, what: 'APP_VERSION' },
  ]},
  { file: 'apps-script/Index.html', fileOptional: true, patterns: [
      { re: /(ICTD Weekly Status Report — v)([0-9]+\.[0-9])(<\/title>)/, what: 'page title' },
      { re: /(version-badge">v)([0-9]+\.[0-9])(<\/span>)/,              what: 'header badge' },
      { re: /(Version )([0-9]+\.[0-9])( · Sulaiman)/,                   what: 'footer version' },
  ]},
  { file: 'index.html', fileOptional: true, patterns: [
      { re: /(VERSION\s*:\s*['"])([0-9]+\.[0-9])(['"])/, what: 'landing CONFIG.VERSION', patternOptional: true },
  ]},
];

function parse(v) {
  const m = /^(\d+)\.(\d)$/.exec(String(v).trim());
  if (!m) throw new Error('Version "' + v + '" is not <major>.<single digit>, e.g. 5.9');
  return { major: +m[1], minor: +m[2] };
}
function bumpMinor(v){ const {major,minor}=parse(v); return minor>=9 ? (major+1)+'.0' : major+'.'+(minor+1); }
function bumpMajor(v){ return (parse(v).major+1)+'.0'; }

function riyadhToday(){
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Riyadh', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
}

function main(){
  const argv = process.argv.slice(2);
  const has = f => argv.indexOf(f)!==-1;
  const valOf = f => { const i=argv.indexOf(f); return i===-1?null:argv[i+1]; };

  if(!fs.existsSync(VERSION_FILE)) throw new Error('VERSION not found at '+VERSION_FILE);
  const current = fs.readFileSync(VERSION_FILE,'utf8').trim();
  parse(current);
  if(has('--check')){ process.stdout.write(current+'\n'); return; }

  let next;
  if(has('--set'))        { next=String(valOf('--set')).trim(); parse(next); }
  else if(has('--major')) { next=bumpMajor(current); }
  else                    { next=bumpMinor(current); }

  const note = valOf('--note') || 'Automated deployment';

  // PASS 1 — validate every marker before touching disk
  const writes = []; const skips = [];
  for(const t of TARGETS){
    const p = path.join(ROOT, t.file);
    if(!fs.existsSync(p)){ if(!t.fileOptional) throw new Error('Required file missing: '+t.file); continue; }
    let src = fs.readFileSync(p,'utf8'); let changed = false;
    for(const pat of t.patterns){
      if(!pat.re.test(src)){
        if(pat.patternOptional){ skips.push(t.file+' / '+pat.what+' (not present)'); continue; }
        throw new Error('Could not find '+pat.what+' in '+t.file+' — it would ship showing the old version. Fix the pattern in tools/bump-version.js.');
      }
      src = src.replace(pat.re, '$1'+next+'$3'); changed = true;
    }
    if(changed) writes.push({ path:p, body:src, label:t.file });
  }

  // PASS 2 — commit to disk
  skips.forEach(s=>console.log('  skipped: '+s));
  for(const w of writes){ fs.writeFileSync(w.path, w.body); console.log('  updated: '+w.label); }

  // CHANGELOG
  const entry = '## v'+next+' — '+riyadhToday()+'\n- '+note+'\n\n';
  let cl = fs.existsSync(CHANGELOG) ? fs.readFileSync(CHANGELOG,'utf8') : '# Changelog\n\n';
  const head = cl.match(/^#[^\n]*\n+/);
  cl = head ? head[0]+entry+cl.slice(head[0].length) : entry+cl;
  fs.writeFileSync(CHANGELOG, cl);
  console.log('  updated: CHANGELOG.md');

  console.log('Version '+current+' -> '+next);
  if(process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'version='+next+'\nprevious='+current+'\n');
}

try { main(); } catch(e){ console.error('bump-version: '+e.message); process.exit(1); }
