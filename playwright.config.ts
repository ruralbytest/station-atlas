import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',timeout:60000,expect:{timeout:15000},fullyParallel:false,workers:1,
 use:{baseURL:'http://127.0.0.1:3017',headless:true,viewport:{width:1280,height:720},trace:'retain-on-failure',launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
});
