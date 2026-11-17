import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STORAGE_KEY,
  MODEL_ID,
  SCHOOL_NAME,
  OPTS,
  formatActivityDate,
  downloadFilename,
  generateContentUrl,
  computePadSize,
  posterTargetRatio,
  buildRecipes,
  buildPrompt,
  buildGeneratePayload,
  pickUniqueIndices,
  extractInlineImage,
  describeApiFailure,
  describeMissingImage,
  shouldRetryStatus,
  isLikelyApiKey
} from './lib.js';

const root = dirname(fileURLToPath(import.meta.url));
let failed = 0;

function ok(name, cond, detail = '') {
  if (cond) {
    console.log(`ok  ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const sourceFiles = walk(root).filter((p) => {
  const ext = extname(p);
  const rel = p.slice(root.length + 1);
  if (rel === 'test-app.mjs') return false;
  return ['.html', '.js', '.mjs', '.css', '.md', '.webmanifest', '.svg', '.json'].includes(ext)
    || ['LICENSE', '.gitignore', '.nojekyll'].includes(rel);
});

const sourceText = sourceFiles.map((p) => `${p}\n${readFileSync(p, 'utf8')}`).join('\n');

ok('no hardcoded Gemini / Google API keys', !/AIza[0-9A-Za-z_-]{10,}/.test(sourceText) && !/ya29\.[0-9A-Za-z_-]+/.test(sourceText));
ok('no empty workshop key injection comment', !sourceText.includes('執行環境注入'));
ok('localStorage key name is ai-cyun-daap-gemini-key', STORAGE_KEY === 'ai-cyun-daap-gemini-key' && sourceText.includes('ai-cyun-daap-gemini-key'));
ok('download filename uses LWFSS_ not WFSL_', downloadFilename(false, 123) === 'LWFSS_Outfit_123.jpg' && downloadFilename(true, 123) === 'LWFSS_IDPhoto_123.jpg' && !sourceText.includes('WFSL_'));
ok('school name locked and 岡 is U+5CA1', SCHOOL_NAME === '世界龍岡學校劉皇發中學' && SCHOOL_NAME.includes('\u5CA1') && !SCHOOL_NAME.includes('\u5D17'));
ok('HTML lang is zh-Hant-HK', readFileSync(join(root, 'index.html'), 'utf8').includes('lang="zh-Hant-HK"'));
ok('cache-bust version 20261117a is wired', readFileSync(join(root, 'index.html'), 'utf8').includes('style.css?v=20261117a') && readFileSync(join(root, 'index.html'), 'utf8').includes('app.js?v=20261117a'));
ok('current official model id is used', MODEL_ID === 'gemini-nano-banana-2.1');
ok('API URL does not put a key in the query string', generateContentUrl() === 'https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent' && !generateContentUrl().includes('key='));

ok('formatActivityDate is YYYY.MM.DD', formatActivityDate(new Date(2026, 5, 9)) === '2026.06.09');

const padSquare = computePadSize(800, 800, 1748 / 1200);
ok('padImageToRatio tallens a square to poster ratio', Math.abs(padSquare.height / padSquare.width - 1748 / 1200) < 1e-9 && padSquare.x === 0 && padSquare.y > 0);
const padTall = computePadSize(400, 1600, 1748 / 1200);
ok('padImageToRatio widens a tall image to poster ratio', Math.abs(padTall.height / padTall.width - 1748 / 1200) < 1e-9 && padTall.y === 0 && padTall.x > 0);

const padWide = computePadSize(1600, 400, 1748 / 1200);
ok('padImageToRatio tallens a wide image to poster ratio', Math.abs(padWide.height / padWide.width - 1748 / 1200) < 1e-9 && padWide.x === 0 && padWide.y > 0);

ok('poster ratio for id-photo is 1500/1200', posterTargetRatio('id-photo') === 1500 / 1200);
ok('poster ratio for single/four-grid is 1748/1200', posterTargetRatio('single') === 1748 / 1200 && posterTargetRatio('four-grid') === 1748 / 1200);

const idPrompt = buildPrompt({ layout: 'id-photo', bg: '純白底色 (標準)', outfit: '黑色正式西裝' });
ok('id-photo prompt keeps HK passport rules and option values', idPrompt.includes('Hong Kong ID photo') && idPrompt.includes('純白底色 (標準)') && idPrompt.includes('黑色正式西裝') && idPrompt.includes('75%'));

const fashionPrompt = buildPrompt({
  layout: 'single',
  outfit: '畢業袍',
  scene: '圖書館書海',
  pose: '心形手勢',
  art: '塔羅牌插畫'
});
ok('fashion prompt wires outfit/scene/pose/art', fashionPrompt.includes('畢業袍') && fashionPrompt.includes('圖書館書海') && fashionPrompt.includes('心形手勢') && fashionPrompt.includes('塔羅牌插畫') && fashionPrompt.includes('padded with white borders'));

const payload = buildGeneratePayload(fashionPrompt, 'image/jpeg', 'AAAA');
ok('payload sends text + image and requests image modality', payload.contents[0].parts[0].text === fashionPrompt && payload.contents[0].parts[1].inlineData.mimeType === 'image/jpeg' && payload.generationConfig.responseModalities.includes('IMAGE'));

const fakeDom = {
  'outfit-0': 'custom',
  'outfit-0-custom': '  校服加圍巾  ',
  'scene-0': '日式櫻花神社',
  'pose-0': '自拍',
  'art-0': '寫實人像攝影',
  'idbg-0': '淺藍底色',
  'idoutfit-0': '深色圓領衫',
  'outfit-1': '王子',
  'scene-1': '歐洲復古小鎮',
  'pose-1': '跳躍瞬間',
  'art-1': '印象派油畫',
  'outfit-2': '女僕',
  'scene-2': '午後露天咖啡座',
  'pose-2': '時尚插口袋',
  'art-2': '經典水彩渲染',
  'outfit-3': '執事',
  'scene-3': '復古黑膠唱片行',
  'pose-3': '酷帥側身站立',
  'art-3': '蒸氣龐克風'
};
const getEl = (id) => fakeDom[id] || '';

const singleRecipes = buildRecipes('single', getEl);
ok('single layout reads custom outfit and other options', singleRecipes.length === 1 && singleRecipes[0].outfit === '校服加圍巾' && singleRecipes[0].scene === '日式櫻花神社' && singleRecipes[0].layout === 'single');

const gridRecipes = buildRecipes('four-grid', getEl);
ok('four-grid builds four independent recipes', gridRecipes.length === 4 && gridRecipes[3].art === '蒸氣龐克風' && gridRecipes[1].outfit === '王子');

const idRecipes = buildRecipes('id-photo', getEl);
ok('id-photo recipe uses background and outfit only', idRecipes.length === 1 && idRecipes[0].layout === 'id-photo' && idRecipes[0].bg === '淺藍底色' && idRecipes[0].outfit === '深色圓領衫');

const arts = pickUniqueIndices(OPTS.arts.length, 4, (() => {
  let i = 0;
  const seq = [0.9, 0.1, 0.5, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6, 0.15, 0.85, 0.45, 0.55, 0.25, 0.75];
  return () => seq[i++ % seq.length];
})());
ok('unique art indices are 4 distinct values', arts.length === 4 && new Set(arts).size === 4 && arts.every((n) => n >= 0 && n < OPTS.arts.length));

const img = extractInlineImage({
  candidates: [{ content: { parts: [{ text: 'ok' }, { inlineData: { mimeType: 'image/png', data: 'ABC' } }] } }]
});
ok('extracts inline image from generateContent response', img && img.data === 'ABC' && img.mimeType === 'image/png');
ok('missing image explains finish reason', describeMissingImage({ candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] }).includes('SAFETY'));

ok('401/403 is described as a key problem, not a generic connection error', describeApiFailure(403, '', { error: { message: 'API key expired' } }).includes('金鑰') && !describeApiFailure(403, '', { error: { message: 'API key expired' } }).includes('連線問題'));
ok('429 and 5xx are retryable, 400/401/403 are not', shouldRetryStatus(429) && shouldRetryStatus(503) && !shouldRetryStatus(400) && !shouldRetryStatus(401) && !shouldRetryStatus(403));
ok('isLikelyApiKey rejects empty or spaced values', !isLikelyApiKey('') && !isLikelyApiKey('short') && !isLikelyApiKey('has space in key value12345') && isLikelyApiKey('A'.repeat(24)));
ok('option catalogs still include custom-capable groups', OPTS.outfits.length >= 14 && OPTS.scenes.length >= 14 && OPTS.poses.length >= 10 && OPTS.arts.length >= 16 && OPTS.idBackgrounds.length === 3);

ok('service worker does not cache Google API host', !readFileSync(join(root, 'sw.js'), 'utf8').includes('generativelanguage.googleapis.com'));

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nAll tests passed.');
