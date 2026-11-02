#!/usr/bin/env python3
"""Builds the 1000-character ledger for THOUSAND BLACK STAR.

Reads the 120 hand-written principals from 02-character-bible-principals.md,
generates 880 supporting characters (deterministic seed), assigns Register
numbers 0001-1000, and writes 03-ledger-1000.csv and 03-ledger-1000.md.

Reserved Register numbers: 0001 Edmund Ashby, 0713 Fayaz Rahman,
0714 Ermis Larasati, 1000 Seraphine Wyndham-Rao.
"""
import csv
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED = 1000
random.seed(SEED)

# --- name pools: key -> (male first, female first, surnames, cities) ---------
P = {
 "PT": (["João","Miguel","Rui","Duarte","Nuno","Hugo"],["Marta","Sofia","Beatriz","Catarina","Leonor","Rita"],["Silva","Pereira","Costa","Ferreira","Almeida","Rocha","Teixeira"],["Lisbon","Porto","Sintra"]),
 "GH": (["Kojo","Yaw","Kwabena","Nii","Kweku","Fiifi"],["Akosua","Efua","Adwoa","Ama","Araba","Naa"],["Asante","Boateng","Quaye","Darko","Ofori","Tetteh","Addo"],["Accra","Kumasi","Tema"]),
 "JP": (["Haruto","Sora","Ren","Daichi","Yuto","Shun"],["Aoi","Hina","Rin","Sakura","Miyu","Nanami"],["Takahashi","Kobayashi","Yamamoto","Ito","Kato","Hayashi","Shimizu"],["Osaka","Kyoto","Kobe","Sapporo"]),
 "RU": (["Alexei","Sergei","Pavel","Igor","Yuri","Oleg"],["Olga","Tatiana","Natalia","Irina","Svetlana","Vera"],["Smirnov","Kuznetsov","Popov","Morozov","Lebedev","Orlov","Fedorov"],["St Petersburg","Pushkin","Kronstadt"]),
 "MX": (["Diego","Javier","Alejandro","Emilio","Santiago","Ignacio"],["Lupita","Ximena","Paloma","Renata","Itzel","Marisol"],["Hernández","García","Martínez","López","Vargas","Morales","Salazar"],["Mexico City","Coyoacán","Xochimilco"]),
 "EG": (["Karim","Tarek","Mahmoud","Sherif","Khaled","Amr"],["Nour","Dina","Heba","Rania","Mona","Salwa"],["Hassan","Ibrahim","Fouad","Nasser","Sabry","Mourad","Shaker"],["Cairo","Giza","Alexandria"]),
 "NO": (["Henrik","Magnus","Olav","Tor","Espen","Kristian"],["Ingeborg","Solveig","Astri","Marit","Thea","Ragnhild"],["Hansen","Johansen","Berg","Larsen","Dahl","Lund","Strand"],["Bergen","Stavanger","Ålesund"]),
 "IN-S": (["Anand","Sreenath","Gopal","Hari","Rajesh","Vishnu"],["Lakshmi","Anjali","Divya","Remya","Sreeja","Kavya"],["Pillai","Varma","Nambiar","Kurup","Thomas","Iyer","Panicker"],["Kochi","Alappuzha","Kozhikode"]),
 "BR": (["Pedro","Rodrigo","Thiago","Gustavo","Leandro","Fábio"],["Juliana","Fernanda","Larissa","Aline","Marcela","Tatiane"],["Souza","Oliveira","Santos","Rocha","Barbosa","Ribeiro","Cardoso"],["São Paulo","Santos","Campinas"]),
 "NG": (["Chinedu","Tunde","Obinna","Segun","Ikenna","Dayo"],["Ngozi","Bisi","Amaka","Yetunde","Ifeoma","Kemi"],["Adebayo","Nwosu","Ogunleye","Eze","Bello","Obi","Afolabi"],["Lagos","Ibadan","Abuja","Enugu"]),
 "NG-H": (["Musa","Ibrahim","Abubakar","Sani","Aminu","Bashir"],["Zainab","Aisha","Halima","Maryam","Rabi","Fati"],["Danjuma","Bello","Suleiman","Lawal","Garba","Mohammed","Yakubu"],["Kano","Kaduna","Zaria"]),
 "FR": (["Mathieu","Julien","Antoine","Étienne","Rémi","Baptiste"],["Élodie","Claire","Sylvie","Manon","Océane","Colette"],["Moreau","Girard","Lefèvre","Fontaine","Roux","Clément","Vidal"],["Lyon","Marseille","Villeurbanne"]),
 "PL": (["Marek","Tomasz","Piotr","Wojciech","Krzysztof","Michał"],["Agnieszka","Magdalena","Ewa","Katarzyna","Halina","Joanna"],["Wiśniewski","Wójcik","Zieliński","Lewandowski","Mazur","Krawczyk","Pawlak"],["Kraków","Wrocław","Zakopane"]),
 "TR": (["Mehmet","Emre","Burak","Kerem","Cem","Selim"],["Ayşe","Zeynep","Merve","Selin","Deniz","Gül"],["Demir","Şahin","Çelik","Aydın","Arslan","Koç","Aksoy"],["Istanbul","Üsküdar","Kadıköy"]),
 "IN-N": (["Rohit","Sanjay","Deepak","Manish","Amit","Pankaj"],["Neha","Kavita","Anita","Pooja","Rekha","Shweta"],["Singh","Gupta","Mehra","Joshi","Bansal","Khanna","Tiwari"],["Jaipur","Delhi","Agra","Lucknow"]),
 "IE": (["Seán","Cian","Colm","Declan","Fergal","Niall"],["Siobhán","Niamh","Roisin","Grainne","Maeve","Sinéad"],["Murphy","Kelly","Byrne","Doyle","Ryan","Walsh","Quinn"],["Galway","Salthill","Spiddal"]),
 "KR": (["Min-jun","Seo-jun","Hyun-woo","Joon-ho","Tae-yang","Sung-min"],["Ha-eun","Seo-yeon","Min-seo","Ji-ah","Soo-bin","Yu-na"],["Kim","Lee","Park","Choi","Jung","Kang","Yoon"],["Seoul","Incheon","Suwon"]),
 "ET": (["Dawit","Abel","Yonas","Henok","Tewodros","Mulugeta"],["Hanna","Meron","Tigist","Rahel","Selamawit","Bethlehem"],["Alemu","Haile","Girma","Mekonnen","Tadesse","Assefa","Worku"],["Addis Ababa","Adama","Bahir Dar"]),
 "IT": (["Luca","Matteo","Giorgio","Paolo","Enzo","Stefano"],["Francesca","Elena","Lucia","Silvia","Anna","Paola"],["Conti","Ricci","Bruno","Gallo","Costa","Fontana","Marino"],["Verona","Naples","Mantua","Salerno"]),
 "PK": (["Bilal","Faisal","Imran","Zubair","Adnan","Waqar"],["Ayesha","Hira","Nida","Sadia","Rabia","Mehwish"],["Khan","Siddiqui","Malik","Raza","Baig","Chaudhry","Shah"],["Karachi","Lahore","Hyderabad"]),
 "BG": (["Georgi","Ivan","Stefan","Boris","Plamen","Kiril"],["Maria","Desislava","Radka","Tsvetana","Yana","Vesela"],["Petrov","Dimitrov","Todorov","Kolev","Marinov","Iliev","Angelov"],["Sofia","Plovdiv","Varna"]),
 "ZA": (["Sipho","Lwazi","Mandla","Bongani","Tshepo","Jabu"],["Thandi","Lindiwe","Zanele","Nomsa","Palesa","Ayanda"],["Nkosi","Mokoena","Zulu","Sithole","Ndlovu","Maseko","Radebe"],["Johannesburg","Soweto","Pretoria"]),
 "AR": (["Facundo","Lautaro","Nicolás","Gonzalo","Federico","Ramiro"],["Camila","Florencia","Agustina","Lucrecia","Milagros","Julieta"],["Gómez","Díaz","Sosa","Romero","Acosta","Benítez","Medina"],["Buenos Aires","La Boca","Rosario"]),
 "GR": (["Nikos","Yannis","Stavros","Manolis","Kostas","Dimitris"],["Katerina","Eleftheria","Sophia","Despina","Maria","Anastasia"],["Georgiou","Nikolaidis","Kalogeropoulos","Vasilakis","Markakis","Stefanakis","Mavros"],["Heraklion","Chania","Rethymno"]),
 "RO": (["Mihai","Vlad","Cătălin","Radu","Bogdan","Ionuț"],["Elena","Alina","Roxana","Mirela","Carmen","Simona"],["Ionescu","Radu","Stanciu","Munteanu","Constantin","Moldovan","Dinu"],["Bucharest","Cluj","Sibiu"]),
 "IQ": (["Ali","Hussein","Ahmed","Zaid","Haider","Omar"],["Zainab","Shaimaa","Rana","Huda","Sara","Iman"],["Al-Tamimi","Al-Obaidi","Al-Jubouri","Al-Hashimi","Al-Saadi","Al-Rubaie","Jabbar"],["Baghdad","Basra","Mosul"]),
 "AT": (["Lukas","Florian","Stefan","Matthias","Georg","Anton"],["Katharina","Johanna","Theresa","Elisabeth","Lena","Hanna"],["Gruber","Bauer","Wagner","Pichler","Steiner","Moser","Hofer"],["Vienna","Salzburg","Graz"]),
 "KE": (["Brian","Kevin","Mwangi","Juma","Kiprono","Njoroge"],["Mercy","Faith","Akinyi","Njeri","Atieno","Wambui"],["Otieno","Kariuki","Mutua","Ochieng","Kiplagat","Wafula","Njenga"],["Kisumu","Nairobi","Mombasa"]),
 "BD": (["Tanvir","Rafiq","Shakil","Masud","Imran","Nayeem"],["Farzana","Rumana","Sabina","Tahmina","Nasrin","Shirin"],["Hossain","Islam","Ahmed","Khan","Sarker","Mia","Talukdar"],["Dhaka","Chittagong","Sylhet","Narayanganj"]),
 "ID": (["Budi","Agus","Rizky","Hendra","Dimas","Bayu"],["Sari","Wulan","Ayu","Rina","Putri","Intan"],["Santoso","Wijaya","Pratama","Susanto","Kusuma","Hidayat","Saputra"],["Yogyakarta","Surabaya","Jakarta","Solo"]),
 "GULF": (["Khalid","Rashid","Saeed","Majid","Salim","Hamdan"],["Fatma","Mariam","Aisha","Noura","Latifa","Shaikha"],["Al-Mazrouei","Al-Balushi","Al-Hinai","Al-Suwaidi","Al-Maktoum","Al-Habsi","Al-Harthy"],["Dubai","Muscat","Sharjah"]),
 "PH": (["Jun","Ramon","Noel","Rey","Joel","Ariel"],["Ate","Cristina","Lorna","Grace","Mylene","Joy"],["Reyes","Bautista","Ocampo","Garcia","Mendoza","Aquino","Navarro"],["Manila","Quezon City","Cebu"]),
 "CZ": (["Jan","Tomáš","Martin","Ondřej","Jiří","Vojtěch"],["Eva","Jana","Petra","Lenka","Markéta","Tereza"],["Dvořák","Černý","Procházka","Kučera","Veselý","Horák","Němec"],["Prague","Brno","Plzeň"]),
 "LK": (["Kasun","Nuwan","Chaminda","Ruwan","Dilshan","Sampath"],["Chamari","Iresha","Kumari","Shanika","Dilani","Anusha"],["Silva","Jayasuriya","Wickramasinghe","Gunawardena","Rajapaksa","Senanayake","Abeywardena"],["Colombo","Galle","Kandy"]),
 "CO": (["Juan","Camilo","Andrés","Julián","Mauricio","Esteban"],["Paola","Natalia","Catalina","Viviana","Luisa","Mariana"],["Gómez","Rojas","Castro","Ramírez","Ortiz","Vélez","Zapata"],["Bogotá","Medellín","Cali"]),
 "SD": (["Mohamed","Yasir","Ammar","Abdelrahman","Hatim","Osman"],["Ibtisam","Samah","Wafa","Hiba","Nahid","Rawan"],["Ahmed","Elhassan","Babiker","Mahdi","Taha","Osman","Khalifa"],["Cairo","Khartoum","Omdurman"]),
 "GB": (["Oliver","Jack","Thomas","George","Callum","Harvey"],["Amelia","Grace","Hannah","Megan","Lucy","Ruth"],["Taylor","Brown","Wilson","Evans","Hughes","Clarke","Lowe"],["Manchester","Salford","Liverpool"]),
 "MA": (["Hamid","Abdelilah","Rachid","Mehdi","Anouar","Soufiane"],["Fatima","Khadija","Ilham","Zineb","Hafsa","Nadia"],["El Amrani","Bennani","Alaoui","Tazi","Chraibi","Lahlou","Berrada"],["Casablanca","Marrakech","Fez","Rabat"]),
 "HR": (["Marko","Ante","Luka","Josip","Tomislav","Ivo"],["Ana","Petra","Nikolina","Mirjana","Katarina","Dora"],["Babić","Marić","Jurić","Perić","Matić","Vuković","Kralj"],["Split","Zagreb","Hvar"]),
 "MN": (["Bat","Temuulen","Ganbold","Tuvshin","Erdene","Naran"],["Saran","Nomin","Altan","Solongo","Tsetseg","Munkhzul"],["Bold","Batbayar","Dorj","Gankhuyag","Enkhbat","Sukhbaatar","Tserendorj"],["Ulaanbaatar","Darkhan","Erdenet"]),
 "ZM": (["Chanda","Mwila","Kelvin","Bwalya","Mulenga","Moses"],["Mutinta","Natasha","Chipo","Thandiwe","Loveness","Memory"],["Phiri","Mwansa","Zulu","Mumba","Lungu","Chileshe","Mbewe"],["Lusaka","Ndola","Kitwe"]),
 "VN": (["Hoàng","Tuấn","Dũng","Hải","Long","Nam"],["Lan","Mai","Thảo","Hương","Linh","Ngọc"],["Nguyễn","Trần","Lê","Phạm","Đặng","Vũ","Bùi"],["Hanoi","Huế","Hoi An","Da Nang"]),
 "SE": (["Anders","Fredrik","Mattias","Oskar","Johan","Gustav"],["Maja","Elin","Frida","Sofia","Linnea","Karin"],["Andersson","Karlsson","Nilsson","Eriksson","Svensson","Pettersson","Holm"],["Stockholm","Gothenburg","Uppsala"]),
 "IR": (["Reza","Hossein","Mehdi","Saeed","Babak","Farhad"],["Shirin","Leila","Mahsa","Nazanin","Azadeh","Zahra"],["Ahmadi","Hosseini","Moradi","Sadeghi","Jafari","Rahimi","Najafi"],["Isfahan","Shiraz","Yazd"]),
 "CU": (["Yoel","Raúl","Osvaldo","Armando","Ernesto","Lázaro"],["Yamila","Mercedes","Odalys","Dailén","Mireya","Alina"],["Pérez","Rodríguez","González","Fernández","Delgado","Cabrera","Rivero"],["Havana","Santiago de Cuba","Trinidad"]),
 "US": (["Mike","Tom","Dan","Kevin","Sean","Jim"],["Kelly","Megan","Laura","Dana","Beth","Colleen"],["Sullivan","Kennedy","Donnelly","Flynn","Hayes","Brooks","Murray"],["Boston","Quincy","Somerville"]),
 "EE": (["Jaan","Toomas","Priit","Andres","Marten","Kaspar"],["Liis","Kadri","Mari","Triin","Anu","Helena"],["Tamm","Saar","Mägi","Kask","Kukk","Rebane","Pärn"],["Tallinn","Tartu","Pärnu"]),
 "PE": (["Luis","Jorge","Renzo","César","Marco","Álvaro"],["Rosa","Milagros","Karina","Gladys","Pilar","Yesenia"],["Quispe","Flores","Huamán","Mendoza","Chávez","Ramos","Torres"],["Lima","Cusco","Arequipa"]),
 "CA-AF": (["Zahir","Farid","Najib","Sami","Wahid","Bashir"],["Mariam","Zarmina","Laila","Shabnam","Sima","Parwin"],["Ahmadi","Sultani","Rahimi","Amiri","Karimi","Nazari","Safi"],["Toronto","Mississauga","Scarborough"]),
 "GB-CW": (["Jory","Pascoe","Kit","Nick","Alan","Bill"],["Morwenna","Tamsin","Demelza","Loveday","Jenifer","Wenna"],["Trevithick","Penhale","Polglase","Tregenza","Nancarrow","Carne","Trelawny"],["Falmouth","Penzance","St Ives","Truro"]),
}
# story -> pool key
SP = {1:"PT",2:"GH",3:"JP",4:"RU",5:"MX",6:"EG",7:"NO",8:"IN-S",9:"BR",10:"NG",11:"FR",12:"PL",
13:"TR",14:"IN-N",15:"IE",16:"KR",17:"ET",18:"IT",19:"PK",20:"BG",21:"ZA",22:"AR",23:"NG-H",24:"GR",
25:"JP",26:"RO",27:"IQ",28:"AT",29:"KE",30:"BD",31:"IT",32:"GULF",33:"PH",34:"CZ",35:"LK",36:"CO",
37:"SD",38:"IN-N",39:"GB",40:"MA",41:"HR",42:"MN",43:"ZM",44:"VN",45:"SE",46:"GH",47:"IR",48:"FR",
49:"JP",50:"CU",51:"BD",52:"ID",53:"US",54:"EE",55:"NG",56:"NO",57:"PE",58:"CA-AF",59:"GB-CW",60:"GB"}
COUNTRY = {"PT":"Portugal","GH":"Ghana","JP":"Japan","RU":"Russia","MX":"Mexico","EG":"Egypt","NO":"Norway",
"IN-S":"India","BR":"Brazil","NG":"Nigeria","NG-H":"Nigeria","FR":"France","PL":"Poland","TR":"Türkiye","IN-N":"India",
"IE":"Ireland","KR":"South Korea","ET":"Ethiopia","IT":"Italy","PK":"Pakistan","BG":"Bulgaria","ZA":"South Africa",
"AR":"Argentina","GR":"Greece","RO":"Romania","IQ":"Iraq","AT":"Austria","KE":"Kenya","BD":"Bangladesh","ID":"Indonesia",
"GULF":"UAE/Oman","PH":"Philippines","CZ":"Czechia","LK":"Sri Lanka","CO":"Colombia","SD":"Sudan/Egypt","GB":"England",
"MA":"Morocco","HR":"Croatia","MN":"Mongolia","ZM":"Zambia","VN":"Vietnam","SE":"Sweden","IR":"Iran","CU":"Cuba",
"US":"USA","EE":"Estonia","PE":"Peru","CA-AF":"Canada","GB-CW":"England"}

