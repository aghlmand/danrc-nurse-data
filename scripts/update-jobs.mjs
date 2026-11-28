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
  { key: 'itsec', was: 'IT-Sicherheit', fa: 'امنیت سایبری', g: 'it' },
  { key: 'sap', was: 'SAP Berater', fa: 'مشاور SAP', g: 'it' },
  { key: 'devops', was: 'DevOps Engineer', fa: 'DevOps', g: 'it' },
  { key: 'ai', was: 'Künstliche Intelligenz', fa: 'هوش مصنوعی', g: 'it' },
  { key: 'datasci', was: 'Data Scientist', fa: 'دانشمند داده', g: 'it' },
  { key: 'wiinf', was: 'Wirtschaftsinformatiker', fa: 'فناوری اطلاعات سازمانی', g: 'it' },
  { key: 'embedded', was: 'Embedded Software', fa: 'برنامه‌نویس سیستم‌های نهفته', g: 'it' },
  { key: 'siteman', was: 'Bauleiter', fa: 'سرپرست کارگاه ساختمانی', g: 'eng' },
  { key: 'indeng', was: 'Wirtschaftsingenieur', fa: 'مهندس صنایع', g: 'eng' },
  { key: 'hvac', was: 'Versorgungstechnik Ingenieur', fa: 'مهندس تأسیسات', g: 'eng' },
  { key: 'chemeng', was: 'Verfahrenstechnik Ingenieur', fa: 'مهندس شیمی و فرایند', g: 'eng' },
  { key: 'gis', was: 'Geoinformatiker', fa: 'کارشناس GIS', g: 'eng' },
  { key: 'rnd', was: 'Forschung und Entwicklung', fa: 'تحقیق و توسعه (R&D)', g: 'res' },
  { key: 'phd', was: 'Promotion', fa: 'موقعیت دکتری', g: 'res' },
  { key: 'postdoc', was: 'Postdoc', fa: 'پسادکتری', g: 'res' },
  { key: 'prof', was: 'Professor', fa: 'استاد دانشگاه', g: 'res' },
  { key: 'lecturer', was: 'Dozent', fa: 'مدرس دانشگاه', g: 'res' },
  { key: 'researcher', was: 'Wissenschaftlicher Mitarbeiter', fa: 'پژوهشگر دانشگاه', g: 'res' },
  { key: 'physicist', was: 'Physiker', fa: 'فیزیکدان', g: 'res' },
  { key: 'biologist', was: 'Biologe', fa: 'زیست‌شناس', g: 'res' },
  { key: 'mathematician', was: 'Mathematiker', fa: 'ریاضیدان', g: 'res' },
  { key: 'geologist', was: 'Geologe', fa: 'زمین‌شناس', g: 'res' },
  { key: 'agri', was: 'Agrarwissenschaftler', fa: 'کشاورزی و منابع طبیعی', g: 'res' },
  { key: 'clinres', was: 'Klinische Forschung', fa: 'پژوهش بالینی', g: 'res' },
  { key: 'chemlab', was: 'Chemielaborant', fa: 'کارشناس آزمایشگاه شیمی', g: 'res' },
  { key: 'cta', was: 'Chemisch-technischer Assistent', fa: 'دستیار فنی شیمی (CTA)', g: 'res' },
  { key: 'bta', was: 'Biologisch-technischer Assistent', fa: 'دستیار فنی زیست‌شناسی (BTA)', g: 'res' },
  { key: 'qalab', was: 'Qualitätssicherung Labor', fa: 'کنترل کیفیت آزمایشگاه', g: 'res' },
  { key: 'regaff', was: 'Regulatory Affairs', fa: 'امور ثبت دارو و تجهیزات پزشکی', g: 'res' },
  { key: 'zfa', was: 'Zahnmedizinische Fachangestellte', fa: 'دستیار دندانپزشک', g: 'med' },
  { key: 'ergo', was: 'Ergotherapeut', fa: 'کاردرمانگر', g: 'med' },
  { key: 'logo', was: 'Logopäde', fa: 'گفتاردرمانگر', g: 'med' },
  { key: 'ota', was: 'Operationstechnischer Assistent', fa: 'تکنسین اتاق عمل', g: 'med' },
  { key: 'dentaltech', was: 'Zahntechniker', fa: 'تکنسین دندانسازی', g: 'med' },
  { key: 'vet', was: 'Tierarzt', fa: 'دامپزشک', g: 'med' },
  { key: 'psych', was: 'Psychologe', fa: 'روانشناس', g: 'med' },
  { key: 'pta', was: 'Pharmazeutisch-technischer Assistent', fa: 'تکنسین داروخانه (PTA)', g: 'med' },
  { key: 'mtr', was: 'Medizinische Technologe Radiologie', fa: 'تکنسین رادیولوژی', g: 'med' },
  { key: 'paramedic', was: 'Notfallsanitäter', fa: 'امدادگر اورژانس', g: 'med' },
  { key: 'indmech', was: 'Industriemechaniker', fa: 'مکانیک صنعتی', g: 'craft' },
  { key: 'elecind', was: 'Elektroniker für Betriebstechnik', fa: 'برق صنعتی', g: 'craft' },
  { key: 'metal', was: 'Metallbauer', fa: 'فلزکار و سازه‌ی فلزی', g: 'craft' },
  { key: 'painter', was: 'Maler und Lackierer', fa: 'نقاش ساختمان', g: 'craft' },
  { key: 'roofer', was: 'Dachdecker', fa: 'سقف‌ساز و عایق‌کار', g: 'craft' },
  { key: 'joiner', was: 'Zimmerer', fa: 'نجار سازه‌ی چوبی', g: 'craft' },
  { key: 'agrimech', was: 'Land- und Baumaschinenmechatroniker', fa: 'مکانیک ماشین‌آلات کشاورزی و راهسازی', g: 'craft' },
  { key: 'hvacr', was: 'Mechatroniker Kältetechnik', fa: 'تبرید و تهویه', g: 'craft' },
  { key: 'tiler', was: 'Fliesenleger', fa: 'کاشی‌کار', g: 'craft' },
  { key: 'farmer', was: 'Landwirt', fa: 'کشاورز', g: 'craft' },
  { key: 'forklift', was: 'Gabelstaplerfahrer', fa: 'راننده‌ی لیفتراک', g: 'trans' },
  { key: 'train', was: 'Lokführer', fa: 'راننده‌ی قطار', g: 'trans' },
  { key: 'service', was: 'Servicekraft', fa: 'گارسون و خدمات رستوران', g: 'hosp' },
  { key: 'butcher', was: 'Fleischer', fa: 'قصاب', g: 'hosp' },
  { key: 'cleaner', was: 'Gebäudereiniger', fa: 'نظافت ساختمان', g: 'hosp' },
  { key: 'hair', was: 'Friseur', fa: 'آرایشگر', g: 'hosp' },
  { key: 'social', was: 'Sozialarbeiter', fa: 'مددکار اجتماعی', g: 'office' },
  { key: 'hep', was: 'Heilerziehungspfleger', fa: 'مربی افراد دارای معلولیت', g: 'office' },
  { key: 'teacher', was: 'Lehrer', fa: 'معلم', g: 'office' },
  { key: 'tax', was: 'Steuerfachangestellter', fa: 'کارشناس مالیاتی', g: 'office' },
  { key: 'pm', was: 'Projektmanager', fa: 'مدیر پروژه', g: 'office' },
  { key: 'controller', was: 'Controller', fa: 'کنترلر مالی', g: 'office' },
  { key: 'buyer', was: 'Einkäufer', fa: 'خرید و تدارکات', g: 'office' },
  { key: 'marketing', was: 'Online Marketing', fa: 'بازاریابی آنلاین', g: 'office' },
  // 2026-11-28: +107 jobs (93 -> 200)
  { key: 'frontend', was: 'Frontend Entwickler', fa: 'برنامه‌نویس فرانت‌اند', g: 'it' },
  { key: 'backend', was: 'Backend Entwickler', fa: 'برنامه‌نویس بک‌اند', g: 'it' },
  { key: 'fullstack', was: 'Fullstack Entwickler', fa: 'برنامه‌نویس فول‌استک', g: 'it' },
  { key: 'java', was: 'Java Entwickler', fa: 'برنامه‌نویس جاوا', g: 'it' },
  { key: 'python', was: 'Python Entwickler', fa: 'برنامه‌نویس پایتون', g: 'it' },
  { key: 'mobile', was: 'App Entwickler', fa: 'برنامه‌نویس اپلیکیشن موبایل', g: 'it' },
  { key: 'webdev', was: 'Webentwickler', fa: 'طراح و برنامه‌نویس وب', g: 'it' },
  { key: 'cloud', was: 'Cloud Engineer', fa: 'مهندس کلود', g: 'it' },
  { key: 'netadmin', was: 'Netzwerkadministrator', fa: 'مدیر شبکه', g: 'it' },
  { key: 'itsupport', was: 'IT-Support', fa: 'پشتیبانی IT', g: 'it' },
  { key: 'tester', was: 'Softwaretester', fa: 'تست نرم‌افزار', g: 'it' },
  { key: 'ux', was: 'UX Designer', fa: 'طراح تجربه‌ی کاربری (UX)', g: 'it' },
  { key: 'dataeng', was: 'Data Engineer', fa: 'مهندس داده', g: 'it' },
  { key: 'dba', was: 'Datenbankadministrator', fa: 'مدیر پایگاه داده', g: 'it' },
  { key: 'itpm', was: 'IT-Projektmanager', fa: 'مدیر پروژه‌ی IT', g: 'it' },
  { key: 'automation', was: 'Automatisierungstechnik Ingenieur', fa: 'مهندس اتوماسیون', g: 'eng' },
  { key: 'mechatroeng', was: 'Ingenieur Mechatronik', fa: 'مهندس مکاترونیک', g: 'eng' },
  { key: 'autoeng', was: 'Ingenieur Fahrzeugtechnik', fa: 'مهندس خودرو', g: 'eng' },
  { key: 'aero', was: 'Ingenieur Luft- und Raumfahrttechnik', fa: 'مهندس هوافضا', g: 'eng' },
  { key: 'surveyor', was: 'Vermessungsingenieur', fa: 'مهندس نقشه‌برداری', g: 'eng' },
  { key: 'planner', was: 'Stadtplaner', fa: 'شهرساز', g: 'eng' },
  { key: 'structural', was: 'Statiker', fa: 'محاسب سازه', g: 'eng' },
  { key: 'enveng', was: 'Umweltingenieur', fa: 'مهندس محیط زیست', g: 'eng' },
  { key: 'energy', was: 'Ingenieur Energietechnik', fa: 'مهندس انرژی', g: 'eng' },
  { key: 'renew', was: 'Erneuerbare Energien Ingenieur', fa: 'مهندس انرژی‌های تجدیدپذیر', g: 'eng' },
  { key: 'quality', was: 'Qualitätsingenieur', fa: 'مهندس کنترل کیفیت', g: 'eng' },
  { key: 'designer', was: 'Konstrukteur', fa: 'طراح مکانیک (Konstrukteur)', g: 'eng' },
  { key: 'techdraft', was: 'Technischer Zeichner', fa: 'نقشه‌کش صنعتی', g: 'eng' },
  { key: 'materials', was: 'Werkstoffingenieur', fa: 'مهندس مواد', g: 'eng' },
  { key: 'medtecheng', was: 'Ingenieur Medizintechnik', fa: 'مهندس پزشکی', g: 'eng' },
  { key: 'telecom', was: 'Ingenieur Nachrichtentechnik', fa: 'مهندس مخابرات', g: 'eng' },
  { key: 'elektrotechniker', was: 'Elektrotechniker', fa: 'تکنسین برق', g: 'eng' },
  { key: 'projeng', was: 'Projektingenieur', fa: 'مهندس پروژه', g: 'eng' },
  { key: 'biotech', was: 'Biotechnologe', fa: 'بیوتکنولوژیست', g: 'res' },
  { key: 'chemist', was: 'Chemiker', fa: 'شیمیدان', g: 'res' },
  { key: 'foodtech', was: 'Lebensmitteltechnologe', fa: 'مهندس صنایع غذایی', g: 'res' },
  { key: 'statistician', was: 'Statistiker', fa: 'آماردان', g: 'res' },
  { key: 'economist', was: 'Volkswirt', fa: 'اقتصاددان', g: 'res' },
  { key: 'labtech', was: 'Laborant', fa: 'کارشناس آزمایشگاه', g: 'res' },
  { key: 'mtl', was: 'Medizinische Technologe Laboratoriumsanalytik', fa: 'تکنسین آزمایشگاه پزشکی', g: 'med' },
  { key: 'psychotherapist', was: 'Psychotherapeut', fa: 'روان‌درمانگر', g: 'med' },
  { key: 'nutrition', was: 'Ernährungsberater', fa: 'کارشناس تغذیه', g: 'med' },
  { key: 'midwife', was: 'Hebamme', fa: 'ماما', g: 'med' },
  { key: 'optician', was: 'Augenoptiker', fa: 'عینک‌ساز (اپتیک)', g: 'med' },
  { key: 'hearing', was: 'Hörakustiker', fa: 'شنوایی‌سنج و سمعک', g: 'med' },
  { key: 'orthotech', was: 'Orthopädietechniker', fa: 'تکنسین ارتوپدی فنی', g: 'med' },
  { key: 'ata', was: 'Anästhesietechnischer Assistent', fa: 'تکنسین بیهوشی', g: 'med' },
  { key: 'tfa', was: 'Tiermedizinische Fachangestellte', fa: 'دستیار دامپزشک', g: 'med' },
  { key: 'sportther', was: 'Sporttherapeut', fa: 'ورزش‌درمانگر', g: 'med' },
  { key: 'pharmarep', was: 'Pharmareferent', fa: 'نماینده‌ی علمی دارو', g: 'med' },
  { key: 'rettsan', was: 'Rettungssanitäter', fa: 'امدادگر (Rettungssanitäter)', g: 'med' },
  { key: 'assistarzt', was: 'Assistenzarzt', fa: 'پزشک دستیار (رزیدنت)', g: 'med' },
  { key: 'facharzt', was: 'Facharzt', fa: 'پزشک متخصص', g: 'med' },
  { key: 'carpaint', was: 'Fahrzeuglackierer', fa: 'نقاش خودرو', g: 'craft' },
  { key: 'bodywork', was: 'Karosseriebauer', fa: 'صافکار خودرو', g: 'craft' },
  { key: 'glazier', was: 'Glaser', fa: 'شیشه‌بر و شیشه‌کار', g: 'craft' },
  { key: 'plasterer', was: 'Stuckateur', fa: 'گچ‌کار', g: 'craft' },
  { key: 'drywall', was: 'Trockenbauer', fa: 'کناف‌کار (دیوار خشک)', g: 'craft' },
  { key: 'floorlayer', was: 'Bodenleger', fa: 'کفپوش‌کار', g: 'craft' },
  { key: 'roadbuilder', was: 'Straßenbauer', fa: 'راهساز', g: 'craft' },
  { key: 'excavator', was: 'Baggerfahrer', fa: 'راننده‌ی بیل مکانیکی', g: 'craft' },
  { key: 'crane', was: 'Kranführer', fa: 'اپراتور جرثقیل', g: 'craft' },
  { key: 'scaffold', was: 'Gerüstbauer', fa: 'داربست‌بند', g: 'craft' },
  { key: 'machineop', was: 'Maschinenführer', fa: 'اپراتور ماشین‌آلات تولید', g: 'craft' },
  { key: 'plastics', was: 'Verfahrensmechaniker Kunststoff', fa: 'تکنسین قالب‌گیری پلاستیک', g: 'craft' },
  { key: 'toolmaker', was: 'Werkzeugmechaniker', fa: 'قالب‌ساز', g: 'craft' },
  { key: 'elecauto', was: 'Elektroniker Automatisierungstechnik', fa: 'برق اتوماسیون صنعتی', g: 'craft' },
  { key: 'solar', was: 'Solarteur', fa: 'نصاب پنل خورشیدی', g: 'craft' },
  { key: 'gardener', was: 'Gärtner', fa: 'باغبان', g: 'craft' },
  { key: 'landscaper', was: 'Garten- und Landschaftsbau', fa: 'فضای سبز و محوطه‌سازی', g: 'craft' },
  { key: 'janitor', was: 'Hausmeister', fa: 'سرایدار و تعمیرات ساختمان', g: 'craft' },
  { key: 'locksmith', was: 'Schlosser', fa: 'آهنگر و قفل‌ساز', g: 'craft' },
  { key: 'installer', was: 'Monteur', fa: 'نصاب و مونتاژکار', g: 'craft' },
  { key: 'prodhelper', was: 'Produktionshelfer', fa: 'کارگر تولید', g: 'craft' },
  { key: 'servicetech', was: 'Servicetechniker', fa: 'تکنسین خدمات فنی', g: 'craft' },
  { key: 'courier', was: 'Kurierfahrer', fa: 'پیک و راننده‌ی کوریر', g: 'trans' },
  { key: 'tram', was: 'Straßenbahnfahrer', fa: 'راننده‌ی تراموا', g: 'trans' },
  { key: 'dispatcher', was: 'Disponent', fa: 'برنامه‌ریز حمل‌ونقل', g: 'trans' },
  { key: 'spedition', was: 'Kaufmann Spedition und Logistikdienstleistung', fa: 'بازرگانی حمل‌ونقل و لجستیک', g: 'trans' },
  { key: 'warehouse', was: 'Lagerhelfer', fa: 'کارگر انبار', g: 'trans' },
  { key: 'delivery', was: 'Auslieferungsfahrer', fa: 'راننده‌ی پخش', g: 'trans' },
  { key: 'trainstaff', was: 'Zugbegleiter', fa: 'مهماندار قطار', g: 'trans' },
  { key: 'chef', was: 'Küchenchef', fa: 'سرآشپز', g: 'hosp' },
  { key: 'kitchenhelp', was: 'Küchenhilfe', fa: 'کمک‌آشپز', g: 'hosp' },
  { key: 'barista', was: 'Barista', fa: 'باریستا', g: 'hosp' },
  { key: 'confectioner', was: 'Konditor', fa: 'شیرینی‌پز', g: 'hosp' },
  { key: 'reception', was: 'Rezeptionist', fa: 'پذیرش هتل', g: 'hosp' },
  { key: 'housekeeping', was: 'Housekeeping', fa: 'خانه‌داری هتل', g: 'hosp' },
  { key: 'security', was: 'Sicherheitsmitarbeiter', fa: 'نگهبان و حراست', g: 'hosp' },
  { key: 'beautician', was: 'Kosmetiker', fa: 'متخصص زیبایی', g: 'hosp' },
  { key: 'sysgastro', was: 'Fachmann Systemgastronomie', fa: 'رستوران‌های زنجیره‌ای', g: 'hosp' },
  { key: 'fitness', was: 'Fitnesstrainer', fa: 'مربی بدنسازی', g: 'hosp' },
  { key: 'hr', was: 'Personalreferent', fa: 'کارشناس منابع انسانی', g: 'office' },
  { key: 'mktmgr', was: 'Marketing Manager', fa: 'مدیر بازاریابی', g: 'office' },
  { key: 'salesrep', was: 'Vertriebsmitarbeiter', fa: 'کارشناس فروش', g: 'office' },
  { key: 'custservice', was: 'Kundenservice', fa: 'خدمات مشتری', g: 'office' },
  { key: 'translator', was: 'Übersetzer', fa: 'مترجم', g: 'office' },
  { key: 'bank', was: 'Bankkaufmann', fa: 'کارمند بانک', g: 'office' },
  { key: 'insurance', was: 'Versicherungskaufmann', fa: 'کارشناس بیمه', g: 'office' },
  { key: 'realestate', was: 'Immobilienkaufmann', fa: 'کارشناس املاک', g: 'office' },
  { key: 'secretary', was: 'Sekretär', fa: 'منشی و دستیار مدیر', g: 'office' },
  { key: 'graphic', was: 'Grafikdesigner', fa: 'طراح گرافیک', g: 'office' },
  { key: 'kinderpfleger', was: 'Kinderpfleger', fa: 'کمک‌مربی کودک', g: 'office' },
  { key: 'sozpaed', was: 'Sozialpädagoge', fa: 'مددکار و پداگوگ اجتماعی', g: 'office' },
  { key: 'taxadv', was: 'Steuerberater', fa: 'مشاور مالیاتی', g: 'office' },
  { key: 'auditor', was: 'Wirtschaftsprüfer', fa: 'حسابرس', g: 'office' },
  { key: 'payroll', was: 'Lohnbuchhalter', fa: 'حسابدار حقوق و دستمزد', g: 'office' },
];
const PER_PROF = 200;            // newest ads stored per job (2 pages of 100)
const DIR = new URL('../data/jobs/', import.meta.url);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAUSE = 1000;          // ~1 request per second, one at a time
const CITY_DAY = 1;          // city counts refreshed weekly (Monday, UTC) or when missing
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
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' }); // Tehran calendar day (run starts 03:00 Tehran)
await mkdir(DIR, { recursive: true });
const summary = { day, updated: new Date().toISOString(), source: 'Bundesagentur für Arbeit – Jobsuche', profs: [] };
let history = [];
try { history = JSON.parse(await readFile(new URL('history.json', DIR), 'utf8')); } catch {}
let prev = {};
try { for (const p of JSON.parse(await readFile(new URL('summary.json', DIR), 'utf8')).profs) prev[p.key] = p; } catch {}
const dow = new Date(day + 'T12:00:00Z').getUTCDay(); // city counts: 1/7 of the jobs each day, so each job weekly
const histRow = { day };
let failed = 0;

