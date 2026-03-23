# Todo App

Vue 3 + Element Plus + Vite 待辦事項管理應用，資料儲存於瀏覽器 localStorage。

## 技術棧

- Vue 3 (Composition API, `<script setup>`)
- Element Plus UI + @element-plus/icons-vue
- Vite 7，build 輸出 IIFE 格式（支援 file:// 開啟）
- 無路由、無 Pinia/Vuex，狀態透過模組級 reactive 共享

## 專案結構

```
src/
  main.js                    # 入口，掛載 ElementPlus 及所有 icons
  App.vue                    # 根元件，view 切換 (list/calendar/today/search) + 啟動通知
  styles/main.css            # 全域 CSS（CSS 變數、sidebar、todo-item 等）
  composables/useStore.js    # 核心狀態管理 & 所有業務邏輯
  components/
    Sidebar.vue              # 側邊欄：清單 CRUD、跨清單拖放
    TodoList.vue             # 清單視圖：篩選/排序/標籤過濾、拖曳排序、鍵盤導航
    TodoItem.vue             # 單一 todo：勾選/行內編輯/展開詳情/拖曳
    TodoDetail.vue           # 展開面板：備註、日期選擇、標籤編輯
    CalendarView.vue         # 日曆視圖：el-calendar + 日期標記點
    TodayView.vue            # 今日待辦聚合視圖
    SearchView.vue           # 跨清單搜尋視圖：搜尋標題/備註/標籤
```

## 關鍵設計

- `useStore.js` 是唯一的狀態來源，用 `reactive()` + `watch()` 自動同步 localStorage
- localStorage keys: `todo-app-lists`, `todo-app-todos`
- Todo 結構: id, listId, title, note, completed, completedAt, scheduledDate, dueDate, tags[], order, createdAt
- List 結構: id, name, order
- 拖曳使用原生 HTML5 Drag & Drop API
- 鍵盤快捷鍵在 TodoList 的 container keydown 中處理

## 指令

```bash
npm run dev      # 開發伺服器 (localhost:5173)
npm run build    # 建置到 dist/
npm run preview  # 預覽建置結果
```

## 慣例

- 語言：繁體中文 UI
- 元件皆使用 `<script setup>` 單檔元件
- 樣式集中在 src/styles/main.css，元件無 scoped style

## 工作流程

- 直接在 main 上 commit 即可，不需開 branch 或 PR
- 收到需求後，先派 PM agent 釐清需求並產出具體 spec
- PM agent 只向使用者確認真正關鍵的問題（影響核心體驗或有多種合理方向的決策），其餘細節自行判斷決定
- PM agent 的 spec 要呈現給使用者確認後才進入開發
- Main agent 根據確認後的 spec 進行開發
- 每次變更完成後，派 Review agent 做 code review
- Review 結果回報給 main agent，由 main agent 修正問題
- 開發完成後執行 `npm run build` 確認建置成功
