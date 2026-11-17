import {
  STORAGE_KEY,
  MODEL_ID,
  MODEL_LABEL,
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
} from './lib.js?v=20261117a';

const GENERATE_BTN_IDLE_HTML = `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
    <span>開始 AI 智慧生成照片</span>
`;

const GENERATE_BTN_AGAIN_HTML = `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
    <span>重新生成照片</span>
`;

const GENERATE_ENABLED_CLASS = 'w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-6 rounded-xl shadow-lg transition transform active:scale-[0.98] flex items-center justify-center space-x-2 mt-0 text-xl shrink-0 cursor-pointer';
const GENERATE_DISABLED_CLASS = 'w-full bg-slate-300 text-slate-500 font-black py-4 px-6 rounded-xl shadow-lg transition transform active:scale-[0.98] flex items-center justify-center space-x-2 mt-0 text-xl shrink-0 cursor-not-allowed';
const DOWNLOAD_IDLE_CLASS = 'w-full bg-slate-300 text-slate-500 font-bold py-4 px-6 rounded-xl shadow-md transition cursor-not-allowed flex items-center justify-center space-x-2 text-lg';
const DOWNLOAD_READY_CLASS = 'w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl shadow-md transition transform active:scale-[0.98] flex items-center justify-center space-x-2 text-lg cursor-pointer';

const uploadBox = document.getElementById('upload-box');
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const generateBtn = document.getElementById('generate-btn');
const downloadBtn = document.getElementById('download-btn');
const finalPreview = document.getElementById('final-preview');
const previewPlaceholder = document.getElementById('preview-placeholder');
const resolutionText = document.getElementById('resolution-text');
const generateHint = document.getElementById('generate-hint');

const schoolInput = document.getElementById('school-name');
const dateInput = document.getElementById('activity-date');
const layoutSelect = document.getElementById('layout-type');
const stylesContainer = document.getElementById('styles-container');
const randomBtn = document.getElementById('random-btn');

const keySettingsBtn = document.getElementById('key-settings-btn');
const keySettingsPanel = document.getElementById('key-settings-panel');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeySave = document.getElementById('api-key-save');
const apiKeyClear = document.getElementById('api-key-clear');
const apiKeyStatus = document.getElementById('api-key-status');
const modelBadge = document.getElementById('model-badge');

let userImageSrc = null;
let isGenerating = false;
let hasGeneratedOnce = false;

if (schoolInput) schoolInput.value = SCHOOL_NAME;
if (modelBadge) modelBadge.textContent = MODEL_LABEL;

const formattedDate = formatActivityDate(new Date());
dateInput.value = formattedDate;

function getStoredKey() {
  try {
    return (localStorage.getItem(STORAGE_KEY) || '').trim();
  } catch (err) {
    return '';
  }
}

function setStoredKey(value) {
  localStorage.setItem(STORAGE_KEY, value.trim());
}

function clearStoredKey() {
  localStorage.removeItem(STORAGE_KEY);
}

function refreshKeyUi() {
  const hasKey = Boolean(getStoredKey());
  if (apiKeyStatus) {
    apiKeyStatus.textContent = hasKey
      ? '已在此裝置儲存金鑰。可隨時更新或清除。'
      : '尚未設定金鑰。';
    apiKeyStatus.className = hasKey
      ? 'text-xs font-medium text-green-700'
      : 'text-xs font-medium text-amber-700';
  }
  if (keySettingsBtn) {
    keySettingsBtn.textContent = hasKey ? '金鑰已設定' : '設定金鑰';
    keySettingsBtn.className = hasKey
      ? 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-green-200 bg-green-50 text-green-800 hover:bg-green-100 transition'
      : 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition';
  }
  if (generateHint) {
    if (hasKey) {
      generateHint.classList.add('hidden');
    } else {
      generateHint.classList.remove('hidden');
      generateHint.textContent = '請先在右上角「設定金鑰」貼上 Gemini API 金鑰，才能開始生成。';
    }
  }
  if (!isGenerating) {
    generateBtn.disabled = !hasKey;
    generateBtn.className = hasKey ? GENERATE_ENABLED_CLASS : GENERATE_DISABLED_CLASS;
    if (!hasGeneratedOnce) generateBtn.innerHTML = GENERATE_BTN_IDLE_HTML;
  }
}

