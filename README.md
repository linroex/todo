# Todo

一個使用 Vue 3 + Element Plus 打造的待辦事項管理應用，資料儲存於瀏覽器 localStorage。

## 功能

- **多清單管理** — 建立多個清單，側邊欄快速切換
- **拖曳操作** — 拖曳排序 todo，支援跨清單移動
- **詳細資訊** — 每個 todo 可設定執行日期、截止日、標籤、備註
- **日曆檢視** — 以日曆方式瀏覽排程
- **篩選** — 依狀態（今日執行、今日到期、已逾期等）及標籤篩選
- **到期提醒** — 開啟時自動通知逾期及今日到期項目

## 開始使用

```bash
npm install
npm run dev
```

開啟 http://localhost:5173 即可使用。

## 建置

```bash
npm run build
```

產出位於 `dist/` 目錄，可直接部署為靜態網站。

## 技術

- [Vue 3](https://vuejs.org/) (Composition API)
- [Element Plus](https://element-plus.org/)
- [Vite](https://vite.dev/)
