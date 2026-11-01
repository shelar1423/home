// End-to-end check: loads the page, walks from the road to every floor using
// the same route planner the UI uses, and fails on any page error or a route
// that does not arrive. Needs Playwright (npx playwright) and a local server:
//   python3 -m http.server 8765   then   node tests/smoke.mjs
import { chromium } from 'playwright';
const url = process.env.TEST_URL || 'http://localhost:8765/';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { try { localStorage.setItem('shelar-help', '1'); } catch {} });
await page.goto(url); await page.waitForFunction(() => window.__home, null, { timeout: 60000 });
await page.click('[data-mode="walk"]'); await page.waitForTimeout(1600);

const trips = [
  ['road → 1st floor living', 1, 6.4, 5.2],
  ['1st → penthouse terrace', 3, 9.0, 3.2],
  ['penthouse → 2nd floor bedroom', 2, 9.4, 4.9],
  ['2nd → ground floor bedroom', 0, 2.6, 3.1],
  ['ground bedroom → road', 0, 6.7, 11.5],
];
let failed = false;
for (const [name, level, x, z] of trips) {
  const t0 = Date.now();
  const ok = await page.evaluate(([l, x, z]) => new Promise((res) => { const started = __home.walkTo(l, x, z, () => res(true)); if (!started) res(false); setTimeout(() => res(false), 90000); }), [level, x, z]);
  const p = await page.evaluate(() => ({ level: __home.player.level, x: +__home.player.x.toFixed(2), z: +__home.player.z.toFixed(2), y: +__home.player.y.toFixed(2) }));
  const arrived = ok && p.level === level && Math.hypot(p.x - x, p.z - z) < 0.6;
  console.log(arrived ? 'ok  ' : 'FAIL', name, `${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(p));
  if (!arrived) failed = true;
}
// Manual walking into a staircase starts a ride.
await page.evaluate(() => { __home.teleport(1, 4.075, 3.1, Math.PI); });
await page.waitForTimeout(800);
await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
const riding = await page.evaluate(() => !!__home.state.ride);
console.log(riding ? 'ok  ' : 'FAIL', 'walking forward onto the stairs starts a ride');
if (!riding) failed = true;
await page.waitForTimeout(9000);
const lvl = await page.evaluate(() => __home.player.level);
console.log(lvl === 2 ? 'ok  ' : 'FAIL', 'ride ends on the second floor', lvl);
if (lvl !== 2) failed = true;

console.log(errors.length ? 'FAIL page errors ' + JSON.stringify(errors) : 'ok   no page errors');
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