keySettingsBtn.addEventListener('click', () => {
  const open = keySettingsPanel.classList.toggle('hidden') === false;
  keySettingsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    apiKeyInput.value = '';
    apiKeyInput.focus();
  }
});

apiKeySave.addEventListener('click', () => {
  const value = apiKeyInput.value.trim();
  if (!isLikelyApiKey(value)) {
    apiKeyStatus.textContent = '請貼上有效的 Gemini API 金鑰（請到 Google AI Studio 建立）。';
    apiKeyStatus.className = 'text-xs font-medium text-amber-700';
    generateHint.classList.remove('hidden');
    generateHint.textContent = '請先在右上角「設定金鑰」貼上 Gemini API 金鑰，才能開始生成。';
    return;
  }
  try {
    setStoredKey(value);
  } catch (err) {
    apiKeyStatus.textContent = '無法儲存金鑰。請檢查瀏覽器是否允許本機儲存。';
    apiKeyStatus.className = 'text-xs font-medium text-amber-700';
    return;
  }
  apiKeyInput.value = '';
  refreshKeyUi();
  apiKeyStatus.textContent = '金鑰已儲存在此裝置。';
  apiKeyStatus.className = 'text-xs font-medium text-green-700';
});

apiKeyClear.addEventListener('click', () => {
  clearStoredKey();
  apiKeyInput.value = '';
  refreshKeyUi();
  apiKeyStatus.textContent = '已清除此裝置上的金鑰。';
  apiKeyStatus.className = 'text-xs font-medium text-slate-500';
});

function getElValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

/**
 * 動態產生視覺化網格選項 HTML
 */
function buildVisualHTML(idPrefix, label, optionsArr, includeCustom = true) {
  let optsHtml = optionsArr.map((o, idx) => {
    const isFirst = idx === 0;
    const activeClasses = isFirst
      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500 shadow-sm'
      : 'border-slate-200 bg-white text-slate-600';

    return `
      <div class="opt-btn cursor-pointer border rounded-xl p-3 text-center flex flex-col items-center justify-center hover:border-blue-300 hover:bg-slate-50 ${activeClasses}" data-val="${o.v}">
        <div class="text-2xl sm:text-3xl mb-1.5">${o.i}</div>
        <div class="text-xs sm:text-sm font-bold leading-tight">${o.v}</div>
      </div>
    `;
  }).join('');

  if (includeCustom) {
    optsHtml += `
      <div class="opt-btn custom-opt-btn cursor-pointer border border-slate-200 bg-white text-slate-600 rounded-xl p-3 text-center flex flex-col items-center justify-center hover:border-purple-300 hover:bg-purple-50" data-val="custom">
        <div class="text-2xl sm:text-3xl mb-1.5">✍️</div>
        <div class="text-xs sm:text-sm font-bold leading-tight">自定義</div>
      </div>
    `;
  }

  return `
    <div class="w-full pt-3 pb-2 visual-group">
      <label class="block text-base font-bold text-slate-700 mb-3">${label}</label>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${optsHtml}
      </div>
      ${includeCustom ? `
      <div class="custom-input-wrapper h-0 opacity-0 mt-0">
        <div class="pt-3">
          <input type="text" id="${idPrefix}-custom" placeholder="發揮創意，輸入想要的${label}..."
            class="w-full px-4 py-3 rounded-lg border border-purple-300 shadow-inner text-base focus:outline-none focus:ring-2 focus:ring-purple-500 transition placeholder:text-slate-400 bg-purple-50/50 text-purple-900 font-medium">
        </div>
      </div>` : ''}
      <input type="hidden" id="${idPrefix}" value="${optionsArr[0].v}">
    </div>
  `;
}

