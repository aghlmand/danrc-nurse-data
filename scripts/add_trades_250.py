"""One-off: append 100 Ausbildung trades (150 -> 250) to ausbildung-berufe.json (2026-11-25).
Usage: python scripts/add_trades_250.py <path to collected aus-berufe.json>"""
import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')
SRC = sys.argv[1]
N = [
("Baustoffprüfer/in","آزمایشگر مصالح ساختمانی","build",3,"dual"),
("Trockenbaumonteur/in","کناف‌کاری و دیوار خشک","build",3,"dual"),
("Rohrleitungsbauer/in","لوله‌گذاری شبکه‌های شهری","build",3,"dual"),
("Glaser/in - Fenster- und Glasfassadenbau","شیشه‌بری و نمای شیشه‌ای","build",3,"dual"),
("Bautechnische/r Konstrukteur/in - Ingenieurbau","نقشه‌کشی فنی سازه","build",3,"dual"),
("Straßenwärter/in","راهداری و نگهداری جاده","build",3,"dual"),
("Bautechnische/r Konstrukteur/in - Tief-, Verkehrswege- und Landschaftsbau","نقشه‌کشی فنی راه و ابنیه","build",3,"dual"),
("Rollladen- und Sonnenschutzmechatroniker/in","نصب کرکره و سایبان","build",3,"dual"),
("Kanalbauer/in","کانال‌کشی و فاضلاب شهری","build",3,"dual"),
("Hochbaufacharbeiter/in (ohne Angabe des Schwerpunkts)","کارگر فنی ساختمان","build",2,"dual"),
("Glaser/in - Verglasung und Glasbau","شیشه‌کاری ساختمان","build",3,"dual"),
("Bautechnische/r Konstrukteur/in - Architektur","نقشه‌کشی فنی معماری","build",3,"dual"),
("Hochbaufacharbeiter/in - Maurerarbeiten","کارگر فنی بنایی","build",2,"dual"),
("Bauzeichner/in","نقشه‌کشی ساختمان","build",3,"dual"),
("Betonfertigteilbauer/in","ساخت قطعات پیش‌ساخته‌ی بتنی","build",3,"dual"),
("Wärme-, Kälte- und Schallschutzisolierer/in","عایق‌کاری حرارتی و صوتی","build",3,"dual"),
("Schornsteinfeger/in","دودکش‌بانی و بازرسی گرمایش","build",3,"dual"),
("Wasserbauer/in","سازه‌های آبی","build",3,"dual"),
("Brunnenbauer/in","حفر و ساخت چاه","build",3,"dual"),
("Estrichleger/in","کف‌سازی (اِشتریش)","build",3,"dual"),
("Geomatiker/in","ژئوماتیک و نقشه‌برداری","build",3,"dual"),
("Maler/in und Lackierer/in - Ausbautechnik und Oberflächengestaltung","نقاشی ساختمان و تزئینات داخلی","build",3,"dual"),
("Umwelttechnologe/-technologin - Rohrleitungsnetze und Industrieanlagen","شبکه‌ی لوله و تأسیسات صنعتی","build",3,"dual"),
("Umwelttechnologe/-technologin - Wasserversorgung","تأمین و توزیع آب","build",3,"dual"),
("Holzmechaniker/in - Herstellen von Möbeln und Innenausbauteilen","ساخت صنعتی مبلمان","metal",3,"dual"),
("Werkstoffprüfer/in - Metalltechnik","آزمایش مواد فلزی","metal",3.5,"dual"),
("Produktionsfachkraft Chemie","تولید صنایع شیمیایی","metal",2,"dual"),
("Fertigungsmechaniker/in","مکانیک خط تولید","metal",3,"dual"),
("Medientechnologe/-technologin Druckverarbeitung","صحافی و تکمیل چاپ","metal",3,"dual"),
("Schilder- und Lichtreklamehersteller/in","تابلوسازی و تبلیغات نوری","metal",3,"dual"),
("Flachglastechnologe/-technologin","فناوری شیشه‌ی تخت","metal",3,"dual"),
("Papiertechnologe/-technologin","فناوری کاغذ","metal",3,"dual"),
("Maschinen- und Anlagenführer/in - Textiltechnik","اپراتور ماشین‌های نساجی","metal",2,"dual"),
("Produktionsmechaniker/in - Textil","مکانیک تولید نساجی","metal",3,"dual"),
("Pharmakant/in","تولید صنعتی دارو","metal",3.5,"dual"),
("Produktionstechnologe/-technologin","فناوری تولید","metal",3,"dual"),
("Holzmechaniker/in - Herstellen von Bauelementen, Holzpackmitteln und Rahmen","ساخت قطعات و قاب چوبی","metal",3,"dual"),
("Verfahrenstechnologe/-technologin Metall - Stahlumformung","فرم‌دهی فولاد","metal",3.5,"dual"),
("Technische/r Konfektionär/in","دوخت فنی و صنعتی","metal",3,"dual"),
("Medientechnologe/-technologin Siebdruck","چاپ سیلک","metal",3,"dual"),
("Metallbauer/in - Nutzfahrzeugbau","ساخت بدنه‌ی خودروی تجاری","metal",3.5,"dual"),
("Technische/r Modellbauer/in - Gießerei","مدل‌سازی ریخته‌گری","metal",3.5,"dual"),
("Stanz- und Umformmechaniker/in","پرس‌کاری و فرم‌دهی فلز","metal",3,"dual"),
("Verfahrensmechaniker/in - Steine- und Erdenindustrie - Baustoffe","تولید مصالح ساختمانی","metal",3,"dual"),
("Behälter- und Apparatebauer/in","ساخت مخزن و دستگاه صنعتی","metal",3.5,"dual"),
("Biologielaborant/in","آزمایشگاه زیست‌شناسی","metal",3.5,"dual"),
("Polsterer/Polsterin","رویه‌کوبی مبل","metal",3,"dual"),
("Kraftfahrzeugmechatroniker/in - Karosserietechnik","مکاترونیک خودرو (بدنه)","elec",3.5,"dual"),
("Elektroniker/in - Automatisierungs- und Systemtechnik","الکترونیک اتوماسیون","elec",3.5,"dual"),
("Elektroniker/in - Maschinen und Antriebstechnik (HwO)","الکترونیک ماشین و موتور (کارگاهی)","elec",3.5,"dual"),
("Industrieelektriker/in - Geräte und Systeme","برق صنعتی (دستگاه‌ها)","elec",2,"dual"),
("Elektroniker/in - Gebäudesystemintegration","الکترونیک ساختمان هوشمند","elec",3.5,"dual"),
("Elektroniker/in - Maschinen und Antriebstechnik (BBiG)","الکترونیک ماشین و موتور (صنعتی)","elec",3.5,"dual"),
("Elektroanlagenmonteur/in","نصب تأسیسات برقی","elec",3,"dual"),
("Elektroniker/in - Gebäude- und Infrastruktursysteme","الکترونیک ساختمان و زیرساخت","elec",3.5,"dual"),
("Elektroniker/in - Informations- und Systemtechnik","الکترونیک سیستم‌های اطلاعاتی","elec",3.5,"dual"),
("Zweiradmechatroniker/in - Motorradtechnik","مکاترونیک موتورسیکلت","elec",3.5,"dual"),
("Mikrotechnologe/-technologin","میکروفناوری","elec",3,"dual"),
("Fluggerätmechaniker/in - Instandhaltungstechnik","تعمیر و نگهداری هواپیما","elec",3.5,"dual"),
("Fachinformatiker/in - Digitale Vernetzung","فناوری اطلاعات (شبکه‌های دیجیتال)","it",3,"it"),
("Mathematisch-technische/r Softwareentwickler/in","برنامه‌نویسی ریاضی-فنی","it",3,"it"),
("Mediengestalter/in Digital und Print - Printmedien","طراحی گرافیک (چاپ)","it",3,"dual"),
("Mediengestalter/in Digital und Print - Digitalmedien","طراحی گرافیک (دیجیتال)","it",3,"dual"),
("Mediengestalter/in - Bild und Ton","تولید تصویر و صدا","it",3,"dual"),
("Assistent/in - Informatik (Wirtschaftsinformatik)","دستیار انفورماتیک اقتصادی","it",2,"school"),
("Orthopädietechnik-Mechaniker/in","ارتوپدی فنی","health",3.5,"dual"),
("Notfallsanitäter/in","امدادگر اورژانس","health",3,"care"),
("Physiotherapeut/in (Ausbildung)","فیزیوتراپی","health",3,"school"),
("Medizinische/r Technologe/Technologin - Laboratoriumsanalytik","علوم آزمایشگاهی پزشکی","health",3,"care"),
("Ergotherapeut/in (Ausbildung)","کاردرمانی","health",3,"school"),
("Heilerziehungspflegeassistent/in","دستیار مراقبت از افراد دارای معلولیت","health",2,"school"),
("Logopäde/Logopädin (Ausbildung)","گفتاردرمانی","health",3,"school"),
("Pharmazeutisch-technische/r Assistent/in","دستیار فنی داروخانه (PTA)","health",2.5,"school"),
("Sozialpädagogische/r Assistent/in / Kinderpfleger/in","دستیار مربی کودک","service",2,"school"),
("Sozialassistent/in","دستیار امور اجتماعی","service",2,"school"),
("Kaufmann/-frau - Versicherungen und Finanzen - Versicherung","بیمه و خدمات مالی","office",3,"dual"),
("Medienkaufmann/-frau Digital und Print","بازرگانی رسانه","office",3,"dual"),
("Pharmazeutisch-kaufmännische/r Angestellte/r","کارمند بازرگانی داروخانه","sales",3,"dual"),
("Gestalter/in - visuelles Marketing","ویترین‌آرایی و بازاریابی تصویری","sales",3,"dual"),
("Fachverkäufer/in - Lebensmittelhandwerk (Konditorei)","فروشندگی قنادی","sales",3,"dual"),
("Milchtechnologe/-technologin","فناوری لبنیات","food",3,"dual"),
("Verfahrenstechnologe/-technologin - Mühlen- und Getreidewirtschaft - Müllerei","آسیابانی و فرآوری غلات","food",3,"dual"),
("Süßwarentechnologe/-technologin","تولید صنعتی شیرینی و شکلات","food",3,"dual"),
("Kaufmann/-frau - Hotelmanagement","مدیریت هتل","food",3,"dual"),
("Fachkraft - Gastronomie (Restaurantservice)","خدمات رستوران (دوساله)","food",2,"dual"),
("Fachkraft - Fahrbetrieb","رانندگی حمل‌ونقل عمومی","trans",3,"drive"),
("Kaufmann/-frau - Mobilität und Verkehrsservice","خدمات مسافری و حمل‌ونقل","trans",3,"dual"),
("Fachkraft - Hafenlogistik","لجستیک بندر","trans",3,"dual"),
("Servicefahrer/in","رانندگی خدماتی","trans",2,"drive"),
("Fachkraft - Schutz und Sicherheit","امنیت و حفاظت","service",3,"dual"),
("Tierwirt/in - Rinderhaltung","دامپروری (گاو)","service",3,"dual"),
("Gärtner/in - Zierpflanzenbau","پرورش گل و گیاه زینتی","service",3,"dual"),
("Gärtner/in - Baumschule","نهالستان و پرورش درخت","service",3,"dual"),
("Fachkraft - Agrarservice","خدمات ماشین‌آلات کشاورزی","service",3,"dual"),
("Forstwirt/in","جنگلداری","service",3,"dual"),
("Textilreiniger/in","خشکشویی صنعتی","service",3,"dual"),
("Pferdewirt/in - Pferdehaltung und Service","پرورش و نگهداری اسب","service",3,"dual"),
("Kosmetiker/in (duale Ausbildung)","آرایش و زیبایی (کاسمتیک)","service",3,"dual"),
("Tierpfleger/in - Forschung und Klinik","مراقبت از حیوانات (آزمایشگاه و کلینیک)","service",3,"dual"),
("Umwelttechnologe/-technologin - Kreislauf- und Abfallwirtschaft","مدیریت پسماند و بازیافت","service",3,"dual"),
]
print('count', len(N))
src = {x['b'] for x in json.load(open(SRC, encoding='utf-8'))}
P = 'scripts/ausbildung-berufe.json'
B = json.load(open(P, encoding='utf-8'))
have = {b['beruf'] for b in B}; keys = {b['key'] for b in B}
bad = [n[0] for n in N if n[0] not in src]; dup = [n[0] for n in N if n[0] in have]
assert not bad, bad
assert not dup, dup
assert len({n[0] for n in N}) == len(N)
def slug(s):
    for a, b in [('ä','ae'),('ö','oe'),('ü','ue'),('ß','ss'),('Ä','ae'),('Ö','oe'),('Ü','ue')]: s = s.replace(a, b)
    s = re.sub(r'\(.*?\)', '', s)
    s = re.sub(r'/-?[A-Za-z]+', '', s)
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-')
    return s[:48].strip('-')
for b, fa, g, d, t in N:
    k = slug(b); base = k; i = 2
    while k in keys: k = base + '-' + str(i); i += 1
    keys.add(k); B.append(dict(key=k, beruf=b, fa=fa, g=g, d=d, t=t))
json.dump(B, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('total', len(B)); print([x['key'] for x in B[-100:]])
