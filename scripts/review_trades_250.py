"""One-off (2026-11-25): remove trades that are not open or not realistic for applicants from Iran/abroad,
replace them with suitable official BA trades, keep the list at 250.
Usage: python scripts/review_trades_250.py <collected aus-berufe.json>"""
import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')
SRC = sys.argv[1]
REMOVE = {
    # aviation / semiconductor: export-control & EU Iran sanctions screening; employers do not take Iranian nationals
    'Fluggerätmechaniker/in - Instandhaltungstechnik', 'Mikrotechnologe/-technologin',
    # security / port: §34a GewO or ISPS reliability checks
    'Fachkraft - Schutz und Sicherheit', 'Fachkraft - Hafenlogistik',
    # school-based, unpaid, need a German school certificate or near-native German; little value for applicants abroad
    'Sozialassistent/in', 'Sozialpädagogische/r Assistent/in / Kinderpfleger/in', 'Assistent/in - Informatik (Wirtschaftsinformatik)',
    'Logopäde/Logopädin (Ausbildung)', 'Pharmazeutisch-technische/r Assistent/in', 'Heilerziehungspflegeassistent/in',
    # needs an EU driving licence before the start; federal waterways authority
    'Servicefahrer/in', 'Wasserbauer/in',
    # existing: public administration / social insurance / Federal Employment Agency trainee posts (selection inside Germany)
    'Verwaltungsfachangestellte/r - Kommunalverwaltung', 'Sozialversicherungsfachangestellte/r - allgemeine Krankenversicherung',
    'Fachangestellte/r - Arbeitsmarktdienstleistungen',
}
ADD = [
("Kanalbauer/in - Infrastrukturtechnik","کانال‌کشی زیرساخت شهری","build",3,"dual"),
("Tiefbaufacharbeiter/in - Leitungsbauarbeiten für Infrastrukturtechnik","کارگر فنی خطوط زیرساخت","build",2,"dual"),
("Milchwirtschaftliche/r Laborant/in","آزمایشگاه لبنیات","food",3,"dual"),
("Hochbaufacharbeiter/in - Beton- und Stahlbetonarbeiten","کارگر فنی بتن‌ریزی","build",2,"dual"),
("Ofen- und Luftheizungsbauer/in","ساخت بخاری و گرمایش هوا","build",3,"dual"),
("Aufbereitungsmechaniker/in - Naturstein","فرآوری سنگ","metal",3,"dual"),
("Verfahrensmechaniker/in - Glastechnik","تولید صنعتی شیشه","metal",3,"dual"),
("Lacklaborant/in","آزمایشگاه رنگ و لاک","metal",3.5,"dual"),
("Spezialtiefbauer/in","حفاری و پی‌سازی ویژه","build",3,"dual"),
("Tiefbaufacharbeiter/in - Rohrleitungsbauarbeiten","کارگر فنی لوله‌گذاری","build",2,"dual"),
("Feinoptiker/in","اپتیک دقیق","metal",3,"dual"),
("Mechaniker/in - Reifen- und Vulkanisationstechnik - Vulkanisationstechnik","لاستیک و ولکانیزه","metal",3,"dual"),
("Naturwerksteinmechaniker/in - Maschinenbearbeitungstechnik","سنگ‌بری ماشینی","metal",3,"dual"),
("Textillaborant/in","آزمایشگاه نساجی","metal",3,"dual"),
("Fachkraft - Metalltechnik - Umform- und Drahttechnik","فلزکاری: فرم‌دهی و سیم (دوساله)","metal",2,"dual"),
]
src = {x['b'] for x in json.load(open(SRC, encoding='utf-8'))}
P = 'scripts/ausbildung-berufe.json'
B = json.load(open(P, encoding='utf-8'))
have = {b['beruf'] for b in B}
miss = REMOVE - have; assert not miss, miss
assert len(REMOVE) == len(ADD)
for a in ADD: assert a[0] in src and a[0] not in have, a[0]
B = [b for b in B if b['beruf'] not in REMOVE]
keys = {b['key'] for b in B}
def slug(s):
    for a, b in [('ä','ae'),('ö','oe'),('ü','ue'),('ß','ss')]: s = s.replace(a, b)
    s = re.sub(r'\(.*?\)', '', s); s = re.sub(r'/-?[A-Za-z]+', '', s)
    return re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-')[:48].strip('-')
for b, fa, g, d, t in ADD:
    k = slug(b); base = k; i = 2
    while k in keys: k = base + '-' + str(i); i += 1
    keys.add(k); B.append(dict(key=k, beruf=b, fa=fa, g=g, d=d, t=t))
assert len(B) == 250 and len(keys) == 250
json.dump(B, open(P, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=0)
print('ok', len(B), [b['key'] for b in B[-15:]])