/**
 * 根據版型重新渲染樣式選單 UI
 */
function renderStylesUI() {
  const layout = layoutSelect.value;

  if (layout === 'single') {
    resolutionText.innerText = '解析度：1200 x 1748 px (海報)';
    stylesContainer.innerHTML = `
      <div class="bg-white p-1 rounded-xl">
        ${buildVisualHTML('outfit-0', '挑選服裝款式', OPTS.outfits)}
        <hr class="border-slate-100 my-1">
        ${buildVisualHTML('scene-0', '挑選背景場景', OPTS.scenes)}
        <hr class="border-slate-100 my-1">
        ${buildVisualHTML('pose-0', '挑選拍照姿勢', OPTS.poses)}
        <hr class="border-slate-100 my-1">
        ${buildVisualHTML('art-0', '挑選藝術風格', OPTS.arts)}
      </div>
    `;
  } else if (layout === 'four-grid') {
    resolutionText.innerText = '解析度：1200 x 1748 px (海報)';
    let tabsHtml = `<div class="flex space-x-1 p-1.5 bg-slate-100 rounded-xl mb-3 border border-slate-200/40">`;
    const gridLabels = ['左上格', '右上格', '左下格', '右下格'];
    for (let i = 0; i < 4; i++) {
      tabsHtml += `
        <button type="button" data-tab-idx="${i}" id="tab-btn-${i}" class="grid-tab-btn flex-1 text-center py-2.5 text-sm sm:text-base font-semibold rounded-lg transition-all ${i === 0 ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-950'}">
          ${gridLabels[i]}
        </button>
      `;
    }
    tabsHtml += `</div>`;

    let panelsHtml = '';
    for (let i = 0; i < 4; i++) {
      panelsHtml += `
        <div id="grid-panel-${i}" class="${i === 0 ? '' : 'hidden'} bg-white p-2 rounded-xl transition-opacity duration-200">
          <div class="text-sm font-black text-blue-600 bg-blue-50 py-3 px-4 rounded-lg flex items-center space-x-2 mb-2 border border-blue-100">
            <span class="inline-block w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
            <span>您正在設定：第 ${i + 1} 格 (${gridLabels[i]})</span>
          </div>
          ${buildVisualHTML(`outfit-${i}`, '服裝款式', OPTS.outfits)}
          <hr class="border-slate-100 my-1">
          ${buildVisualHTML(`scene-${i}`, '背景場景', OPTS.scenes)}
          <hr class="border-slate-100 my-1">
          ${buildVisualHTML(`pose-${i}`, '拍照姿勢', OPTS.poses)}
          <hr class="border-slate-100 my-1">
          ${buildVisualHTML(`art-${i}`, '藝術風格', OPTS.arts)}
        </div>
      `;
    }
    stylesContainer.innerHTML = tabsHtml + panelsHtml;
  } else if (layout === 'id-photo') {
    resolutionText.innerText = '解析度：1200 x 1748 px (標準 4:5 證件照含邊框)';
    stylesContainer.innerHTML = `
      <div class="bg-white p-2 rounded-xl transition-opacity duration-200">
        <div class="text-sm font-black text-purple-700 bg-purple-50 py-3 px-4 rounded-lg flex items-center space-x-2 mb-2 border border-purple-100">
          <span class="inline-block w-3 h-3 rounded-full bg-purple-500 animate-pulse"></span>
          <span>專業證件照模式 (自動套用嚴格的香港護照標準)</span>
        </div>
        ${buildVisualHTML('idbg-0', '證件照底色', OPTS.idBackgrounds, false)}
        <hr class="border-slate-100 my-2">
        ${buildVisualHTML('idoutfit-0', '服裝選擇 (自動轉為深色)', OPTS.idOutfits, false)}
        <div class="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 leading-relaxed">
          ⚠️ <strong>證件照 AI 限制規則已啟動：</strong><br>
          系統將強制鎖定為：正面直視鏡頭、不露齒微笑、雙眼與眉毛清晰可見、不穿著高領衣服、且臉部佔比達 70%-80%。
        </div>
      </div>
    `;
  }
}

