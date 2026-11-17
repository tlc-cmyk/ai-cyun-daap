/**
 * AI 穿搭生成器 — 可共用、可測試的純邏輯
 * 不含 API 金鑰，亦不會寫入任何秘密。
 */

export const STORAGE_KEY = 'ai-cyun-daap-gemini-key';

/** 官方 Nano Banana 2.1 模型（圖像生成與對話式編輯） */
export const MODEL_ID = 'gemini-nano-banana-2.1';

export const MODEL_LABEL = 'Nano Banana 2.1';

export const SCHOOL_NAME = '世界龍岡學校劉皇發中學';

export const GEMINI_ENDPOINT_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';

export const OPTS = {
  outfits: [
    { v: '美式復古學院風', i: '🎓' }, { v: '日系簡約工裝風', i: '🏕️' },
    { v: '韓系俐落西裝風', i: '👔' }, { v: '未來科技機能風', i: '🤖' },
    { v: '優雅法式浪漫風', i: '🌹' }, { v: '街頭嘻哈潮流風', i: '🛹' },
    { v: '新年服裝', i: '🧧' }, { v: '王子', i: '👑' },
    { v: '公主', i: '👸' }, { v: '女僕', i: '🎀' },
    { v: '執事', i: '🤵' }, { v: '正式西裝', i: '🕴️' },
    { v: '畢業袍', i: '📜' }, { v: '民初', i: '🪭' }
  ],
  scenes: [
    { v: '霓虹賽博街頭', i: '🌃' }, { v: '陽光森系花園', i: '🌲' },
    { v: '簡約藝廊空間', i: '🖼️' }, { v: '復古黑膠唱片行', i: '📀' },
    { v: '午後露天咖啡座', i: '☕' }, { v: '未來科幻都市', i: '🛸' },
    { v: '日式櫻花神社', i: '⛩️' }, { v: '歐洲復古小鎮', i: '🏰' },
    { v: '圖書館書海', i: '📚' }, { v: '加州海灘夕陽', i: '🌅' },
    { v: '冰雪極地世界', i: '❄️' }, { v: '神秘魔法森林', i: '🍄' },
    { v: '繁華時代廣場', i: '🏙️' }, { v: '寧靜湖畔小屋', i: '🏕️' }
  ],
  poses: [
    { v: '自信正面抱胸', i: '🙅' }, { v: '回眸隨性微笑', i: '😏' },
    { v: '時尚插口袋', i: '🧍' }, { v: '單手輕托下巴', i: '🤔' },
    { v: '動感步行姿態', i: '🚶' }, { v: '酷帥側身站立', i: '🤺' },
    { v: '自拍', i: '🤳' }, { v: '跳躍瞬間', i: '🤸' },
    { v: '心形手勢', i: '🫶' }, { v: '拜年手勢', i: '🙏' }
  ],
  arts: [
    { v: '寫實人像攝影', i: '📷' }, { v: '新海誠動漫風', i: '✨' },
    { v: '美式復古插畫', i: '🎨' }, { v: '立體 3D 渲染', i: '🧊' },
    { v: '經典水彩渲染', i: '🖌️' }, { v: '賽博龐克風格', i: '⚡' },
    { v: '復古底片攝影', i: '🎞️' }, { v: '印象派油畫', i: '🖼️' },
    { v: '復古像素藝術', i: '👾' }, { v: '黑白炭筆素描', i: '✏️' },
    { v: '美式普普藝術', i: '💥' }, { v: '奇幻超現實', i: '🌌' },
    { v: '皮克斯 3D 風', i: '🧸' }, { v: '蒸氣龐克風', i: '⚙️' },
    { v: '精緻紙雕藝術', i: '📄' }, { v: '塔羅牌插畫', i: '🃏' }
  ],
  idBackgrounds: [
    { v: '純白底色 (標準)', i: '⬜' }, { v: '淺藍底色', i: '🟦' }, { v: '淺灰底色', i: '⬛' }
  ],
  idOutfits: [
    { v: '黑色正式西裝', i: '👔' }, { v: '深藍商務襯衫', i: '👔' },
    { v: '深色圓領衫', i: '👕' }, { v: '保留原始服裝', i: '📸' }
  ]
};