ROLES = ["Parent of the man","Parent of the woman","Sibling of the man","Sibling of the woman","Best friend of the man",
 "Best friend of the woman","Rival","Mentor","Comic fool","Matchmaker and gossip","Employer or landlord","Former love",
 "Neighbour","Elder who keeps a secret","Young witness"]
ROLE_AGE = {"Parent of the man":(54,78),"Parent of the woman":(54,78),"Sibling of the man":(19,45),"Sibling of the woman":(19,45),
 "Best friend of the man":(24,45),"Best friend of the woman":(24,45),"Rival":(26,55),"Mentor":(48,75),"Comic fool":(22,60),
 "Matchmaker and gossip":(35,70),"Employer or landlord":(38,66),"Former love":(25,45),"Neighbour":(25,70),
 "Elder who keeps a secret":(66,89),"Young witness":(9,17)}
JOBS = ["Baker","Boat mender","Bus conductor","Butcher","Cab driver","Carpenter","Chef","Choir director","Clerk","Clockmender","Cobbler",
 "Dentist","Dockworker","Dressmaker","Electrician","Farmer","Ferry hand","Fishmonger","Florist","Goldsmith","Grocer","Hairdresser",
 "Historian","Hotelier","Innkeeper","Journalist","Judge","Kiosk owner","Lawyer","Librarian","Lifeguard","Locksmith","Mechanic","Midwife",
 "Musician","Newsagent","Nurse","Painter","Pharmacist","Photographer","Pilot","Plumber","Poet","Police officer","Potter","Community spiritual leader",
 "Professor","Radio technician","Retired teacher","Rickshaw puller","Sailor","Scribe","Shopkeeper","Singer","Stonemason","Street vendor",
 "Apprentice","Surgeon","Tailor","Tea seller","Teacher","Translator","Tour guide","Trader","Train guard","Umbrella maker","Vet","Waiter","Weaver","Welder","Writer"]
