// Daily "new ads" message for the Daneshyar Telegram channel.
// Numbers come only from the data files in this repo (official BA data, built nightly).
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (target chat), DRY_RUN=1 to only print.
// Writes data/telegram/last.json so the same day is never posted twice.
import fs from 'node:fs';

const R = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const has = p => fs.existsSync(p);
const PD = '۰۱۲۳۴۵۶۷۸۹';
const fa = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '٬').replace(/\d/g, d => PD[d]);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const tehranDay = new Date(Date.now() + 3.5 * 3600e3).toISOString().slice(0, 10);
const nurse = R('data/summary.json');
const jobs = R('data/jobs/summary.json');
const aus = R('data/ausbildung/summary.json');
const day = nurse.day;
if (process.env.FORCE !== '1' && [nurse.day, jobs.day, aus.day].some(d => d !== tehranDay)) {
  console.log(`data not ready for ${tehranDay} (nurse ${nurse.day}, jobs ${jobs.day}, aus ${aus.day}) - nothing sent`);
  process.exit(0);
}
const last = has('data/telegram/last.json') ? R('data/telegram/last.json') : {};
if (process.env.DRY_RUN !== '1' && process.env.FORCE !== '1' && last.day === day) { console.log('already sent for ' + day); process.exit(0); }

const prev = new Date(new Date(day + 'T12:00:00Z').getTime() - 864e5).toISOString().slice(0, 10);
const fresh = r => (r.published || '') >= prev; // published yesterday or today

function count(dir, profs) {
  const out = [];
  for (const p of profs) {
    const f = `data/${dir}/${p.key}.json`;
    if (!has(f)) continue;
    const rows = R(f).rows || [], n = rows.filter(fresh).length;
    if (n) out.push({ key: p.key, fa: p.fa, n, cap: rows.length >= 200 && n >= rows.length });
  }
  return out.sort((a, b) => b.n - a.n);
}
const J = count('jobs', jobs.profs.filter(p => !['phd', 'researcher', 'postdoc'].includes(p.key)));
const A = count('ausbildung', aus.profs);
const NOISE = /marketing|sales|vertrieb|verkauf|oberarzt|chefarzt|facharzt|assistenzarzt|promoter|\bevents?\b|professur|professor/i;
const ACAD = /promotion|promovier|doktorand|ph\.?d|doctoral|doctorate|wissenschaftlich|wiss\.|research|forsch|post-?doc|scientist|qualifi/i;
const UNI = /universit|hochschule|institut|forschung|max-planck|fraunhofer|helmholtz|leibniz|zentrum|klinikum|akademie|rwth|dlr|desy/i;
const seen = new Set(); let phd = 0;
for (const k of ['phd', 'researcher', 'postdoc']) {
  const f = `data/jobs/${k}.json`; if (!has(f)) continue;
  for (const r of R(f).rows || []) {
    if (seen.has(r.ref)) continue; const t = r.title || '';
    if (NOISE.test(t) || !(ACAD.test(t) || UNI.test(r.employer || ''))) continue;
    seen.add(r.ref); if (fresh(r)) phd++;
  }
}
const sum = a => a.reduce((s, x) => s + x.n, 0);
const top = (a, k) => a.slice(0, k).map(x => `${esc(x.fa)} ${x.cap ? fa(x.n) + '+' : fa(x.n)}`).join(' | ');
const capd = a => a.some(x => x.cap) ? 'بیش از ' : '';
const U = (path, c) => `https://danrc.com${path}?utm_source=telegram&utm_medium=channel&utm_campaign=daily&utm_content=${c}`;
const pday = new Date(day + 'T12:00:00Z').toLocaleDateString('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric' });

const lines = [
  `🆕 <b>آگهی‌های تازه‌ی امروز در آلمان</b> | ${pday}`,
  '',
  `🩺 <b>پرستاری با مدرک خارجی:</b> ${fa(nurse.newToday)} آگهی تازه`,
  `<a href="${U('/nurse', 'nurse')}">دیدن روی نقشه ←</a>`,
  '',
  `💼 <b>کار در آلمان:</b> ${capd(J)}${fa(sum(J))} آگهی تازه در ${fa(J.length)} شغل`,
  J.length ? `بیشترین: ${top(J, 4)}` : '',
  `<a href="${U('/jobs', 'jobs')}">دیدن روی نقشه ←</a>`,
  '',
  `🎓 <b>اوسبیلدونگ:</b> ${capd(A)}${fa(sum(A))} جای آموزش تازه در ${fa(A.length)} رشته`,
  A.length ? `بیشترین: ${top(A, 4)}` : '',
  `<a href="${U('/ausbildung', 'ausbildung')}">دیدن روی نقشه ←</a>`,
  '',
  `🏛 <b>دکتری و پژوهشی:</b> ${fa(phd)} موقعیت تازه`,
  `<a href="${U('/study-germany', 'phd')}">دیدن فهرست ←</a>`,
  '',
  'منبع: سامانه‌ی رسمی اداره‌ی کار آلمان (Bundesagentur für Arbeit)؛ «تازه» یعنی منتشرشده از دیروز. تصمیم استخدام با کارفرما و تصمیم ویزا با سفارت است.',
  '💬 مشاوره: @danrc_Mirzaei',
].filter((l, i, a) => !(l === '' && a[i - 1] === ''));
const text = lines.join('\n');
console.log(text);

if (process.env.DRY_RUN === '1') process.exit(0);
const tok = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
if (!tok || !chat) { console.error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID secrets are missing - nothing sent'); process.exit(1); }
const res = await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }),
});
const j = await res.json();
if (!j.ok) { console.error('telegram error', j.description); process.exit(1); }
fs.mkdirSync('data/telegram', { recursive: true });
fs.writeFileSync('data/telegram/last.json', JSON.stringify({ day, chat: String(chat).replace(/\d(?=\d{3})/g, '*'), message_id: j.result.message_id, sent: new Date().toISOString() }, null, 1));
console.log('sent', j.result.message_id);
