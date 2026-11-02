import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',
 timeout:30000,
 retries:0,
 use:{headless:true,browserName:'chromium'},
 webServer:{
  command:'python3 -m http.server 4173 --directory www',
  url:'http://127.0.0.1:4173/index.html',
  reuseExistingServer:false,
  timeout:15000
 }
});
