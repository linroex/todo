// 從舊的 localStorage 自動遷移到 IndexedDB：
// 1. 偵測 localStorage 是否有舊資料
// 2. 自動下載一份 JSON 備份
// 3. 寫入 IndexedDB
// 4. 備份成功後清掉舊的 localStorage keys
//
// 用一個獨立的 MIGRATED_FLAG 來判斷是否已遷移，避免依賴某個資料 key 是否存在
// （否則 lists 缺失時會每次開啟都重跑遷移、重複下載備份）。

import { idbGet, idbSet, STORAGE_KEYS, MIGRATED_FLAG } from './db.js'

const ALL_KEYS = Object.values(STORAGE_KEYS)

function localGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function parse(raw, fallback) {
  if (raw == null) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

// 自動下載備份檔，回傳是否成功
function downloadBackup(payload) {
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    a.href = url
    a.download = `todo-app-backup-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // 延遲釋放，確保下載已觸發
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch (e) {
    console.error('[migrate] 備份下載失敗', e)
    return false
  }
}

// 回傳 true 表示有執行遷移
export async function migrateFromLocalStorage() {
  // 已遷移過就直接略過
  const migrated = await idbGet(MIGRATED_FLAG)
  if (migrated) return false

  const rawLists = localGet(STORAGE_KEYS.lists)
  const rawTodos = localGet(STORAGE_KEYS.todos)
  const rawHide = localGet(STORAGE_KEYS.hideCompleted)

  // localStorage 沒有任何舊資料（全新使用者），標記為已遷移就好
  if (rawLists == null && rawTodos == null && rawHide == null) {
    await idbSet(MIGRATED_FLAG, true)
    return false
  }

  const lists = parse(rawLists, null)
  const todos = parse(rawTodos, null)
  const hideCompleted = parse(rawHide, null)

  // 1. 備份：自動下載 JSON
  const backedUp = downloadBackup({
    app: 'todo-app',
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      [STORAGE_KEYS.lists]: lists,
      [STORAGE_KEYS.todos]: todos,
      [STORAGE_KEYS.hideCompleted]: hideCompleted,
    },
  })

  // 2. 寫入 IndexedDB（只搬有值的 key），全部成功後才標記/清理
  const writes = []
  if (lists != null) writes.push(idbSet(STORAGE_KEYS.lists, lists))
  if (todos != null) writes.push(idbSet(STORAGE_KEYS.todos, todos))
  if (hideCompleted != null) writes.push(idbSet(STORAGE_KEYS.hideCompleted, hideCompleted))
  await Promise.all(writes)

  // 3. cleanup：備份成功才標記完成並刪除舊資料；
  //    備份失敗則保留 localStorage 與未標記狀態，下次開啟會再嘗試備份
  if (backedUp) {
    await idbSet(MIGRATED_FLAG, true)
    ALL_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    })
  } else {
    console.warn('[migrate] 備份未成功，保留 localStorage 舊資料，下次開啟再試')
  }

  return true
}
