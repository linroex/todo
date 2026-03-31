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

## Issue 驅動開發

透過 GitHub Issue + Label 驅動自動化開發流程。

### 流程

1. **建立 Issue** — 描述需求
2. **加上 `plan` label** — Claude 自動分析需求，回覆規劃方案到 Issue
3. **討論** — 在 Issue comment 中 `@claude` 可與 Claude 討論、調整方案
4. **加上 `approved` label** — Claude 自動建立 branch、開發、建置驗證、開 PR
5. **Review & Merge** — 人工審查 PR 後合併，Issue 自動關閉

### Labels

| Label | 何時加 | 效果 |
|-------|--------|------|
| `plan` | Issue 需求寫好，想讓 Claude 規劃時 | Claude 分析需求並回覆規劃 comment |
| `approved` | 規劃討論完成，確認可以開發時 | Claude 建立 `issue-<number>` branch 並開始實作，完成後自動開 PR |
| `in-progress` | （自動）approved 觸發後 | 標記 Issue 正在開發中 |
| `pr-created` | （自動）PR 合併後 | 標記 Issue 已完成 |

> 草稿 Issue 不需要加任何 label，Claude 不會處理。

### 預覽

每個 feature branch 推送後會自動部署預覽版本：

```
https://linroex.github.io/todo/preview/issue-<number>/
```

PR 合併或 branch 刪除後，預覽會自動清理。

## 技術

- [Vue 3](https://vuejs.org/) (Composition API)
- [Element Plus](https://element-plus.org/)
- [Vite](https://vite.dev/)
