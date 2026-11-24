// Nightly snapshot of Ausbildung (vocational training) places in Germany from the Federal Employment Agency (BA)
// for danrc.com/ausbildung. Output: data/ausbildung/summary.json, data/ausbildung/<key>.json, data/ausbildung/history.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const BA = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs';
const HEADERS = { 'X-API-Key': 'jobboerse-jobsuche', 'User-Agent': 'Mozilla/5.0 (danrc ausbildung data)' };
const DETAIL = 'https://www.arbeitsagentur.de/jobsuche/jobdetail/';
const CITIES = ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt am Main', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hannover', 'Nürnberg'];
const BERUFE = JSON.parse(await readFile(new URL('./ausbildung-berufe.json', import.meta.url), 'utf8'));
const PER = 200;                 // newest ads stored per trade (2 pages of 100)
const PAUSE = 1000;              // ~1 request per second, one at a time
const DIR = new URL('../data/ausbildung/', import.meta.url);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Tehran calendar day (the run starts 03:00 Tehran = 23:30 UTC the day before)
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
const dow = new Date(day + 'T12:00:00Z').getUTCDay();

async function ba(params, tries = 4) {
  const u = BA + '?' + new URLSearchParams({ angebotsart: '4', ...params });
  for (let i = 1; i <= tries; i++) {
    let wait = 3000 * i;
    try {
      const r = await fetch(u, { headers: HEADERS });
      if (r.ok) return await r.json();
      if (r.status === 429 || r.status === 503) wait = Math.max(60000, (+r.headers.get('retry-after') || 0) * 1000);
      if (i === tries) throw new Error('BA HTTP ' + r.status);
    } catch (e) { if (i === tries) throw e; }
    console.log('retry in', wait / 1000, 's');
    await sleep(wait);
  }
}

await mkdir(DIR, { recursive: true });
let prev = {};
try { for (const p of JSON.parse(await readFile(new URL('summary.json', DIR), 'utf8')).profs) prev[p.key] = p; } catch {}
let history = [];
try { history = JSON.parse(await readFile(new URL('history.json', DIR), 'utf8')); } catch {}

// 1) one overview call: totals and facets (start month, school level, paid ads)
const ov = await ba({ wo: 'Deutschland', size: '1' });
await sleep(PAUSE);
const f = ov.facetten || {};
const summary = {
  day, updated: new Date().toISOString(), source: 'Bundesagentur für Arbeit – Jobsuche (Ausbildung)',
  total: ov.maxErgebnisse || 0,
  start: (f.eintrittsdatum || {}).counts || {},
  school: (f.schulbildung || {}).counts || {},
  paid: ((f.ausbildungsverguetung || {}).counts || {}).monat || 0,
  external: ((f.externestellenboersen || {}).counts || {}).true || 0,
  profs: [],
};
const histRow = { day, total: summary.total };
let failed = 0;

// 2) per trade: newest ads; city counts for 1/7 of the trades each day (each trade weekly) or when missing
for (const [i, p] of BERUFE.entries()) {
  try {
    const first = await ba({ beruf: p.beruf, wo: 'Deutschland', size: '100', page: '1' });
    await sleep(PAUSE);
    const total = first.maxErgebnisse || 0;
    let list = first.ergebnisliste || [];
    if (total > 100 && PER > 100) { const p2 = await ba({ beruf: p.beruf, wo: 'Deutschland', size: '100', page: '2' }); list = list.concat(p2.ergebnisliste || []); await sleep(PAUSE); }
    let cities = (prev[p.key] && prev[p.key].cities) || null;
    // CITIES=skip: quick run without city counts; CITIES=1: refresh all; default: missing + 1/7 rotation
    if (process.env.CITIES !== 'skip' && (!cities || !Object.keys(cities).length || i % 7 === dow || process.env.CITIES === '1')) {
      cities = {};
      for (const c of CITIES) {
        const j = await ba({ beruf: p.beruf, wo: c, umkreis: '25', size: '1' });
        cities[c] = j.maxErgebnisse || 0;
        await sleep(PAUSE);
      }
    }
    const rows = [], seen = new Set();
    for (const a of list) {
      const ref = a.referenznummer;
      if (!ref || seen.has(ref)) continue;
      seen.add(ref);
      const loc = (a.stellenlokationen || [])[0] || {}, adr = loc.adresse || {};
      if (adr.land && adr.land !== 'DEUTSCHLAND') continue;
      rows.push({
        ref, title: a.stellenangebotsTitel || '', employer: a.firma || '', city: adr.ort || '', plz: adr.plz || '',
        region: adr.region || '', lat: loc.breite != null ? +(+loc.breite).toFixed(3) : null, lon: loc.laenge != null ? +(+loc.laenge).toFixed(3) : null, url: a.externeURL || DETAIL + encodeURIComponent(ref),
        start: (a.eintrittszeitraum || {}).von || '',
        published: (a.veroeffentlichungszeitraum || {}).von || a.datumErsteVeroeffentlichung || '',
        changed: (a.aenderungsdatum || '').slice(0, 10),
      });
    }
    rows.sort((x, y) => (y.changed || '').localeCompare(x.changed || ''));
    const regions = {};
    for (const r of rows) if (r.region) regions[r.region] = (regions[r.region] || 0) + 1;
    await writeFile(new URL(p.key + '.json', DIR), JSON.stringify({ day, key: p.key, beruf: p.beruf, total, rows }) + '\n');
    summary.profs.push({ key: p.key, was: p.beruf, fa: p.fa, g: p.g, d: p.d, t: p.t, total, cities: cities || {}, regions });
    histRow[p.key] = total;
    console.log(i + 1, p.key, total, rows.length);
  } catch (e) {
    failed++;
    console.log('FAILED', p.key, e.message);
    if (prev[p.key]) { summary.profs.push({ ...prev[p.key], fa: p.fa, g: p.g, d: p.d, t: p.t, stale: true }); histRow[p.key] = prev[p.key].total; }
  }
}
if (failed > BERUFE.length / 2) { console.log('too many failures (' + failed + '), keeping previous summary'); process.exit(1); }
history = history.filter(h => h.day !== day);
history.push(histRow);
await writeFile(new URL('history.json', DIR), JSON.stringify(history.slice(-730), null, 0) + '\n');
summary.history = history.slice(-180).map(h => ({ day: h.day, total: h.total }));
await writeFile(new URL('summary.json', DIR), JSON.stringify(summary, null, 1) + '\n');
console.log('ok ausbildung', day, summary.total, failed ? '(' + failed + ' failed)' : '');
if (failed) process.exitCode = 1;