TRAITS = ["blunt","tender","superstitious","punctual","absent-minded","funny","severe","generous","suspicious","romantic","patient","vain",
 "devout","restless","gossipy","gentle","hot-tempered","shrewd","dreamy","fearless","anxious","hospitable","bookish","stubborn","wry","soft-spoken","theatrical","loyal"]
FLAWS = ["cannot apologise","gambles when afraid","tells lies for fun","never forgets an insult","hoards old letters","drinks too much tea at night",
 "meddles in other people's love","cannot keep time","hides behind jokes","trusts the wrong people","is proud to the point of ruin","fears the telephone",
 "talks over everyone","avoids the doctor","spends money that is not theirs","withholds praise","is jealous of the young","cannot say goodbye",
 "makes promises too fast","reads other people's post"]
UNSAID = [
 "I forgave you years ago and never said so.","I was proud of you and told you it was nothing.","I am afraid of being forgotten.","I still keep your first letter.",
 "I wish I had stayed.","I stayed when I should have gone.","I lied about where I was that night.","I am not as brave as I appear.",
 "I have never been to the sea and I am too ashamed to say it.","I think of you every time the kettle boils.","I am ill and I have told no one.",
 "I would give up my work if you asked.","I would give up my pride if you asked.","I blamed you for what was mine.","I was happy once and did not notice.",
 "I need help and cannot ask.","I loved your mother before you were born.","I left the door unlocked on purpose.","I have been writing you answers for years.",
 "I forgave my father too late.","I never learned to read well.","I am not a stranger to you; I am your daughter.","I am not a stranger to you; I am your son.",
 "I kept your photograph.","I dreamed of a different life and was ashamed of it.","I am waiting for a ship that will not come.","I took the blame for what you did.",
 "I miss the person I was before I met you.","I envy your freedom.","I was the one who sent the letter.","I wanted to be a singer.","I wanted to be a pilot.",
 "I am grateful, and I cannot say how much.","I will not live to see you married.","I cannot give you what you want.","I think you are wiser than I am.",
 "I am saving money to disappear.","I have never told you your mother's last words.","I know what you did and I love you anyway.","I cannot hear you, and I have not told you.",
 "I found your sealed letter and did not open it.","I opened your sealed letter and wish I had not.","I was too shy to ask for a dance.","I am proud to be your friend.",
 "I wanted you to win.","I did not want you to win.","I asked the stars about you.","I put your name in the prayer.","I walked past your door a hundred times.",
 "I am not sure I believe in love, but I believe in you.","I stopped writing because I thought you stopped reading.","I never thanked you for the bread.",
 "I wish I had told you at the station.","I am afraid the best days are behind me.","I let you go because I thought it was kind.","I should have said yes.",
 "I should have said no.","I remember the song you hummed.","I remember the exact day.","I will always be an hour behind you.","I cannot say it, so I wrote it.",
]