layoutSelect.addEventListener('change', renderStylesUI);
renderStylesUI();

/**
 * 事件委託：統一處理「卡片點擊」、「自定義輸入框展開」及「四格分頁切換」
 */
stylesContainer.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('.grid-tab-btn');
  if (tabBtn) {
    const index = parseInt(tabBtn.getAttribute('data-tab-idx'), 10);
    for (let i = 0; i < 4; i++) {
      const t = document.getElementById(`tab-btn-${i}`);
      const p = document.getElementById(`grid-panel-${i}`);
      if (t && p) {
        if (i === index) {
          t.className = 'grid-tab-btn flex-1 text-center py-2.5 text-sm sm:text-base font-black rounded-lg transition-all bg-white text-blue-600 shadow-sm border border-slate-200/50';
          p.classList.remove('hidden');
        } else {
          t.className = 'grid-tab-btn flex-1 text-center py-2.5 text-sm sm:text-base font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-950 bg-transparent border border-transparent';
          p.classList.add('hidden');
        }
      }
    }
    return;
  }

  const btn = e.target.closest('.opt-btn');
  if (!btn) return;

  const group = btn.closest('.visual-group');
  const hiddenInput = group.querySelector('input[type="hidden"]');
  const customWrapper = group.querySelector('.custom-input-wrapper');
  const isCustomBtn = btn.classList.contains('custom-opt-btn');

  group.querySelectorAll('.opt-btn').forEach((b) => {
    b.classList.remove('border-blue-500', 'bg-blue-50', 'text-blue-700', 'ring-1', 'ring-blue-500', 'shadow-sm', 'border-purple-500', 'bg-purple-50', 'text-purple-700', 'ring-purple-500');
    b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
  });

  btn.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
  if (isCustomBtn) {
    btn.classList.add('border-purple-500', 'bg-purple-50', 'text-purple-700', 'ring-1', 'ring-purple-500', 'shadow-sm');
    if (customWrapper) {
      customWrapper.classList.remove('h-0', 'opacity-0');
      customWrapper.classList.add('h-[68px]', 'opacity-100');
      setTimeout(() => customWrapper.querySelector('input').focus(), 150);
    }
    hiddenInput.value = 'custom';
  } else {
    btn.classList.add('border-blue-500', 'bg-blue-50', 'text-blue-700', 'ring-1', 'ring-blue-500', 'shadow-sm');
    if (customWrapper) {
      customWrapper.classList.remove('h-[68px]', 'opacity-100');
      customWrapper.classList.add('h-0', 'opacity-0');
    }
    hiddenInput.value = btn.getAttribute('data-val');
  }
});

// 一鍵隨機抽卡功能
randomBtn.addEventListener('click', () => {
  const isFourGrid = layoutSelect.value === 'four-grid';
  const visibleGroups = stylesContainer.querySelectorAll('.visual-group');

  let uniqueArtIndices = [];
  if (isFourGrid) {
    uniqueArtIndices = pickUniqueIndices(OPTS.arts.length, 4);
  }

  visibleGroups.forEach((group) => {
    const hiddenInput = group.querySelector('input[type="hidden"]');
    const btns = group.querySelectorAll('.opt-btn:not(.custom-opt-btn)');
    let randIdx = Math.floor(Math.random() * btns.length);

    if (isFourGrid && hiddenInput && hiddenInput.id.startsWith('art-')) {
      const gridIdx = parseInt(hiddenInput.id.split('-')[1], 10);
      if (!Number.isNaN(gridIdx) && gridIdx < 4) {
        randIdx = uniqueArtIndices[gridIdx];
      }
    }

    if (btns[randIdx]) btns[randIdx].click();
  });

  randomBtn.classList.add('scale-110', 'bg-purple-300');
  setTimeout(() => randomBtn.classList.remove('scale-110', 'bg-purple-300'), 150);
});

