import { reactive, ref, watch, computed } from 'vue'

const STORAGE_KEY_LISTS = 'todo-app-lists'
const STORAGE_KEY_TODOS = 'todo-app-todos'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const defaultList = { id: crypto.randomUUID(), name: '我的清單', order: 0 }

const state = reactive({
  lists: loadJSON(STORAGE_KEY_LISTS, [defaultList]),
  todos: loadJSON(STORAGE_KEY_TODOS, []),
  activeListId: null,
  filter: 'all', // 'all' | 'scheduled-today' | 'due-today' | 'overdue' | 'has-scheduled' | 'has-due'
  sort: 'order', // 'order' | 'scheduled-asc' | 'scheduled-desc' | 'due-asc' | 'due-desc'
  tagFilter: null, // null = all, or a tag string
  view: 'list', // 'list' | 'calendar' | 'today' | 'weekly-review'
})

// Initialize activeListId
state.activeListId = state.lists.length > 0 ? state.lists[0].id : null

// Persist to localStorage
watch(() => state.lists, (val) => {
  localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(val))
}, { deep: true, immediate: true })

watch(() => state.todos, (val) => {
  localStorage.setItem(STORAGE_KEY_TODOS, JSON.stringify(val))
}, { deep: true, immediate: true })

export function useStore() {
  // --- Computed ---
  const sortedLists = computed(() =>
    [...state.lists].sort((a, b) => a.order - b.order)
  )

  const activeList = computed(() =>
    state.lists.find((l) => l.id === state.activeListId) || null
  )

  const today = computed(() => new Date().toISOString().slice(0, 10))

  const activeTodos = computed(() => {
    let base = state.todos
      .filter((t) => t.listId === state.activeListId)
      .sort((a, b) => a.order - b.order)

    const d = today.value
    switch (state.filter) {
      case 'scheduled-today':
        base = base.filter((t) => t.scheduledDate === d); break
      case 'due-today':
        base = base.filter((t) => t.dueDate === d); break
      case 'overdue':
        base = base.filter((t) => t.dueDate && t.dueDate < d && !t.completed); break
      case 'has-scheduled':
        base = base.filter((t) => t.scheduledDate); break
      case 'has-due':
        base = base.filter((t) => t.dueDate); break
    }

    if (state.tagFilter) {
      base = base.filter((t) => t.tags && t.tags.includes(state.tagFilter))
    }

    if (state.sort !== 'order') {
      const [field, dir] = state.sort.split('-')
      const key = field === 'scheduled' ? 'scheduledDate' : 'dueDate'
      const mul = dir === 'asc' ? 1 : -1
      base = [...base].sort((a, b) => {
        const da = a[key] || ''
        const db = b[key] || ''
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return (da < db ? -1 : da > db ? 1 : 0) * mul
      })
    }

    return base
  })

  const activeListTags = computed(() => {
    const tags = new Set()
    state.todos
      .filter((t) => t.listId === state.activeListId)
      .forEach((t) => { if (t.tags) t.tags.forEach((tag) => tags.add(tag)) })
    return [...tags].sort()
  })

  const allTodosWithDates = computed(() =>
    state.todos.filter((t) => t.scheduledDate || t.dueDate)
  )

  const todayTodos = computed(() => {
    const d = today.value
    return state.todos
      .filter((t) => !t.completed && (t.scheduledDate === d || t.dueDate === d))
      .sort((a, b) => a.order - b.order)
  })

  // --- View ---
  function setView(v) {
    state.view = v
  }

  function getTodosByDate(dateStr) {
    return state.todos.filter(
      (t) => t.scheduledDate === dateStr || t.dueDate === dateStr
    )
  }

  function getListName(listId) {
    const list = state.lists.find((l) => l.id === listId)
    return list ? list.name : ''
  }

  // --- Notifications ---
  function getNotifications() {
    const d = new Date().toISOString().slice(0, 10)
    const overdue = state.todos.filter((t) => t.dueDate && t.dueDate < d && !t.completed)
    const dueToday = state.todos.filter((t) => t.dueDate === d && !t.completed)
    const scheduledToday = state.todos.filter((t) => t.scheduledDate === d && !t.completed)
    return { overdue, dueToday, scheduledToday }
  }

  function setFilter(filter) {
    state.filter = filter
    state.sort = 'order'
  }

  function setSort(sort) {
    state.sort = sort
  }

  function setTagFilter(tag) {
    state.tagFilter = state.tagFilter === tag ? null : tag
  }

  function moveTodoToList(todoId, listId) {
    const todo = state.todos.find((t) => t.id === todoId)
    if (!todo || todo.listId === listId) return
    todo.listId = listId
    // Put at the top of the target list
    const targetTodos = state.todos.filter((t) => t.listId === listId)
    targetTodos.forEach((t) => { t.order += 1 })
    todo.order = 0
  }

  // --- List CRUD ---
  function addList(name) {
    const maxOrder = state.lists.reduce((max, l) => Math.max(max, l.order), -1)
    const list = { id: crypto.randomUUID(), name, order: maxOrder + 1 }
    state.lists.push(list)
    state.activeListId = list.id
    return list
  }

  function renameList(id, name) {
    const list = state.lists.find((l) => l.id === id)
    if (list) list.name = name
  }

  function deleteList(id) {
    const idx = state.lists.findIndex((l) => l.id === id)
    if (idx === -1) return
    state.lists.splice(idx, 1)
    // Remove all todos in this list
    state.todos = state.todos.filter((t) => t.listId !== id)
    // Switch active list
    if (state.activeListId === id) {
      state.activeListId = state.lists.length > 0 ? state.lists[0].id : null
    }
  }

  function setActiveList(id) {
    state.activeListId = id
    state.filter = 'all'
    state.sort = 'order'
    state.tagFilter = null
  }

  // --- Todo CRUD ---
  function addTodo(title) {
    if (!state.activeListId) return null
    // Shift existing todos down
    state.todos
      .filter((t) => t.listId === state.activeListId)
      .forEach((t) => { t.order += 1 })
    const todo = {
      id: crypto.randomUUID(),
      listId: state.activeListId,
      title,
      note: '',
      completed: false,
      completedAt: null,
      scheduledDate: null,
      dueDate: null,
      tags: [],
      order: 0,
      createdAt: new Date().toISOString(),
    }
    state.todos.push(todo)
    return todo
  }

  function addTodoAfter(afterId, title) {
    if (!state.activeListId) return null
    const listTodos = state.todos
      .filter((t) => t.listId === state.activeListId)
      .sort((a, b) => a.order - b.order)
    const afterIndex = listTodos.findIndex((t) => t.id === afterId)
    // Shift order of all todos after the target
    const insertOrder = afterIndex !== -1 ? listTodos[afterIndex].order + 0.5 : 0
    const todo = {
      id: crypto.randomUUID(),
      listId: state.activeListId,
      title,
      note: '',
      completed: false,
      completedAt: null,
      scheduledDate: null,
      dueDate: null,
      tags: [],
      order: insertOrder,
      createdAt: new Date().toISOString(),
    }
    state.todos.push(todo)
    // Re-normalize order
    const sorted = state.todos
      .filter((t) => t.listId === state.activeListId)
      .sort((a, b) => a.order - b.order)
    sorted.forEach((t, i) => { t.order = i })
    return todo
  }

  function updateTodo(id, updates) {
    const todo = state.todos.find((t) => t.id === id)
    if (todo) Object.assign(todo, updates)
  }

  function deleteTodo(id) {
    const idx = state.todos.findIndex((t) => t.id === id)
    if (idx !== -1) state.todos.splice(idx, 1)
  }

  function toggleTodo(id) {
    const todo = state.todos.find((t) => t.id === id)
    if (!todo) return
    todo.completed = !todo.completed
    todo.completedAt = todo.completed ? new Date().toISOString() : null

    // When completed, move to bottom of the list
    if (todo.completed) {
      const siblings = state.todos.filter((t) => t.listId === todo.listId)
      const maxOrder = Math.max(...siblings.map((t) => t.order))
      todo.order = maxOrder + 1
    }
  }

  // --- Reorder ---
  function reorderTodos(fromIndex, toIndex) {
    const filtered = activeTodos.value
    if (fromIndex < 0 || fromIndex >= filtered.length) return
    if (toIndex < 0 || toIndex >= filtered.length) return
    if (fromIndex === toIndex) return

    // Work with all todos in the active list, sorted by order
    const allInList = state.todos
      .filter((t) => t.listId === state.activeListId)
      .sort((a, b) => a.order - b.order)

    // Find the actual positions in the full list
    const movedTodo = filtered[fromIndex]
    const targetTodo = filtered[toIndex]
    const fullFromIndex = allInList.findIndex((t) => t.id === movedTodo.id)
    const fullToIndex = allInList.findIndex((t) => t.id === targetTodo.id)

    // Reorder in the full list
    const ids = allInList.map((t) => t.id)
    const [movedId] = ids.splice(fullFromIndex, 1)
    ids.splice(fullToIndex, 0, movedId)

    // Reassign order values for all todos in the list
    ids.forEach((id, i) => {
      const todo = state.todos.find((t) => t.id === id)
      if (todo) todo.order = i
    })
  }

  // --- Weekly Review ---
  function getWeekRange(offset) {
    const now = new Date()
    const day = now.getDay() // 0=Sun, 1=Mon, ...
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday + offset * 7)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${dd}`
    }
    return { start: fmt(monday), end: fmt(sunday) }
  }

  function getCompletedInWeek(weekStart, weekEnd) {
    return state.todos
      .filter((t) => {
        if (!t.completed || !t.completedAt) return false
        const d = t.completedAt.slice(0, 10)
        return d >= weekStart && d <= weekEnd
      })
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  }

  return {
    state,
    sortedLists,
    activeList,
    activeTodos,
    activeListTags,
    allTodosWithDates,
    todayTodos,
    addList,
    renameList,
    deleteList,
    setActiveList,
    setView,
    getTodosByDate,
    getListName,
    addTodo,
    addTodoAfter,
    updateTodo,
    deleteTodo,
    toggleTodo,
    reorderTodos,
    setFilter,
    setSort,
    setTagFilter,
    moveTodoToList,
    getNotifications,
    getWeekRange,
    getCompletedInWeek,
  }
}
