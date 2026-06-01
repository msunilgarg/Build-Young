import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: '/tmp/vid', size: { width: 1280, height: 800 } } });
const p = await ctx.newPage();
const pause = (ms) => p.waitForTimeout(ms);
await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await pause(2500); // hero (animated preview)
// enroll
await p.getByRole('button', { name: 'Enroll →' }).click(); await pause(1200);
await p.getByLabel('Student name').fill('Isabella Davis'); await pause(400);
await p.getByLabel(/Email/).fill('isabella@example.com'); await pause(500);
await p.getByRole('button', { name: /Continue to payment/ }).click(); await pause(1000);
await p.getByRole('button', { name: /Pay \$\d+ \(demo\)/ }).click(); await pause(1000);
await p.getByRole('button', { name: /Open my dashboard/ }).click(); await pause(1800);
// advance through all 12 weeks + into check-ins, pausing on the dashboard each time
async function adv(){ 
  try { await p.getByRole('button', { name: 'This Week' }).click({timeout:2000}); } catch(e){}
  await pause(500);
  const btn = p.getByRole('button', { name: /Collect|Finish course|advance|continue/ }).first();
  await btn.click({timeout:3000}).catch(()=>{});
  await pause(900);
}
for (let i=0;i<17;i++){ await adv(); }
await pause(2000);
await ctx.close(); // finalizes the video
await b.close();
console.log('done');
