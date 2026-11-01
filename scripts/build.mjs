// Bundles src/ into one self-contained index.html (Three.js, code and the
// drawing sheets inlined), so the page works from any static host or offline.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const out = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none' });
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const sheets = {};
for (let p = 1; p <= 6; p++) {
  const f = `plans/sheet-${p}.jpg`;
  if (existsSync(f)) sheets[p] = 'data:image/jpeg;base64,' + readFileSync(f).toString('base64');
}
const html = readFileSync('src/template.html', 'utf8').replace('<!--BUNDLE-->',
  `<script>window.PLAN_SHEETS=${JSON.stringify(sheets)}</script>\n<script>/* Three.js © 2010-2024 three.js authors, MIT License */\n${js}</script>`);
writeFileSync('index.html', html);
console.log(`index.html written (${(html.length / 1048576).toFixed(2)} MB)`);
