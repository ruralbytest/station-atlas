import fs from 'node:fs';
// Prints the id of every manifest concept without a complete launch (ISO date, flight, vehicle). Prints nothing when all are dated.
const atlas=JSON.parse(fs.readFileSync(new URL('../public/models/atlas.json',import.meta.url)));
const missing=atlas.concepts.filter(c=>!/^\d{4}-\d{2}-\d{2}$/.test(c.launch?.date??'')||Number.isNaN(Date.parse(c.launch.date))||!c.launch.flight||!c.launch.vehicle).map(c=>c.id);
if(missing.length){console.log(missing.join('\n'));process.exitCode=1;}