ROOT_DIR = ROOT
MD_IN = ROOT_DIR / "02-character-bible-principals.md"


def read_principals():
    rows = []
    for line in MD_IN.read_text(encoding="utf-8").splitlines():
        if not line.startswith("| S"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) != 7:
            sys.exit(f"bad principal row: {line[:60]}")
        pid, name, age, loc, job, voice, star = cells
        m = re.match(r"S(\d\d)([AB])", pid)
        story = int(m.group(1)); gender = "M" if m.group(2) == "A" else "F"
        city, _, country = loc.partition(", ")
        star = star.replace("*(Register 0713)*", "").replace("*(Register 0714)*", "").replace("(Register 0001)", "").replace("(Register 1000)", "").strip()
        rows.append(dict(id=pid, name=name, gender=gender, age=int(age), city=city, country=country, job=job,
                         story=story, role="Principal", traits=voice, flaw="", star=star.strip('"').strip()))
    return rows


def make_support(principals):
    used = {p["name"] for p in principals}
    out = []
    # 880 = 60*14 + 40: first 40 stories get 15, rest 14
    counts = {s: (15 if s <= 40 else 14) for s in range(1, 61)}
    # adjust to total 880
    total = sum(counts.values())
    while total > 880:
        counts[max(counts)] -= 1; total -= 1
    n = 0
    for s in range(1, 61):
        key = SP[s]
        mf, ff, sn, cities = P[key]
        roles = ROLES[:counts[s]]
        for r in roles:
            n += 1
            g = random.choice("MF")
            if r in ("Parent of the man", "Sibling of the man", "Best friend of the man"):
                pass
            for _try in range(50):
                first = random.choice(mf if g == "M" else ff)
                name = f"{first} {random.choice(sn)}"
                if name not in used:
                    break
            else:
                name = f"{first} {random.choice(sn)} {chr(65+n%26)}."
            used.add(name)
            lo, hi = ROLE_AGE[r]
            age = random.randint(lo, hi)
            job = "Schoolchild" if r == "Young witness" else random.choice(JOBS)
            if age >= 66 and job != "Schoolchild":
                job = "Retired " + job[0].lower() + job[1:]
            out.append(dict(id=f"B{n:03d}", name=name, gender=g, age=age, city=random.choice(cities),
                            country=COUNTRY[key], job=job, story=s, role=r,
                            traits=random.choice(TRAITS), flaw=random.choice(FLAWS), star=random.choice(UNSAID)))
    assert len(out) == 880, len(out)
    return out