for (const [i, p] of PROFS.entries()) {
  try {
    const first = await ba({ was: p.was, wo: 'Deutschland', size: '100', page: '1' });
    await sleep(PAUSE);
    const total = first.maxErgebnisse || 0;
    let list = first.ergebnisliste || [];
    if (total > 100 && PER_PROF > 100) { const p2 = await ba({ was: p.was, wo: 'Deutschland', size: '100', page: '2' }); list = list.concat(p2.ergebnisliste || []); await sleep(PAUSE); }
    let cities = prev[p.key] && prev[p.key].cities;
    if (!cities || !Object.keys(cities).length || i % 7 === dow || process.env.CITIES === '1') {
      cities = {};
      for (const c of CITIES) {
        const j = await ba({ was: p.was, wo: c, umkreis: '25', size: '1' });
        cities[c] = j.maxErgebnisse || 0;
        await sleep(PAUSE);
      }
    }
    const rows = [];
    const seen = new Set();
    for (const a of list) {
      const ref = a.referenznummer;
      if (!ref || seen.has(ref)) continue;
      seen.add(ref);
      const loc = (a.stellenlokationen || [])[0] || {}, adr = loc.adresse || {};
      if (adr.land && adr.land !== 'DEUTSCHLAND') continue;
      rows.push({
        ref, title: a.stellenangebotsTitel || '', employer: a.firma || '', city: adr.ort || '', plz: adr.plz || '',
        region: adr.region || '', lat: loc.breite != null ? +(+loc.breite).toFixed(3) : null, lon: loc.laenge != null ? +(+loc.laenge).toFixed(3) : null, url: a.externeURL || DETAIL + encodeURIComponent(ref),
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
  } catch (e) {
    // keep yesterday's data for this job so the page never goes empty
    failed++;
    console.log('FAILED', p.key, e.message);
    if (prev[p.key]) { summary.profs.push({ ...prev[p.key], fa: p.fa, g: p.g, stale: true }); histRow[p.key] = prev[p.key].total; }
  }
}
if (failed > PROFS.length / 2) { console.log('too many failures (' + failed + '), keeping previous summary'); process.exit(1); }
history = history.filter(h => h.day !== day);
history.push(histRow);
await writeFile(new URL('history.json', DIR), JSON.stringify(history.slice(-730), null, 0) + '\n');
summary.history = history.slice(-180);
await writeFile(new URL('summary.json', DIR), JSON.stringify(summary, null, 1) + '\n');
console.log('ok jobs', day, failed ? '(' + failed + ' failed)' : '');
if (failed) process.exitCode = 1; // makes the GitHub run red so the owner gets an e-mail
