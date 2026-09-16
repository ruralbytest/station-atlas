import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
const atlas=JSON.parse(readFileSync('public/models/atlas.json','utf8'));
const countAt=(date:string)=>atlas.parts.filter((p:{conceptId:string})=>atlas.concepts.find((c:{id:string})=>c.id===p.conceptId).launch.date<=date).length;
async function ready(page:Page,path='/'){await page.goto(path);await expect(page.locator('.loading')).toHaveCount(0);await expect(page.locator('canvas')).toBeVisible();}
async function choose(page:Page,name:string){await page.getByRole('button',{name:'Search the station',exact:true}).click();await page.getByRole('combobox').fill(name);await page.getByRole('option').filter({hasText:name}).first().click();await expect(page.locator('.detail-sheet')).toBeVisible();}
const canvasHash=async(page:Page)=>createHash('sha256').update(await page.locator('canvas').screenshot()).digest('hex');
function changedPixels(before:Buffer,after:Buffer){const a=PNG.sync.read(before),b=PNG.sync.read(after);if(a.width!==b.width||a.height!==b.height)return 1;let changed=0;for(let i=0;i<a.data.length;i+=4)if([0,1,2,3].some(channel=>Math.abs(a.data[i+channel]-b.data[i+channel])>20))changed++;return changed/(a.width*a.height);}

test('count, future selections and the separate complete endpoint',async({page})=>{
 await ready(page);const slider=page.getByRole('slider',{name:'Assembly',exact:true});
 await slider.press('Home');await expect(page.locator('.panel-foot')).toContainText(`${countAt('1998-11-20')} pieces visible`);
 await choose(page,'Destiny');await expect(page.getByText('Some selected pieces are hidden')).toBeVisible();
 await page.getByRole('button',{name:'Jump to launch',exact:true}).click();
 await expect(page.locator('.timeline-control output')).toHaveText('2001');await expect(page.locator('.panel-foot')).toContainText(`${countAt('2001-02-07')} pieces visible`);
 await page.getByRole('button',{name:'Clear selection',exact:true}).click();
 await slider.press('End');await expect(page.locator('.timeline-control output')).toHaveText('Complete');
 await expect(page.locator('.panel-foot')).toContainText('382 pieces visible');
 await slider.press('ArrowLeft');await expect(page.locator('.timeline-control output')).toHaveText('2011');
 await expect(page.locator('.panel-foot')).toContainText(`${countAt('2011-12-31')} pieces visible`);
 await choose(page,'Nauka');await page.getByRole('button',{name:'Show complete reference model',exact:true}).click();
 await expect(page.locator('.timeline-control output')).toHaveText('Complete');await expect(page.getByRole('button',{name:'Isolate structure',exact:true})).toBeEnabled();
});

test('camera returns to its initial framing after small-part isolation and reset',async({page},testInfo)=>{
 await ready(page);await page.waitForTimeout(1000);const before=await page.locator('canvas').screenshot(),original=await canvasHash(page);
 await testInfo.attach('initial-camera',{body:before,contentType:'image/png'});
 await choose(page,'Cupola');await page.getByRole('button',{name:'Isolate structure',exact:true}).click();
 await expect(page.locator('.detail-sheet')).toHaveClass(/is-isolated/);await page.waitForTimeout(1000);
 expect(await canvasHash(page)).not.toBe(original);
 await page.getByRole('button',{name:'Show surrounding station',exact:true}).click();
 await page.getByRole('button',{name:'Clear selection',exact:true}).click();
 await page.waitForTimeout(1000);await testInfo.attach('restored-camera',{body:await page.locator('canvas').screenshot(),contentType:'image/png'});
 await expect.poll(async()=>changedPixels(before,await page.locator('canvas').screenshot())).toBeLessThan(.003);
 await choose(page,'Cupola');await page.getByRole('button',{name:'Isolate structure',exact:true}).click();
 await page.getByRole('button',{name:'Reset view and layers',exact:true}).click();
 await expect.poll(async()=>changedPixels(before,await page.locator('canvas').screenshot())).toBeLessThan(.003);
});

