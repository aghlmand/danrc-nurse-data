// Salary sample from the ad details (gehaltsspanneVon/Bis stated by employers in the BA job search).
// Incremental: each ad's detail is fetched once and cached; a run fetches at most MAX new ads.
// Usage: node scripts/salary.mjs nurse|jobs|ausbildung  ->  data/salary/<kind>.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const kind = process.argv[2];
if (!['nurse', 'jobs', 'ausbildung'].includes(kind)) { console.error('kind?'); process.exit(1); }
const MAX = +(process.env.MAX || 500);        // new detail requests per run (~1 per second)
const PER = +(process.env.PER || 25);          // newest ads considered per job/trade
const KEEP_DAYS = 120;
const D = new URL('../data/', import.meta.url);
const H = { 'X-API-Key': 'jobboerse-jobsuche', 'User-Agent': 'Mozilla/5.0 (danrc salary stats)' };
const DET = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobdetails/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rd = async (p, fb) => { try { return JSON.parse(await readFile(new URL(p, D), 'utf8')); } catch { return fb; } };
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });

// monthly gross in EUR from one ad, or 0 when no usable salary is stated
function monthly(d) {
  const a = +d.gehaltsspanneVon || 0, b = +d.gehaltsspanneBis || 0;
  const v = a && b ? (a + b) / 2 : (a || b);
  if (!v) return 0;
  let m = d.verguetungsangabe === 'JAHRESGEHALT' ? v / 12 : d.verguetungsangabe === 'STUNDENLOHN' ? v * 173 : d.verguetungsangabe === 'MONATSGEHALT' ? v : 0;
  if (!m) m = v > 20000 ? v / 12 : v < 100 ? v * 173 : v;       // unknown unit: infer
  const lo = kind === 'ausbildung' ? 300 : 900;
  return m >= lo && m <= 30000 ? Math.round(m) : 0;
}

// items: [{key, fa, refs}]
let items = [];
if (kind === 'nurse') {
  const j = await rd('jobs.json', { rows: [] });
  items = [{ key: 'nurse', fa: 'پرستاری', refs: j.rows.slice(0, 400).map(r => r.ref) }];
} else {
  const dir = kind === 'jobs' ? 'jobs/' : 'ausbildung/';
  const s = await rd(dir + 'summary.json', { profs: [] });
  for (const p of s.profs) { const f = await rd(dir + p.key + '.json', { rows: [] }); items.push({ key: p.key, fa: p.fa, refs: f.rows.slice(0, PER).map(r => r.ref) }); }
}

const prev = await rd('salary/' + kind + '.json', {});
const cache = prev.cache || {};                  // ref -> [monthly, day]
let calls = 0, fails = 0;
// round-robin over items so every job gets some samples even when MAX is small
const queues = items.map(i => i.refs.filter(r => !(r in cache)));
outer: for (let round = 0; ; round++) {
  let any = false;
  for (const q of queues) {
    const ref = q[round]; if (!ref) continue; any = true;
    if (calls >= MAX) break outer;
    calls++;
    try {
      const r = await fetch(DET + Buffer.from(ref).toString('base64'), { headers: H });
      if (r.status === 429 || r.status === 503) { console.log('rate limited, stopping'); break outer; }
      if (r.ok) cache[ref] = [monthly(await r.json()), day]; else fails++;
    } catch { fails++; }
    await sleep(1000);
  }
  if (!any) break;
}
// forget old cache entries
const cut = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
for (const k of Object.keys(cache)) if (cache[k][1] < cut) delete cache[k];

const q = (a, p) => a[Math.min(a.length - 1, Math.max(0, Math.round(p * (a.length - 1))))];
const out = { day, kind, updated: new Date().toISOString(), items: {}, cache };
for (const it of items) {
  const v = it.refs.map(r => cache[r] && cache[r][0]).filter(Boolean).sort((a, b) => a - b);
  const checked = it.refs.filter(r => r in cache).length;
  out.items[it.key] = { fa: it.fa, n: v.length, checked, median: v.length ? q(v, .5) : 0, p25: v.length ? q(v, .25) : 0, p75: v.length ? q(v, .75) : 0 };
}
await mkdir(new URL('salary/', D), { recursive: true });
await writeFile(new URL('salary/' + kind + '.json', D), JSON.stringify(out) + '\n');
const ok = Object.values(out.items).filter(x => x.n >= 3).length;
console.log('salary', kind, 'calls', calls, 'fails', fails, 'items with >=3 salaries', ok, '/', items.length);
