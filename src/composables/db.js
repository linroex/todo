// 以 IndexedDB 作為 key-value 儲存層，取代原本的 localStorage。
// 沿用原本的 storage key 當作 IndexedDB 內的 key，業務邏輯不需改動。

const DB_NAME = 'todo-app'
const DB_VERSION = 1
const STORE = 'kv'

// 共用的 storage key，IndexedDB 與遷移流程都從這裡取用，避免在多處重複宣告
export const STORAGE_KEYS = {
  lists: 'todo-app-lists',
  todos: 'todo-app-todos',
  hideCompleted: 'todo-app-hide-completed',
}

// 標記遷移是否已完成（存在 IndexedDB），避免依賴某個資料 key 是否存在來判斷
export const MIGRATED_FLAG = 'todo-app-migrated'

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('此環境不支援 IndexedDB'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function idbGet(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbSet(key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    // 存入純物件，避免 Vue reactive proxy 造成 structured clone 問題
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
