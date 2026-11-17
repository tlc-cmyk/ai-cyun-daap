# AI 穿搭生成器

「AI快完美工作坊」的獨立網頁應用：上傳一張照片，即可生成穿搭海報或香港護照式證件照。學校名稱已鎖定為世界龍岡學校劉皇發中學。

線上使用：<https://tlc-cmyk.github.io/ai-cyun-daap/>

此應用以靜態網頁方式託管，不依賴工作坊執行環境，亦無需另外安裝伺服器。

## 使用方法

1. 打開上面的 GitHub Pages 連結，或本機直接打開 `index.html`（建議以 https 或本機網頁伺服器開啟，以便使用相機與離線快取）。
2. 在右上角撳「設定金鑰」，到 [Google AI Studio](https://aistudio.google.com/apikey) 建立 Gemini API 金鑰，貼上後撳「儲存金鑰」。
3. 上傳一張建議直式正面的照片（可點擊或拖曳；亦可在支援的裝置直接拍攝）。
4. 填寫活動日期（預設為今天，格式 `YYYY.MM.DD`），並選擇版型：
   - 單張海報風格
   - 四格連拍風格（四格可獨立設定；隨機抽卡時四格藝術風格不會重複）
   - 專業證件照模式
5. 挑選服裝、場景、姿勢與藝術風格（或使用「一鍵隨機抽卡」），再撳「開始 AI 智慧生成照片」。
6. 完成後可下載 JPEG。在 iPhone / iPad，請長按預覽圖，選擇「儲存影像」。

金鑰只儲存在此裝置的瀏覽器（`localStorage` 鍵名：`ai-cyun-daap-gemini-key`），可隨時更新或清除。本網站伺服器不會收到金鑰。

為加強保護，可在 Google AI Studio / Google Cloud 將金鑰限制為 HTTP 來源（HTTP referrer）：

`https://tlc-cmyk.github.io/ai-cyun-daap/`

## 私隱與費用

生成時，上傳的照片會傳送到 Google Gemini 以產生圖像。使用此功能會消耗您的 Gemini API 配額，可能產生費用，請自行留意用量與帳單。

## 加入 iPad 主畫面

1. 用 Safari 打開上述網址。
2. 撳分享按鈕，選擇「加到主畫面」。
3. 確認名稱後加入。之後可以像獨立應用程式一樣全螢幕開啟。

## 本機測試

```bash
node test-app.mjs
```

無需安裝依賴。測試只檢查程式邏輯與原始檔內容，不會連外網，亦不會讀取任何金鑰。

## 授權

以 [CC0 1.0](LICENSE) 奉獻至公有領域。