export function formatActivityDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export function downloadFilename(isIDPhoto, now = Date.now()) {
  return isIDPhoto ? `LWFSS_IDPhoto_${now}.jpg` : `LWFSS_Outfit_${now}.jpg`;
}

export function generateContentUrl(modelId = MODEL_ID) {
  return `${GEMINI_ENDPOINT_BASE}/${modelId}:generateContent`;
}

/**
 * 將來源圖墊白邊至目標高寬比時，畫布與置中位置的計算。
 * targetRatio 為 高 / 寬。
 */
export function computePadSize(width, height, targetRatio) {
  let tw = width;
  let th = height;
  if (height / width < targetRatio) {
    th = width * targetRatio;
  } else {
    tw = height / targetRatio;
  }
  return {
    width: tw,
    height: th,
    x: (tw - width) / 2,
    y: (th - height) / 2
  };
}

export function posterTargetRatio(layoutType) {
  return layoutType === 'id-photo' ? (1500 / 1200) : (1748 / 1200);
}

/**
 * 讀取某一類選項的實際值（含自定義輸入）。
 * getElValue(id) 回傳該元素的 value；找不到則回傳空字串。
 */
export function readOptionValue(getElValue, cat, idx) {
  const val = getElValue(`${cat}-${idx}`) || '';
  if (val === 'custom') {
    return (getElValue(`${cat}-${idx}-custom`) || '').trim() || '無特別指定';
  }
  return val;
}

export function buildRecipes(layoutType, getElValue) {
  const isFourGrid = layoutType === 'four-grid';
  const isIDPhoto = layoutType === 'id-photo';
  const totalSteps = isFourGrid ? 4 : 1;
  const recipes = [];
  for (let i = 0; i < totalSteps; i++) {
    if (isIDPhoto) {
      recipes.push({
        bg: readOptionValue(getElValue, 'idbg', 0),
        outfit: readOptionValue(getElValue, 'idoutfit', 0),
        layout: 'id-photo'
      });
    } else {
      recipes.push({
        outfit: readOptionValue(getElValue, 'outfit', i),
        scene: readOptionValue(getElValue, 'scene', i),
        pose: readOptionValue(getElValue, 'pose', i),
        art: readOptionValue(getElValue, 'art', i),
        layout: layoutType
      });
    }
  }
  return recipes;
}

export function buildPrompt(config) {
  if (config.layout === 'id-photo') {
    return `You are a professional passport and ID photo AI generator. Transform the provided photo into a strict standard Hong Kong ID photo (4:5 vertical proportion).
Requirements:
1. Exact facial identity MUST be preserved with 100% accuracy.
2. Background: STRICTLY solid plain ${config.bg} color. Absolutely NO gradients, NO shadows behind the person.
3. Outfit: ${config.outfit}. MUST be dark-colored. STRICTLY NO high-collar clothes.
4. Face: Front-facing, straight shoulders. Natural neutral expression, mouth completely closed (no teeth showing), eyes open looking straight at the camera. Hair tucked behind ears, showing eyebrows and ears clearly. Light natural makeup only.
5. Composition: The head (from chin to top of hair) MUST occupy exactly 75% of the image height. Leave standard empty space above the head.
6. The input is padded. You MUST outpaint and fill the entire 4:5 vertical canvas seamlessly. No white borders.`;
  }
  return `You are a professional fashion AI generator. Please transform the provided person's photo based on the following attributes:
- Outfit Style: ${config.outfit}
- Scene Background: ${config.scene}
- Pose: ${config.pose}
- Art Style: ${config.art}

Requirements:
1. VERY IMPORTANT: Retain the person's exact facial identity and core features from the source photo.
2. Change clothing to match "${config.outfit}".
3. Change background to "${config.scene}".
4. Adjust body pose to represent "${config.pose}".
5. Apply artistic style of "${config.art}".
6. CRITICAL: The input image has been padded with white borders to a vertical portrait aspect ratio. You MUST fully extend the scene and outpaint to COMPLETELY FILL the vertical canvas. DO NOT leave any solid white borders in your output.
7. STRICTLY output a vertical portrait image.`;
}

