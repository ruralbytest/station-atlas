// Records the vertical 1080x1920 clip: front view, play the assembly timeline, explode to 1, then back to 0. Writes outputs/station-assembly-1080x1920.mp4.
// Usage: npm run dev, then node scripts/record-clip.mjs [url]. Needs Playwright with Chromium (PLAYWRIGHT_MODULE=<path to playwright/index.mjs> if not installed here) and ffmpeg on PATH.
// Assembly plays in real time (one year per two seconds) and is sped up in the encode so the clip stays under 15 seconds; explode is kept at real speed.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const ASSEMBLY_SECONDS=8.5,url=process.argv[2]??'http://localhost:3016/';
const out=new URL('../outputs/',import.meta.url),frames=new URL('clip-frames/',out),target=new URL('station-assembly-1080x1920.mp4',out);
fs.rmSync(frames,{recursive:true,force:true});fs.mkdirSync(frames,{recursive:true});
// Headed, so WebGL uses the GPU rather than a software rasterizer.
const browser=await chromium.launch({headless:false,args:['--window-size=560,1060','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:540,height:960},deviceScaleFactor:2});
await page.goto(url);
await page.waitForFunction(()=>document.querySelector('canvas')&&!document.querySelector('.loading'),null,{timeout:120000});
await page.click('button[aria-label="front view"]');await page.waitForTimeout(1500);
const cdp=await page.context().newCDPSession(page),shots=[],clock=()=>Date.now()/1000;
cdp.on('Page.screencastFrame',({data,metadata,sessionId})=>{const file=`${String(shots.length).padStart(5,'0')}.jpg`;fs.writeFileSync(new URL(file,frames),Buffer.from(data,'base64'));shots.push({file,time:metadata.timestamp});cdp.send('Page.screencastFrameAck',{sessionId}).catch(()=>{});});
await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:1080,maxHeight:1920});
await page.waitForTimeout(800);
const playStart=clock();
await page.click('button[aria-label="Play assembly"]');
await page.waitForSelector('button[aria-label="Pause assembly"]');
await page.waitForSelector('button[aria-label="Play assembly"]',{timeout:60000});
await page.waitForTimeout(1000);
const playEnd=clock();
await page.locator('.bottom-dock > .explode-control input[type=range]').focus();
await page.keyboard.press('End');await page.waitForTimeout(2300);
await page.keyboard.press('Home');await page.waitForTimeout(2000);
const stopTime=clock();await cdp.send('Page.stopScreencast');await browser.close();
assert(shots.length>30,'the screencast produced too few frames');
const speed=(playEnd-playStart)/ASSEMBLY_SECONDS;
const at=t=>t<playStart?t-shots[0].time:t<playEnd?playStart-shots[0].time+(t-playStart)/speed:playStart-shots[0].time+ASSEMBLY_SECONDS+(t-playEnd);
const list=shots.map((s,i)=>`file '${s.file}'\nduration ${Math.max(.001,(shots[i+1]?at(shots[i+1].time):at(stopTime))-at(s.time)).toFixed(4)}`).join('\n')+'\n';
fs.writeFileSync(new URL('frames.txt',frames),list);
const encode=spawnSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',fileURLToPath(new URL('frames.txt',frames)),'-vf','fps=30,tpad=stop_mode=clone:stop_duration=0.8,scale=1080:1920:flags=lanczos:out_range=tv,format=yuv420p','-pix_fmt','yuv420p','-color_range','tv','-c:v','libx264','-crf','18','-preset','slow','-movflags','+faststart',fileURLToPath(target)],{stdio:'inherit'});
assert(encode.status===0,'ffmpeg failed');
fs.rmSync(frames,{recursive:true,force:true});
console.log(`${fileURLToPath(target)}: ${shots.length} frames, assembly ${(playEnd-playStart).toFixed(1)} s sped ${speed.toFixed(2)}x, clip ${(at(shots.at(-1).time)+.8).toFixed(1)} s`);
function assert(ok,message){if(!ok)throw new Error(message);}
