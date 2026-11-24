// Daily statistics for the danrc.com pages, computed only from the data this repo already collected.
// Usage: node scripts/stats.mjs nurse|jobs|ausbildung  ->  data/stats/<kind>.json
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';

const kind = process.argv[2];
if (!['nurse', 'jobs', 'ausbildung'].includes(kind)) { console.error('kind?'); process.exit(1); }
const D = new URL('../data/', import.meta.url);
const rd = async (p, fb) => { try { return JSON.parse(await readFile(new URL(p, D), 'utf8')); } catch { return fb; } };
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
const dnum = s => Date.parse((s || '').slice(0, 10) + 'T12:00:00Z');
const today = dnum(day);
const EAST = ['BRANDENBURG', 'MECKLENBURG_VORPOMMERN', 'SACHSEN', 'SACHSEN_ANHALT', 'THUERINGEN'];
const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : 0;

// ---- load rows, per-item totals, history
let rows = [], items = [], history = [], cities = {}, extra = {};
if (kind === 'nurse') {
  const s = await rd('summary.json', {}), j = await rd('jobs.json', { rows: [] });
  rows = j.rows; history = (await rd('history.json', [])).map(h => ({ day: h.day, v: h.all, v2: h.anerkennung, n: h.new }));
  const SPEC = { 'Pflegefachkraft': 'پرستار (Pflegefachkraft)', 'Gesundheits- und Krankenpfleger': 'پرستار بیمارستان', 'Altenpfleger': 'پرستار سالمندان', 'Intensivpflege': 'مراقبت ویژه (ICU)', 'OP-Pflege': 'پرستار اتاق عمل', 'Kinderkrankenpfleger': 'پرستار کودکان', 'Pflegehelfer': 'کمک‌پرستار', 'Hebamme': 'مامایی' };
  for (const [k, v] of Object.entries(s.counts || {})) {
    if (k.startsWith('spec:')) items.push({ key: k.slice(5), fa: SPEC[k.slice(5)] || k.slice(5), total: v });
    if (k.startsWith('city:')) cities[k.slice(5)] = v;
  }
  extra.all = (s.counts || {}).all || 0; extra.anerkennung = (s.counts || {}).anerkennung || 0;
  extra.anerkShare = pct(extra.anerkennung, extra.all);
  // how long do nurse ads stay online? (ads that disappeared, first_seen..last_seen)
  const db = await rd('db.json', {});
  const life = Object.values(db).filter(r => r.last_seen && r.last_seen < day).map(r => (dnum(r.last_seen) - dnum(r.first_seen)) / 864e5 + 1);
  extra.lifeDays = life.length >= 20 ? Math.round(life.reduce((a, b) => a + b, 0) / life.length) : null;
  extra.lifeN = life.length;
  extra.newToday = (history[history.length - 1] || {}).n || 0;
} else {
  const dir = kind === 'jobs' ? 'jobs/' : 'ausbildung/';
  const s = await rd(dir + 'summary.json', { profs: [] });
  const seen = new Set();
  for (const p of s.profs) {
    items.push({ key: p.key, fa: p.fa, total: p.total, g: p.g });
    for (const [c, n] of Object.entries(p.cities || {})) cities[c] = (cities[c] || 0) + n;
    const f = await rd(dir + p.key + '.json', { rows: [] });
    for (const r of f.rows) if (!seen.has(r.ref)) { seen.add(r.ref); rows.push(r); }
  }
  const h = await rd(dir + 'history.json', []);
  history = h.map(x => ({ day: x.day, v: kind === 'ausbildung' ? x.total : Object.entries(x).filter(([k]) => k !== 'day').reduce((a, [, v]) => a + (+v || 0), 0) }));
  // growth per item vs. ~7 days earlier (only when that history exists)
  const last = h[h.length - 1], base = h.slice().reverse().find(x => last && (dnum(last.day) - dnum(x.day)) / 864e5 >= 7);
  if (last && base) {
    const ch = items.filter(i => base[i.key] >= 30 && last[i.key]).map(i => ({ fa: i.fa, from: base[i.key], to: last[i.key], p: pct(last[i.key] - base[i.key], base[i.key]) }));
    extra.rising = ch.sort((a, b) => b.p - a.p).slice(0, 6); extra.falling = ch.sort((a, b) => a.p - b.p).slice(0, 3); extra.growthDays = Math.round((dnum(last.day) - dnum(base.day)) / 864e5);
  }
  if (kind === 'ausbildung') {
    extra.total = s.total; extra.paidShare = pct(s.paid, s.total); extra.external = s.external;
    // start month of the training (official facet, all ads)
    const months = {};
    for (const [k, v] of Object.entries(s.start || {})) { const m = /^(\d\d)_(\d\d)_01-/.exec(k); if (m) months['20' + m[1] + '-' + m[2]] = v; }
    extra.startMonths = Object.entries(months).sort().filter(([m]) => m >= day.slice(0, 7)).slice(0, 12);
    extra.startNow = (s.start || {})['10_01_01-now'] || 0;
    const groups = {};
    for (const i of items) groups[i.g] = (groups[i.g] || 0) + i.total;
    extra.groups = top(groups, 10);
  }
}

// ---- row based facts (newest ads sample)
const states = {}, employers = {}, wd = [0, 0, 0, 0, 0, 0, 0];
let east = 0, berlin = 0, ft = 0, perm = 0, fresh7 = 0, withPub = 0;
for (const r of rows) {
  if (r.region && r.region !== 'SONSTIGES') { states[r.region] = (states[r.region] || 0) + 1; if (EAST.includes(r.region)) east++; if (r.region === 'BERLIN') berlin++; }
  if (r.employer && !/anonym/i.test(r.employer)) employers[r.employer] = (employers[r.employer] || 0) + 1;
  if (r.fulltime) ft++; if (r.permanent) perm++;
  const t = dnum(r.published);
  if (t) { const age = (today - t) / 864e5; if (age <= 60) { wd[new Date(t).getUTCDay()]++; withPub++; } if (age <= 7) fresh7++; }
}
const regionRows = Object.values(states).reduce((a, b) => a + b, 0);
const out = {
  day, kind, updated: new Date().toISOString(), sample: rows.length,
  history: history.slice(-120),
  top: items.sort((a, b) => b.total - a.total).slice(0, 10).map(i => [i.fa, i.total]),
  cities: top(cities, 14),
  states: top(states, 16), eastShare: pct(east, regionRows), berlinShare: pct(berlin, regionRows),
  employers: top(employers, 10),
  weekday: wd, weekdayN: withPub, fresh7Share: pct(fresh7, rows.length),
  fulltimeShare: kind === 'ausbildung' ? null : pct(ft, rows.length), permanentShare: kind === 'ausbildung' ? null : pct(perm, rows.length),
  ...extra,
};
await mkdir(new URL('stats/', D), { recursive: true });
await writeFile(new URL('stats/' + kind + '.json', D), JSON.stringify(out) + '\n');
console.log('stats', kind, 'rows', rows.length, 'east', out.eastShare + '%', 'top', out.top[0]);
