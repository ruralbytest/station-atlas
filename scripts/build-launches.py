"""Write each concept's launch (ISO date, flight designation, vehicle) into public/models/atlas.json from docs/assembly-sequence.json.
Usage: python scripts/build-launches.py   (run after compress-models.mjs; safe to rerun)
Element concepts take their entry directly. Group concepts span their members: the earliest date, plus complete when members flew on several days.
Each date and vehicle is cross-checked against the cited launch and vehicle facts in docs/station-facts.json.
"""
import json,re
from datetime import datetime
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=json.loads((root/'docs/assembly-sequence.json').read_text(encoding='utf8'));sequence=source['launches']
facts=json.loads((root/'docs/station-facts.json').read_text(encoding='utf8'))['facts']
path=root/'public/models/atlas.json';raw=path.read_text(encoding='utf8');atlas=json.loads(raw)
host=lambda url:re.match(r'https://([^/#]+)',url).group(1)
elements={p['conceptId'] for p in atlas['parts']}
for cid in elements:
 e=sequence.get(cid);assert e,f'{cid}: no entry in docs/assembly-sequence.json'
 assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',e['date']),f'{cid}: date must be YYYY-MM-DD'
 flight,url=e['flight'];assert flight and (host(url)=='nasa.gov' or host(url).endswith('.nasa.gov')),f'{cid}: flight must cite a nasa.gov page'
 stated=facts[cid]['launch'][0];first=re.match(r'[A-Z][a-z]+ \d{1,2}, \d{4}',stated).group(0)
 assert datetime.strptime(first,'%B %d, %Y').date().isoformat()==e['date'],f'{cid}: {e["date"]} differs from the cited launch "{stated}"'
 vehicle=facts[cid]['vehicle'][0];missions=re.findall(r'STS-\d+',e['vehicle'])
 assert (missions==re.findall(r'STS-\d+',vehicle)) if missions else e['vehicle'].split('-')[0].lower() in vehicle.lower(),f'{cid}: vehicle "{e["vehicle"]}" differs from the cited "{vehicle}"'
for cid in set(sequence)-elements:raise AssertionError(f'{cid}: entry has no concept in the manifest')
# Pieces launched together share one date.
by_flight={}
for cid in elements:by_flight.setdefault(sequence[cid]['flight'][0],set()).add(sequence[cid]['date'])
for flight,dates in by_flight.items():assert len(dates)==1,f'flight {flight} has several dates: {sorted(dates)}'
part_concept={p['id']:p['conceptId'] for p in atlas['parts']}
for c in atlas['concepts']:
 if c['id'] in elements:e=sequence[c['id']];launch={'date':e['date'],'flight':e['flight'][0],'vehicle':e['vehicle']}
 else:
  members=sorted({part_concept[pid] for pid in c['elements']},key=lambda m:(sequence[m]['date'],sequence[m]['flight'][0]))
  flights=list(dict.fromkeys(sequence[m]['flight'][0] for m in members));vehicles=list(dict.fromkeys(sequence[m]['vehicle'] for m in members))
  launch={'date':sequence[members[0]]['date'],'flight':flights[0] if len(flights)==1 else f'{flights[0]} to {flights[-1]} ({len(flights)} flights)','vehicle':vehicles[0] if len(vehicles)==1 else f'{len(vehicles)} launches'}
  if sequence[members[-1]]['date']!=launch['date']:launch['complete']=sequence[members[-1]]['date']
 c.pop('launch',None);c['launch']=launch
for pid,entry in source.get('partLaunches',{}).items():
 part=next(p for p in atlas['parts'] if p['id']==pid)
 assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',entry['date'])
 assert all(host(url)=='nasa.gov' or host(url).endswith('.nasa.gov') for url in entry['sources'])
 part['launchDate']=entry['date']
compact=not raw.lstrip().startswith('{\n')
path.write_text(json.dumps(atlas,separators=(',',':')) if compact else json.dumps(atlas,indent=1),encoding='utf8')
print(f"{len(atlas['concepts'])} concepts dated ({len(elements)} elements, {len(atlas['concepts'])-len(elements)} groups) across {len(by_flight)} flights, {min(sequence[c]['date'] for c in elements)} to {max(sequence[c]['date'] for c in elements)}")