def main():
    pr = read_principals()
    assert len(pr) == 120, len(pr)
    sup = make_support(pr)
    allc = pr + sup
    reserved = {"S60A": 1, "S30A": 713, "S30B": 714, "S60B": 1000}
    free = [i for i in range(1, 1001) if i not in reserved.values()]
    random.shuffle(free)
    it = iter(free)
    for c in allc:
        c["reg"] = reserved.get(c["id"]) or next(it)
    allc.sort(key=lambda c: c["reg"])
    assert [c["reg"] for c in allc] == list(range(1, 1001))
    assert len({c["name"] for c in allc}) == 1000, "duplicate names"
    fields = ["reg", "id", "name", "gender", "age", "city", "country", "job", "story", "role", "traits", "flaw", "star"]
    with open(ROOT_DIR / "03-ledger-1000.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields); w.writeheader()
        for c in allc: w.writerow(c)
    # markdown grouped by story
    by = {}
    for c in allc: by.setdefault(c["story"], []).append(c)
    lines = ["# The Register — All 1,000 Characters", "",
             "Grouped by love story. Register numbers are the order in which the confessions arrived. "
             "`S##A/B` are principals, `B###` are supporting characters. Generated by `tools/gen_ledger.py`; "
             "supporting entries are first-draft seeds to be deepened while drafting each chapter.", ""]
    for s in sorted(by):
        lines += [f"## Story S{s:02d}", "", "| Reg | ID | Name | G | Age | Place | Role | Occupation | Manner / flaw | Unsaid |", "|---|---|---|---|---|---|---|---|---|---|"]
        for c in sorted(by[s], key=lambda x: (x["role"] != "Principal", x["reg"])):
            mf = c["traits"] if not c["flaw"] else f'{c["traits"]}; {c["flaw"]}'
            lines.append(f'| {c["reg"]:04d} | {c["id"]} | {c["name"]} | {c["gender"]} | {c["age"]} | {c["city"]}, {c["country"]} | {c["role"]} | {c["job"]} | {mf} | "{c["star"]}" |')
        lines.append("")
    (ROOT_DIR / "03-ledger-1000.md").write_text("\n".join(lines), encoding="utf-8")
    print("ok", len(allc), "characters;", len(by), "stories")


if __name__ == "__main__":
    main()
