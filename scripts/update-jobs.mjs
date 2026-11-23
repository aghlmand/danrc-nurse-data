// Nightly snapshot of in-demand non-nursing jobs in Germany (BA Jobsuche) for danrc.com/jobs
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const BA = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs';
const HEADERS = { 'X-API-Key': 'jobboerse-jobsuche', 'User-Agent': 'Mozilla/5.0 (danrc jobs data)' };
const DETAIL = 'https://www.arbeitsagentur.de/jobsuche/jobdetail/';
const CITIES = ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt am Main', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hannover', 'Nürnberg'];
export const PROFS = [
  { key: 'it', was: 'Softwareentwickler', fa: 'برنامه‌نویس', g: 'it' },
  { key: 'itadmin', was: 'IT-Administrator', fa: 'شبکه و IT', g: 'it' },
  { key: 'data', was: 'Data Analyst', fa: 'تحلیلگر داده', g: 'it' },
  { key: 'civil', was: 'Bauingenieur', fa: 'مهندس عمران', g: 'eng' },
  { key: 'mech', was: 'Ingenieur Maschinenbau', fa: 'مهندس مکانیک', g: 'eng' },
  { key: 'elec', was: 'Elektroingenieur', fa: 'مهندس برق', g: 'eng' },
  { key: 'arch', was: 'Architekt', fa: 'معمار', g: 'eng' },
  { key: 'doctor', was: 'Arzt', fa: 'پزشک', g: 'med' },
  { key: 'dentist', was: 'Zahnarzt', fa: 'دندانپزشک', g: 'med' },
  { key: 'pharma', was: 'Apotheker', fa: 'داروساز', g: 'med' },
  { key: 'physio', was: 'Physiotherapeut', fa: 'فیزیوتراپیست', g: 'med' },
  { key: 'mfa', was: 'Medizinische Fachangestellte', fa: 'دستیار پزشک (MFA)', g: 'med' },
  { key: 'electrician', was: 'Elektriker', fa: 'برق‌کار', g: 'craft' },
  { key: 'plumber', was: 'Anlagenmechaniker', fa: 'لوله‌کش و تأسیسات', g: 'craft' },
  { key: 'carmech', was: 'Kfz-Mechatroniker', fa: 'مکانیک خودرو', g: 'craft' },
  { key: 'mechatronic', was: 'Mechatroniker', fa: 'مکاترونیک', g: 'craft' },
  { key: 'welder', was: 'Schweißer', fa: 'جوشکار', g: 'craft' },
  { key: 'cnc', was: 'Zerspanungsmechaniker', fa: 'تراشکار و CNC', g: 'craft' },
  { key: 'mason', was: 'Maurer', fa: 'بنّا', g: 'craft' },
  { key: 'carpenter', was: 'Tischler', fa: 'نجار', g: 'craft' },
  { key: 'driver', was: 'Berufskraftfahrer', fa: 'راننده‌ی کامیون', g: 'trans' },
  { key: 'bus', was: 'Busfahrer', fa: 'راننده‌ی اتوبوس', g: 'trans' },
  { key: 'logistics', was: 'Fachkraft für Lagerlogistik', fa: 'انبار و لجستیک', g: 'trans' },
  { key: 'cook', was: 'Koch', fa: 'آشپز', g: 'hosp' },
  { key: 'hotel', was: 'Hotelfachmann', fa: 'هتلداری', g: 'hosp' },
  { key: 'baker', was: 'Bäcker', fa: 'نانوا', g: 'hosp' },
  { key: 'educator', was: 'Erzieher', fa: 'مربی مهدکودک', g: 'office' },
  { key: 'accountant', was: 'Buchhalter', fa: 'حسابدار', g: 'office' },
  { key: 'office', was: 'Kaufmann Büromanagement', fa: 'کارمند اداری', g: 'office' },
  { key: 'sales', was: 'Verkäufer', fa: 'فروشنده', g: 'office' },
];
const PER_PROF = 60;
const DIR = new URL('../data/jobs/', import.meta.url);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ba(params, tries = 3) {
  const u = BA + '?' + new URLSearchParams({ angebotsart: '1', ...params });
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(u, { headers: HEADERS });
      if (r.ok) return await r.json();
      if (i === tries) throw new Error('BA HTTP ' + r.status);
    } catch (e) { if (i === tries) throw e; }
    await sleep(2000 * i);
  }
}
const day = new Date().toISOString().slice(0, 10);
await mkdir(DIR, { recursive: true });
const summary = { day, updated: new Date().toISOString(), source: 'Bundesagentur für Arbeit – Jobsuche', profs: [] };
let history = [];
try { history = JSON.parse(await readFile(new URL('history.json', DIR), 'utf8')); } catch {}
const histRow = { day };

for (const p of PROFS) {
  const first = await ba({ was: p.was, size: String(PER_PROF), page: '1' });
  await sleep(300);
  const total = first.maxErgebnisse || 0;
  const cities = {};
  for (const c of CITIES) {
    const j = await ba({ was: p.was, wo: c, umkreis: '25', size: '1' });
    cities[c] = j.maxErgebnisse || 0;
    await sleep(250);
  }
  const rows = [];
  const seen = new Set();
  for (const a of first.ergebnisliste || []) {
    const ref = a.referenznummer;
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    const adr = ((a.stellenlokationen || [])[0] || {}).adresse || {};
    if (adr.land && adr.land !== 'DEUTSCHLAND') continue;
    rows.push({
      ref, title: a.stellenangebotsTitel || '', employer: a.firma || '', city: adr.ort || '', plz: adr.plz || '',
      region: adr.region || '', url: a.externeURL || DETAIL + encodeURIComponent(ref),
      fulltime: !!a.arbeitszeitVollzeit, permanent: a.vertragsdauer === 'UNBEFRISTET',
      published: (a.veroeffentlichungszeitraum || {}).von || a.datumErsteVeroeffentlichung || '',
      changed: (a.aenderungsdatum || '').slice(0, 10),
    });
  }
  rows.sort((x, y) => (y.changed || '').localeCompare(x.changed || ''));
  const regions = {};
  for (const r of rows) if (r.region) regions[r.region] = (regions[r.region] || 0) + 1;
  await writeFile(new URL(p.key + '.json', DIR), JSON.stringify({ day, key: p.key, was: p.was, total, rows }) + '\n');
  summary.profs.push({ key: p.key, was: p.was, fa: p.fa, g: p.g, total, cities, regions });
  histRow[p.key] = total;
  console.log(p.key, total, rows.length);
}
history = history.filter(h => h.day !== day);
history.push(histRow);
await writeFile(new URL('history.json', DIR), JSON.stringify(history.slice(-730), null, 0) + '\n');
summary.history = history.slice(-180);
await writeFile(new URL('summary.json', DIR), JSON.stringify(summary, null, 1) + '\n');
console.log('ok jobs', day);
