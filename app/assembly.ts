import type {Atlas,Concept} from './anatomy';
// The assembly timeline is a UTC timestamp; null means the complete 2011 model, including elements that flew later.
export const DAY_MS=864e5,YEAR_MS=365.2425*DAY_MS,PLAY_MS_PER_YEAR=2000,DOCK_DISTANCE=3,DOCK_DAMPING=8;
export const TIMELINE_END=Date.UTC(2011,11,31);
export const launchTime=(c?:Concept)=>c?.launch?Date.parse(`${c.launch.date}T00:00:00Z`):-Infinity;
export function partLaunchTimes(atlas:Atlas){const concepts=new Map(atlas.concepts.map(c=>[c.id,c]));return Float64Array.from(atlas.parts,p=>launchTime(concepts.get(p.conceptId)));}
export function timelineStart(atlas:Atlas){const times=[...partLaunchTimes(atlas)].filter(Number.isFinite);return times.length?Math.min(...times):TIMELINE_END;}
export const isLaunched=(launch:number,assembly:number|null)=>assembly===null||launch<=assembly;
export function advanceAssembly(assembly:number,elapsedMs:number,end=TIMELINE_END):number|null{const next=assembly+elapsedMs/PLAY_MS_PER_YEAR*YEAR_MS;return next>=end?null:next;}
/** The most recently launched flight element at a point on the timeline, largest first among elements sharing that launch. */
export function latestArrival(atlas:Atlas,assembly:number|null):Concept|undefined{
 const elements=new Set(atlas.parts.map(p=>p.conceptId));let best:Concept|undefined;
 for(const c of atlas.concepts){const t=launchTime(c);if(!elements.has(c.id)||!Number.isFinite(t)||!isLaunched(t,assembly))continue;const b=launchTime(best);if(!best||t>b||(t===b&&c.elements.length>best.elements.length))best=c;}
 return best;
}