test('shareable URLs restore filters, date, selection and camera preset',async({page})=>{
 await ready(page,'/#view=side&systems=us-modules&date=2001-02-07&element=lab');
 await expect(page.locator('.structure-title')).toHaveText(/Destiny laboratory/i);
 await expect(page.getByRole('button',{name:'side view',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.timeline-control output')).toHaveText('2001');
 await expect(page.getByRole('switch',{name:'Show us modules',exact:true})).toBeChecked();
 await expect(page.getByRole('switch',{name:'Show integrated truss',exact:true})).not.toBeChecked();
 await expect(page.locator('.structure-sources a[href="https://www.nasa.gov/mission/sts-98/"]')).toBeVisible();
 await page.reload();await expect(page.locator('.structure-title')).toHaveText(/Destiny laboratory/i);
 await page.getByRole('button',{name:'Copy view link',exact:true}).click();await expect(page.locator('.share-feedback')).toBeVisible();
});

test('catalogue and geometry failures have a recoverable error',async({page})=>{
 await page.route('**/models/atlas.json',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.goto('/');await expect(page.getByRole('alert')).toContainText('catalogue could not be loaded');
 await page.unroute('**/models/atlas.json');await page.route('**/models/*.gz',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.getByRole('button',{name:'Reload viewer',exact:true}).click();await expect(page.getByRole('alert')).toContainText('model file could not be loaded');
 await page.unroute('**/models/*.gz');await page.getByRole('button',{name:'Reload viewer',exact:true}).click();await expect(page.locator('.loading')).toHaveCount(0);
});

test('deferred viewer failure leaves a reload action',async({page})=>{
 await page.route('**/assets/scene-*.js',route=>route.abort());await page.goto('/');
 await expect(page.getByRole('alert')).toContainText('3D viewer could not be loaded');
 await page.unroute('**/assets/scene-*.js');await page.getByRole('button',{name:'Reload viewer',exact:true}).click();await expect(page.locator('.loading')).toHaveCount(0);
});

test('phone controls, themes and exploded view remain usable',async({browser},testInfo)=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();let chunks=0;page.on('request',r=>{if(/\.bin(\.gz)?$/.test(r.url()))chunks++;});
 await ready(page,'http://127.0.0.1:3017/');const loaded=chunks;
 await page.getByRole('button',{name:'Switch to dark mode',exact:true}).tap();await expect(page.locator('html')).toHaveClass('dark');expect(chunks).toBe(loaded);
 await page.reload();await expect(page.locator('html')).toHaveClass('dark');await expect(page.locator('.loading')).toHaveCount(0);
 await page.getByRole('button',{name:'Open system layers',exact:true}).tap();await page.getByRole('button',{name:'Modules only',exact:true}).tap();
 await page.getByRole('button',{name:'Close systems',exact:true}).tap();await page.getByRole('slider',{name:'Explode station',exact:true}).press('End');
 await expect(page.locator('.scene-caption')).toHaveText('STATION INVENTORY');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await testInfo.attach('phone-inventory',{body:await page.screenshot(),contentType:'image/png'});
 await context.close();
});

test('record loading under a simulated mobile connection',async({browser},testInfo)=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),cdp=await context.newCDPSession(page);
 await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:10e6/8,uploadThroughput:2e6/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await ready(page,'http://127.0.0.1:3017/');
 const metrics=await page.evaluate(()=>{const entries=performance.getEntriesByType('resource') as PerformanceResourceTiming[];return{readyMs:Math.round(performance.now()),geometryBytes:entries.filter(e=>/\.bin(\.gz)?$/.test(e.name)).reduce((n,e)=>n+e.encodedBodySize,0),javascriptBytes:entries.filter(e=>/\.js$/.test(e.name)).reduce((n,e)=>n+e.encodedBodySize,0),cssBytes:entries.filter(e=>/\.css$/.test(e.name)).reduce((n,e)=>n+e.encodedBodySize,0)};});
 console.log('Simulated mobile load (10 Mbps, 80 ms latency, 4× CPU slowdown; local software GPU):',metrics);
 await testInfo.attach('mobile-load-metrics',{body:JSON.stringify(metrics,null,2),contentType:'application/json'});await context.close();
});

test('future launch action fits on a small phone',async({page})=>{
 await page.setViewportSize({width:320,height:568});await ready(page,'/#date=1998-11-20&element=lab');
 const action=page.getByRole('button',{name:'Jump to launch',exact:true});await expect(action).toBeInViewport();
 await action.click();await expect(page.locator('.timeline-control output')).toHaveText('2001');
 await expect(page.locator('.detail-scroll')).toBeVisible();
});