// 圖片上傳邏輯處理
uploadBox.addEventListener('click', () => imageInput.click());
uploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadBox.classList.add('border-blue-500', 'bg-blue-50');
});
uploadBox.addEventListener('dragleave', () => {
  uploadBox.classList.remove('border-blue-500', 'bg-blue-50');
});
uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.classList.remove('border-blue-500', 'bg-blue-50');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
imageInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
});

/**
 * 處理上傳檔案：最長邊縮至 1200px，輸出 JPEG 0.85
 */
function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('請上傳正確的圖片格式！');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 1200;
      let width = img.width;
      let height = img.height;

      if (width > MAX_SIZE || height > MAX_SIZE) {
        const r = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width *= r;
        height *= r;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      userImageSrc = canvas.toDataURL('image/jpeg', 0.85);
      imagePreview.src = userImageSrc;
      imagePreview.classList.remove('hidden');
      uploadPlaceholder.classList.add('hidden');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * 智慧畫布墊白邊功能
 */
function padImageToRatio(base64, targetRatio) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const pad = computePadSize(img.width, img.height, targetRatio);
      const canvas = document.createElement('canvas');
      canvas.width = pad.width;
      canvas.height = pad.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pad.width, pad.height);
      ctx.drawImage(img, pad.x, pad.y, img.width, img.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = base64;
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 呼叫 Gemini 圖像 API（金鑰只放在標頭，不寫入網址）
 */
async function generateAIOutfitImage(base64ImageWithPrefix, config, apiKey) {
  const base64Data = base64ImageWithPrefix.split(',')[1];
  const mimeType = base64ImageWithPrefix.split(';')[0].split(':')[1] || 'image/jpeg';
  const prompt = buildPrompt(config);
  const payload = buildGeneratePayload(prompt, mimeType, base64Data);
  const url = generateContentUrl(MODEL_ID);

  const fetchWithBackoff = async (retries = 5, wait = 1000) => {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      if (retries === 0) {
        throw new Error(describeApiFailure(0, error.message, null));
      }
      await delay(wait);
      return fetchWithBackoff(retries - 1, wait * 2);
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      let json = null;
      try { json = bodyText ? JSON.parse(bodyText) : null; } catch (err) { json = null; }
      const message = describeApiFailure(response.status, bodyText, json);
      if (retries === 0 || !shouldRetryStatus(response.status)) {
        throw new Error(message);
      }
      await delay(wait);
      return fetchWithBackoff(retries - 1, wait * 2);
    }

    return response.json();
  };

  const responseJson = await fetchWithBackoff();
  const image = extractInlineImage(responseJson);
  if (!image) throw new Error(describeMissingImage(responseJson));
  return `data:${image.mimeType};base64,${image.data}`;
}

