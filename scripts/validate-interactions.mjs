import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createExplosionLayout} from '../app/explosion-layout.ts';
import {PointerTap} from '../app/pointer-tap.ts';
import {atlasTools} from '../app/agent-tools.ts';
import {PLAY_MS_PER_YEAR,TIMELINE_END,YEAR_MS,advanceAssembly,isLaunched,latestArrival,partLaunchTimes,timelineStart} from '../app/assembly.ts';

for (const file of ['atlas.json']) {
  const atlas=JSON.parse(await readFile(new URL(`../public/models/${file}`,import.meta.url)));
  const groups=[atlas.parts,...[...new Set(atlas.parts.map(p=>p.system))].map(system=>atlas.parts.filter(p=>p.system===system))];
  for(const group of groups) for(const aspect of [.46,1,1.7]) {
    const layout=createExplosionLayout(group,aspect),cells=[...layout.cells.values()];
    assert.equal(cells.length,group.length);
    for(let i=0;i<cells.length;i++) {
      const a=cells[i];
      assert.ok(Math.abs(a.x)+a.width/2<=layout.width/2+1e-8);
      assert.ok(Math.abs(a.y)+a.height/2<=layout.height/2+1e-8);
      for(let j=i+1;j<cells.length;j++) {
        const b=cells[j];
        assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2-1e-8 || Math.abs(a.y-b.y)>=(a.height+b.height)/2-1e-8,'Exploded pieces overlap');
      }
    }
  }
  let selected=null;
  const [find,inspect]=atlasTools(atlas,c=>{selected=c;});
  const results=find.execute({query:'truss'});
  assert.ok(results.length>0);
  inspect.execute({id:results[0].id});
  const previous=selected;
  assert.throws(()=>inspect.execute({id:'nonexistent-structure'}));
  assert.equal(selected,previous);
  assert.throws(()=>find.execute({query:' '}));
  const launches=partLaunchTimes(atlas),start=timelineStart(atlas),present=at=>new Set(atlas.parts.filter((_,i)=>isLaunched(launches[i],at)).map(p=>p.conceptId));
  assert.deepEqual([...present(start)],['fgb'],'the timeline starts with Zarya alone');
  assert.equal(atlas.parts.filter((_,i)=>isLaunched(launches[i],null)).length,atlas.parts.length,'complete assembly shows every part');
  const in2011=present(TIMELINE_END);assert.ok(in2011.has('ams')&&!in2011.has('mlm')&&!in2011.has('era'),'2011 holds every element except those launched later');
  assert.ok(Math.abs(advanceAssembly(start,PLAY_MS_PER_YEAR)-start-YEAR_MS)<1,'play advances one year per two seconds');
  let at=start,frames=0;while(at!==null){at=advanceAssembly(at,1000/60);frames++;}assert.ok(Math.abs(frames/60-(TIMELINE_END-start)/YEAR_MS*PLAY_MS_PER_YEAR/1000)<.05,'play stops at the complete station');
  assert.equal(latestArrival(atlas,start).id,'fgb');assert.equal(latestArrival(atlas,Date.UTC(1998,11,4)).id,'node1');assert.equal(latestArrival(atlas,null).id,'mlm');
  console.log(`${file}: packing at desktop/mobile aspect ratios, search/inspection contracts, and assembly timeline passed (${(frames/60).toFixed(1)} s of play).`);
}
const tap=new PointerTap();
tap.down(1,10,10,5);assert.equal(tap.up(1,12,11),true);
tap.down(1,10,10,5);tap.move(1,40,10);assert.equal(tap.up(1,10,10),false);
tap.down(1,10,10,12);tap.down(2,20,20,12);assert.equal(tap.up(2,20,20),false);assert.equal(tap.up(1,10,10),false);
tap.down(1,10,10,5);tap.cancel(1);assert.equal(tap.up(1,10,10),false);
tap.down(1,10,10,5);assert.equal(tap.up(1,10,10),true);
assert.equal(createExplosionLayout([]).cells.size,0);
console.log('Tap, drag, multitouch, cancellation, and empty-view checks passed.');
