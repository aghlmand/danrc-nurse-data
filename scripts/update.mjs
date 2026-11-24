// Nightly snapshot of German nursing job ads from the Federal Employment Agency (BA) public job search.
// Output (served by GitHub Pages, CORS-enabled): data/summary.json, data/jobs.json, data/history.json, data/db.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const BA = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs';
const HEADERS = { 'X-API-Key': 'jobboerse-jobsuche', 'User-Agent': 'Mozilla/5.0 (danrc nurse-jobs data)' };
const DETAIL = 'https://www.arbeitsagentur.de/jobsuche/jobdetail/';
const CITIES = ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt am Main', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hannover', 'Nürnberg'];
const SPECS = ['Pflegefachkraft', 'Gesundheits- und Krankenpfleger', 'Altenpfleger', 'Intensivpflege', 'OP-Pflege', 'Kinderkrankenpfleger', 'Pflegehelfer', 'Hebamme'];
const ADS_QUERY = 'Pflegefachkraft Anerkennung';
const DIR = new URL('../data/', import.meta.url);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ba(params, tries = 4) {
  const u = BA + '?' + new URLSearchParams({ angebotsart: '1', ...params });
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
async function count(was, wo) {
  const p = { was, size: '1', wo: 'Deutschland' };
  if (wo) Object.assign(p, { wo, umkreis: '25' });
  const j = await ba(p);
  await sleep(1000);
  return j.maxErgebnisse || 0;
}
async function readJson(name, fallback) {
  try { return JSON.parse(await readFile(new URL(name, DIR), 'utf8')); } catch { return fallback; }
}
const write = (name, obj) => writeFile(new URL(name, DIR), JSON.stringify(obj, null, name === 'jobs.json' || name === 'db.json' ? 0 : 1) + '\n');

const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' }); // Tehran calendar day (run starts 03:00 Tehran)
await mkdir(DIR, { recursive: true });

// 1) counts
const counts = {};
for (const s of SPECS) counts['spec:' + s] = await count(s);
counts.all = counts['spec:Pflegefachkraft'];
for (const c of CITIES) counts['city:' + c] = await count('Pflegefachkraft', c);

// 2) ads mentioning recognition of foreign degrees (most relevant for Iranian nurses)
const ads = [];
let total = 0;
for (let page = 1; page <= 40; page++) {
  const j = await ba({ was: ADS_QUERY, wo: 'Deutschland', size: '100', page: String(page) });
  total = j.maxErgebnisse || total;
  const list = j.ergebnisliste || [];
  ads.push(...list);
  await sleep(1000);
  if (list.length < 100 || ads.length >= total) break;
}
counts.anerkennung = total;

// 3) database of every ad ever seen (first_seen / last_seen), active = in today's result
const db = await readJson('db.json', {});
const active = [];
const seen = new Set();
for (const a of ads) {
  const ref = a.referenznummer;
  if (!ref || seen.has(ref)) continue;
  seen.add(ref);
  const adr = ((a.stellenlokationen || [])[0] || {}).adresse || {};
  if (adr.land && adr.land !== 'DEUTSCHLAND') continue;
  const row = {
    ref,
    title: a.stellenangebotsTitel || '',
    employer: a.firma || '',
    city: adr.ort || '',
    plz: adr.plz || '',
    region: adr.region || '',
    url: a.externeURL || DETAIL + encodeURIComponent(ref),
    fulltime: !!a.arbeitszeitVollzeit,
    permanent: a.vertragsdauer === 'UNBEFRISTET',
    start: (a.eintrittszeitraum || {}).von || '',
    published: (a.veroeffentlichungszeitraum || {}).von || a.datumErsteVeroeffentlichung || '',
    changed: (a.aenderungsdatum || '').slice(0, 10),
  };
  db[ref] = { ...row, first_seen: (db[ref] && db[ref].first_seen) || day, last_seen: day };
  active.push(db[ref]);
}
for (const k of Object.keys(db)) if (db[k].last_seen < day && db[k].last_seen < new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10)) delete db[k];
active.sort((x, y) => (y.changed || '').localeCompare(x.changed || ''));

const regions = {};
for (const r of active) if (r.region) regions[r.region] = (regions[r.region] || 0) + 1;
const newToday = active.filter(r => r.first_seen === day).length;

const history = (await readJson('history.json', [])).filter(h => h.day !== day);
history.push({ day, all: counts.all, anerkennung: counts.anerkennung, active: active.length, new: newToday });

await write('jobs.json', { day, total: active.length, rows: active });
await write('db.json', db);
await write('history.json', history.slice(-730));
await write('summary.json', {
  day,
  updated: new Date().toISOString(),
  source: 'Bundesagentur für Arbeit – Jobsuche',
  counts,
  regions: Object.entries(regions).sort((a, b) => b[1] - a[1]).map(([region, n]) => ({ region, n })),
  newToday,
  history: history.slice(-180),
});
console.log(`ok ${day}: ${active.length} ads (${newToday} new), all=${counts.all}`);