generateBtn.addEventListener('click', async () => {
  const apiKey = getStoredKey();
  if (!apiKey) {
    alert('請先在右上角「設定金鑰」貼上 Gemini API 金鑰，才能開始生成。\n可到 https://aistudio.google.com/apikey 建立金鑰。');
    keySettingsPanel.classList.remove('hidden');
    keySettingsBtn.setAttribute('aria-expanded', 'true');
    apiKeyInput.focus();
    return;
  }
  if (!userImageSrc) {
    alert('請先上傳您的照片！');
    return;
  }

  const layoutType = layoutSelect.value;
  const isFourGrid = layoutType === 'four-grid';
  const isIDPhoto = layoutType === 'id-photo';
  const totalSteps = isFourGrid ? 4 : 1;
  const recipes = buildRecipes(layoutType, getElValue);

  isGenerating = true;
  generateBtn.disabled = true;
  randomBtn.disabled = true;

  const updateBtnUI = (stepText) => {
    generateBtn.innerHTML = `
      <svg class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>${stepText}</span>
    `;
  };

  try {
    const targetRatio = posterTargetRatio(layoutType);
    const processedImageSrc = await padImageToRatio(userImageSrc, targetRatio);

    const aiGeneratedImages = [];
    for (let i = 0; i < totalSteps; i++) {
      updateBtnUI(`[${i + 1}/${totalSteps}] AI 正在重塑此格風格...`);
      const aiImg = await generateAIOutfitImage(processedImageSrc, recipes[i], apiKey);
      aiGeneratedImages.push(aiImg);
    }

    updateBtnUI('正在排版與合成高畫質海報...');

    const schoolName = schoolInput.value;
    const activityDate = dateInput.value.trim() || formattedDate;
    const finalDataUrl = await mergeOutfitPoster(aiGeneratedImages, schoolName, activityDate, layoutType, recipes);

    finalPreview.src = finalDataUrl;
    finalPreview.classList.remove('hidden');
    previewPlaceholder.classList.add('hidden');

    if (window.innerWidth < 1024) {
      document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    downloadBtn.disabled = false;
    downloadBtn.className = DOWNLOAD_READY_CLASS;
    downloadBtn.onclick = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        alert('📱 iOS / iPad 溫馨提示：\n請直接對著上方的照片「長按」，然後選擇選單中的「儲存影像」即可順利下載至相簿喔！');
      } else {
        const link = document.createElement('a');
        link.download = downloadFilename(isIDPhoto, Date.now());
        link.href = finalDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };
    hasGeneratedOnce = true;
  } catch (error) {
    console.error(error);
    alert(error.message || 'AI 生成失敗，請稍後再試。');
  } finally {
    isGenerating = false;
    randomBtn.disabled = false;
    refreshKeyUi();
    generateBtn.innerHTML = GENERATE_BTN_AGAIN_HTML;
  }
});