export function buildGeneratePayload(prompt, mimeType, base64Data) {
  return {
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
  };
}

export function pickUniqueIndices(length, count, random = Math.random) {
  const all = Array.from({ length }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, Math.min(count, length));
}

export function extractInlineImage(responseJson) {
  const parts = responseJson?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const part = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  const data = part?.inlineData?.data || part?.inline_data?.data;
  const mime = part?.inlineData?.mimeType || part?.inline_data?.mime_type || 'image/png';
  if (!data) return null;
  return { data, mimeType: mime };
}

export function shortApiMessage(bodyText, json) {
  const msg = json?.error?.message || json?.error?.status || '';
  if (msg) {
    const oneLine = String(msg).replace(/\s+/g, ' ').trim();
    return oneLine.length > 180 ? `${oneLine.slice(0, 177)}…` : oneLine;
  }
  if (bodyText) {
    const oneLine = String(bodyText).replace(/\s+/g, ' ').trim();
    return oneLine.length > 180 ? `${oneLine.slice(0, 177)}…` : oneLine;
  }
  return '';
}

/**
 * 將 HTTP 狀態與 API 回應轉成繁體中文錯誤說明。
 * 金鑰問題不會被包裝成泛稱「連線問題」。
 */
export function describeApiFailure(status, bodyText, json) {
  const detail = shortApiMessage(bodyText, json);
  const suffix = detail ? ` ${detail}` : '';
  if (status === 400) {
    return `請求無效（HTTP 400）。${suffix}`.trim();
  }
  if (status === 401 || status === 403) {
    return `API 金鑰無效或沒有權限（HTTP ${status}）。請檢查金鑰是否正確、是否已啟用 Gemini API，以及是否受到來源限制。${suffix}`.trim();
  }
  if (status === 404) {
    return `找不到指定的模型或端點（HTTP 404）。${suffix}`.trim();
  }
  if (status === 429) {
    return `請求過於頻繁或配額已用完（HTTP 429）。請稍後再試，或檢查 Google AI Studio 的用量。${suffix}`.trim();
  }
  if (status >= 500) {
    return `Google 伺服器暫時未能處理請求（HTTP ${status}）。請稍後再試。${suffix}`.trim();
  }
  if (status > 0) {
    return `生成失敗（HTTP ${status}）。${suffix}`.trim();
  }
  return detail ? `無法連線到 Gemini：${detail}` : '無法連線到 Gemini，請檢查網絡後再試。';
}

export function describeMissingImage(responseJson) {
  const candidate = responseJson?.candidates?.[0];
  const finish = candidate?.finishReason || candidate?.finish_reason || '';
  const textPart = candidate?.content?.parts?.find((p) => p.text)?.text;
  const promptFeedback = responseJson?.promptFeedback?.blockReason
    || responseJson?.promptFeedback?.block_reason
    || '';
  const bits = [];
  if (finish) bits.push(`結束原因：${finish}`);
  if (promptFeedback) bits.push(`封鎖原因：${promptFeedback}`);
  if (textPart) {
    const oneLine = String(textPart).replace(/\s+/g, ' ').trim();
    bits.push(oneLine.length > 160 ? `${oneLine.slice(0, 157)}…` : oneLine);
  }
  if (bits.length) {
    return `API 未返回圖片資料（${bits.join('；')}）`;
  }
  return 'API 未返回圖片資料';
}

export function shouldRetryStatus(status) {
  return status === 429 || status >= 500;
}

export function isLikelyApiKey(value) {
  const v = (value || '').trim();
  return v.length >= 20 && !/\s/.test(v);
}