function getSmartWrapLines(ctx, text, maxWidth) {
  const lines = [];
  const tokens = text.match(/[\u4e00-\u9fa5]|[\u3000-\u303f]|[\uff00-\uffef]|[a-zA-Z0-9\-']+|\s+/g) || [text];
  let currentLine = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.trim() === '' && currentLine === '') continue;
    const testLine = currentLine + token;
    if (ctx.measureText(testLine).width > maxWidth) {
      if (currentLine !== '') {
        lines.push(currentLine.trim());
        currentLine = token.trim() === '' ? '' : token;
      } else {
        lines.push(testLine.trim());
        currentLine = '';
      }
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine.trim() !== '') lines.push(currentLine.trim());
  return lines;
}

function mergeOutfitPoster(imgBase64Array, schoolStr, dateStr, layoutType, recipes) {
  return new Promise((resolve, reject) => {
    const canvas = document.getElementById('hidden-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    /**
     * drawImgBlock
     * @param fitMode 'contain' (整張圖片不裁切、白底填充) 或是 'cover' (裁切填滿、無縫排列)
     */
    const drawImgBlock = (src, x, y, blockW, blockH, fitMode = 'contain') => {
      return new Promise((res, rej) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, blockW, blockH);
          ctx.clip();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, blockW, blockH);

          const ratio = img.width / img.height;
          const targetRatio = blockW / blockH;

          if (fitMode === 'cover') {
            let sx;
            let sy;
            let sw;
            let sh;
            if (ratio > targetRatio) {
              sh = img.height;
              sw = sh * targetRatio;
              sx = (img.width - sw) / 2;
              sy = 0;
            } else {
              sw = img.width;
              sh = sw / targetRatio;
              sx = 0;
              sy = (img.height - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, x, y, blockW, blockH);
          } else {
            let drawW;
            let drawH;
            let drawX;
            let drawY;
            if (ratio > targetRatio) {
              drawW = blockW;
              drawH = blockW / ratio;
              drawX = x;
              drawY = y + (blockH - drawH) / 2;
            } else {
              drawH = blockH;
              drawW = blockH * ratio;
              drawX = x + (blockW - drawW) / 2;
              drawY = y;
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          }
          ctx.restore();
          res();
        };
        img.onerror = rej;
      });
    };

    const waitForFonts = async () => {
      if (document.fonts && document.fonts.ready) {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise((res) => setTimeout(res, 1500))
          ]);
        } catch (e) { /* 字型載入失敗時改用系統字型 */ }
      }
    };

    waitForFonts().then(async () => {
      try {
        ctx.clearRect(0, 0, W, H);

        if (layoutType === 'id-photo') {
          await drawImgBlock(imgBase64Array[0], 0, 0, 1200, 1500, 'contain');

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 1500, W, H - 1500);

          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = "bold 44px 'Noto Sans TC', 'Inter', 'PingFang HK', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
          ctx.fillText(schoolStr, W / 2, 1590);

          ctx.fillStyle = '#64748b';
          ctx.font = "500 28px 'Inter', 'Noto Sans TC', 'PingFang HK', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
          ctx.fillText(`${dateStr}  |  香港護照/證件照標準 (40x50mm)`, W / 2, 1660);

          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 1500);
          ctx.lineTo(40, 1500);
          ctx.moveTo(1160, 1500);
          ctx.lineTo(1200, 1500);
          ctx.stroke();
        } else {
          if (layoutType === 'four-grid') {
            const gw = W / 2;
            const gh = H / 2;
            await drawImgBlock(imgBase64Array[0], 0, 0, gw, gh, 'cover');
            await drawImgBlock(imgBase64Array[1], gw, 0, gw, gh, 'cover');
            await drawImgBlock(imgBase64Array[2], 0, gh, gw, gh, 'cover');
            await drawImgBlock(imgBase64Array[3], gw, gh, gw, gh, 'cover');

            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.fillRect(gw, 0, gw, gh);

            ctx.fillStyle = 'rgba(200, 220, 255, 0.08)';
            ctx.fillRect(0, gh, gw, gh);

            ctx.fillStyle = 'rgba(255, 230, 200, 0.06)';
            ctx.fillRect(gw, gh, gw, gh);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.moveTo(0, gh);
            ctx.lineTo(W, gh);
            ctx.moveTo(gw, 0);
            ctx.lineTo(gw, H);
            ctx.stroke();
          } else {
            await drawImgBlock(imgBase64Array[0], 0, 0, W, H, 'contain');
          }

          const gradient = ctx.createLinearGradient(0, H - 420, 0, H);
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
          gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.6)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, H - 420, W, 420);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;

          ctx.font = "bold 44px 'Noto Sans TC', 'Inter', 'PingFang HK', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
          const schoolLines = getSmartWrapLines(ctx, schoolStr, W * 0.85);

          const areaCenter = (1420 + 1675) / 2;
          const schoolLineHeight = 55;
          const dateHeight = 35;
          const gap = 25;
          const totalTextH = (schoolLines.length * schoolLineHeight) + gap + dateHeight;
          const startY = Math.max(1420 + 15, areaCenter - (totalTextH / 2));

          ctx.font = "bold 44px 'Noto Sans TC', 'Inter', 'PingFang HK', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
          ctx.fillStyle = '#ffffff';
          const schoolY = startY + (schoolLineHeight / 2);
          schoolLines.forEach((line, idx) => {
            ctx.fillText(line, W / 2, schoolY + (idx * schoolLineHeight));
          });

          ctx.font = "700 32px 'Inter', 'Noto Sans TC', 'PingFang HK', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
          ctx.fillStyle = '#fcd34d';
          const dateY = schoolY + ((schoolLines.length - 1) * schoolLineHeight) + (schoolLineHeight / 2) + gap + (dateHeight / 2);
          ctx.fillText(dateStr, W / 2, dateY);

          const borderSize = 35;
          ctx.shadowColor = 'transparent';
          ctx.lineWidth = borderSize * 2;
          ctx.strokeStyle = '#ffffff';
          ctx.strokeRect(0, 0, W, H);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (err) {
        reject(err);
      }
    }).catch(reject);
  });
}

refreshKeyUi();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`sw.js?v=20261117a`).catch(() => {
      /* 離線快取失敗不影響主要功能 */
    });
  });
}
