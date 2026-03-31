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

const STORAGE_KEY_HIDE_COMPLETED = 'todo-app-hide-completed'

const state = reactive({
  lists: loadJSON(STORAGE_KEY_LISTS, [defaultList]),
  todos: loadJSON(STORAGE_KEY_TODOS, []),
  activeListId: null,
  filter: 'all', // 'all' | 'scheduled-today' | 'due-today' | 'overdue' | 'has-scheduled' | 'has-due'
  sort: 'order', // 'order' | 'scheduled-asc' | 'scheduled-desc' | 'due-asc' | 'due-desc'
  tagFilter: null, // null = all, or a tag string
  view: 'list', // 'list' | 'calendar' | 'today' | 'weekly-review' | 'search' | 'change'
  changeStatusFilter: 'all', // 'all' | 'unscheduled' | 'scheduled' | 'reported' | 'done'
  searchQuery: '',
  hideFutureTodos: false,
  hideCompleted: loadJSON(STORAGE_KEY_HIDE_COMPLETED, false),
})

// Migrate old lowercase week codes to uppercase
state.todos.forEach((t) => {
  if (t.changeWeek && t.changeWeek.startsWith('w')) {
    t.changeWeek = 'W' + t.changeWeek.slice(1)
  }
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

watch(() => state.hideCompleted, (val) => {
  localStorage.setItem(STORAGE_KEY_HIDE_COMPLETED, JSON.stringify(val))
})

// --- Week Code Utilities ---
function getWeekCode(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  const year = d.getUTCFullYear() - 2020
  return `W${year}${String(weekNo).padStart(2, '0')}`
}

function parseWeekCode(code) {
  const match = code.match(/^W(\d+)(\d{2})$/)
  if (!match) return null
  const year = parseInt(match[1]) + 2020
  const week = parseInt(match[2])
  // Find the Monday of ISO week
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayNum = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - dayNum + 1 + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmt = (d) => {
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    return `${m}/${dd}`
  }
  return { start: fmt(monday), end: fmt(sunday), code }
}

function getWeekOptions() {
  const options = []
  const now = new Date()
  for (let offset = -2; offset <= 8; offset++) {
    const d = new Date(now)
    d.setDate(d.getDate() + offset * 7)
    const code = getWeekCode(d)
    const parsed = parseWeekCode(code)
    if (parsed) {
      options.push({ value: code, label: `${code}（${parsed.start} - ${parsed.end}）` })
    }
  }
  // Deduplicate
  const seen = new Set()
  return options.filter((o) => {
    if (seen.has(o.value)) return false
    seen.add(o.value)
    return true
  })
}

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

    if (state.hideCompleted) {
      base = base.filter((t) => !t.completed)
    }

    if (state.hideFutureTodos && state.filter === 'all') {
      base = base.filter((t) => !t.scheduledDate || t.scheduledDate <= d || t.completed)
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

  const futureTodoCount = computed(() => {
    const d = today.value
    return state.todos.filter((t) => t.listId === state.activeListId && t.scheduledDate && t.scheduledDate > d && !t.completed).length
  })

  const hasFutureTodos = computed(() => futureTodoCount.value > 0)

  function toggleHideFutureTodos() {
    state.hideFutureTodos = !state.hideFutureTodos
  }

  const completedTodoCount = computed(() => {
    return state.todos.filter((t) => t.listId === state.activeListId && t.completed).length
  })

  const hasCompletedTodos = computed(() => completedTodoCount.value > 0)

  function toggleHideCompleted() {
    state.hideCompleted = !state.hideCompleted
  }

  const activeListTags = computed(() => {
    const tags = new Set()
    state.todos
      .filter((t) => t.listId === state.activeListId)
      .forEach((t) => { if (t.tags) t.tags.forEach((tag) => tags.add(tag)) })
    return [...tags].sort()
  })

  const allTodosWithDates = computed(() =>
    state.todos.filter((t) => (t.scheduledDate || t.dueDate) && (!state.hideCompleted || !t.completed))
  )

  const searchResults = computed(() => {
    const q = state.searchQuery.trim().toLowerCase()
    if (!q) return []
    const listIds = new Set(state.lists.map((l) => l.id))
    const matched = state.todos.filter((t) => {
      if (!listIds.has(t.listId)) return false
      if (state.hideCompleted && t.completed) return false
      if (t.title && t.title.toLowerCase().includes(q)) return true
      if (t.note && t.note.toLowerCase().includes(q)) return true
      if (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q))) return true
      return false
    })
    const groups = {}
    matched.forEach((t) => {
      if (!groups[t.listId]) {
        groups[t.listId] = {
          listId: t.listId,
          listName: state.lists.find((l) => l.id === t.listId)?.name || '',
          todos: [],
        }
      }
      groups[t.listId].todos.push(t)
    })
    return Object.values(groups).map((g) => ({
      ...g,
      todos: [...g.todos].sort((a, b) => a.order - b.order),
    }))
  })

  function setSearchQuery(query) {
    state.searchQuery = query
  }

  const todayTodos = computed(() => {
    const d = today.value
    return state.todos
      .filter((t) => !t.completed && (t.scheduledDate === d || t.dueDate === d))
      .sort((a, b) => {
        const ao = (a.todayOrder && a.todayOrder.date === d) ? a.todayOrder.order : Infinity
        const bo = (b.todayOrder && b.todayOrder.date === d) ? b.todayOrder.order : Infinity
        if (ao !== bo) return ao - bo
        return a.order - b.order
      })
  })

  // --- Change ---
  const changeTodos = computed(() => {
    let base = state.todos.filter((t) => t.isChange)
    if (state.changeStatusFilter !== 'all') {
      base = base.filter((t) => t.changeStatus === state.changeStatusFilter)
    }
    return base.sort((a, b) => {
      if (!a.changeWeek && b.changeWeek) return -1
      if (a.changeWeek && !b.changeWeek) return 1
      if (a.changeWeek && b.changeWeek) return b.changeWeek.localeCompare(a.changeWeek)
      return a.order - b.order
    })
  })

  const changeTodoGroups = computed(() => {
    const groups = {}
    changeTodos.value.forEach((t) => {
      const key = t.changeWeek || '__unscheduled__'
      if (!groups[key]) {
        groups[key] = { weekCode: t.changeWeek, todos: [] }
      }
      groups[key].todos.push(t)
    })
    // Sort: unscheduled first, then by week desc
    const entries = Object.entries(groups)
    entries.sort(([a], [b]) => {
      if (a === '__unscheduled__') return -1
      if (b === '__unscheduled__') return 1
      return b.localeCompare(a)
    })
    return entries.map(([, g]) => g)
  })

  const changeTodoCount = computed(() => state.todos.filter((t) => t.isChange).length)

  function toggleChange(todoId) {
    const todo = state.todos.find((t) => t.id === todoId)
    if (!todo) return
    if (todo.isChange) {
      todo.isChange = false
      todo.changeStatus = null
      todo.changeWeek = null
    } else {
      todo.isChange = true
      todo.changeStatus = 'unscheduled'
      todo.changeWeek = null
    }
  }

  function updateChangeStatus(todoId, status) {
    const todo = state.todos.find((t) => t.id === todoId)
    if (!todo || !todo.isChange) return
    todo.changeStatus = status
  }

  function updateChangeWeek(todoId, weekCode) {
    const todo = state.todos.find((t) => t.id === todoId)
    if (!todo || !todo.isChange) return
    todo.changeWeek = weekCode
    if (todo.changeStatus === 'unscheduled' && weekCode) {
      todo.changeStatus = 'scheduled'
    }
    if (!weekCode && todo.changeStatus === 'scheduled') {
      todo.changeStatus = 'unscheduled'
    }
  }

  function scheduleChangeWeek(todoId, weekCode) {
    const todo = state.todos.find((t) => t.id === todoId)
    if (!todo) return
    if (!todo.isChange) {
      todo.isChange = true
      todo.changeStatus = 'scheduled'
    }
    todo.changeWeek = weekCode
    if (todo.changeStatus === 'unscheduled') {
      todo.changeStatus = 'scheduled'
    }
  }

  function reportChangeWeek(weekCode) {
    state.todos.forEach((t) => {
      if (t.isChange && t.changeWeek === weekCode && t.changeStatus !== 'done') {
        t.changeStatus = 'reported'
      }
    })
  }

  function setChangeStatusFilter(filter) {
    state.changeStatusFilter = filter
  }

  // --- View ---
  function setView(v) {
    state.view = v
  }

  function getTodosByDate(dateStr) {
    return state.todos.filter(
      (t) => (t.scheduledDate === dateStr || t.dueDate === dateStr) && (!state.hideCompleted || !t.completed)
    )
  }

  function getListName(listId) {
    const list = state.lists.find((l) => l.id === listId)
    return list ? list.name : ''
  }

  // --- Schedule Today ---
  function scheduleToday(todoId) {
    const todo = state.todos.find((t) => t.id === todoId)
    if (!todo) return
    const d = today.value
    updateTodo(todoId, { scheduledDate: todo.scheduledDate === d ? null : d })
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
    state.hideFutureTodos = false
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
      todayOrder: null,
      isChange: false,
      changeStatus: null,
      changeWeek: null,
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
      todayOrder: null,
      isChange: false,
      changeStatus: null,
      changeWeek: null,
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
    if (!todo) return

    // Auto-reorder when scheduledDate changes
    if ('scheduledDate' in updates && updates.scheduledDate !== todo.scheduledDate) {
      const d = today.value
      const newDate = updates.scheduledDate
      const siblings = state.todos.filter((t) => t.listId === todo.listId && t.id !== todo.id)

      if (newDate === d && !todo.completed) {
        // Move to top: set order before all uncompleted items
        siblings.forEach((t) => { t.order += 1 })
        updates.order = 0
      } else if (newDate && newDate > d) {
        // Move to bottom: after uncompleted, before completed
        const uncompleted = siblings.filter((t) => !t.completed)
        const maxUncompletedOrder = uncompleted.length > 0 ? Math.max(...uncompleted.map((t) => t.order)) : -1
        updates.order = maxUncompletedOrder + 0.5
        // Re-normalize after assign
      }
    }

    Object.assign(todo, updates)

    // Re-normalize order for the list
    if ('order' in updates) {
      const sorted = state.todos
        .filter((t) => t.listId === todo.listId)
        .sort((a, b) => a.order - b.order)
      sorted.forEach((t, i) => { t.order = i })
    }
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

  // --- Today Reorder ---
  function reorderTodayTodos(fromIndex, toIndex) {
    const list = todayTodos.value
    if (fromIndex < 0 || fromIndex >= list.length) return
    if (toIndex < 0 || toIndex >= list.length) return
    if (fromIndex === toIndex) return

    const d = today.value
    const ids = list.map((t) => t.id)
    const [movedId] = ids.splice(fromIndex, 1)
    ids.splice(toIndex, 0, movedId)

    ids.forEach((id, i) => {
      const todo = state.todos.find((t) => t.id === id)
      if (todo) todo.todayOrder = { date: d, order: i }
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

  // --- Move Remaining to Tomorrow ---
  function moveRemainingToTomorrow() {
    const d = today.value
    const tomorrow = new Date(d + 'T00:00:00')
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().slice(0, 10)

    const remainingTodos = state.todos.filter((t) =>
      !t.completed && (t.scheduledDate === d || t.dueDate === d)
    )

    remainingTodos.forEach((todo) => {
      todo.scheduledDate = tomorrowStr
      // Keep dueDate unchanged - only set scheduledDate for those showing via dueDate
    })

    return remainingTodos.length
  }

  return {
    state,
    sortedLists,
    activeList,
    activeTodos,
    hasFutureTodos,
    futureTodoCount,
    hasCompletedTodos,
    completedTodoCount,
    searchResults,
    activeListTags,
    allTodosWithDates,
    todayTodos,
    changeTodos,
    changeTodoGroups,
    changeTodoCount,
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
    scheduleToday,
    reorderTodos,
    reorderTodayTodos,
    setFilter,
    setSort,
    setTagFilter,
    toggleHideFutureTodos,
    toggleHideCompleted,
    setSearchQuery,
    moveTodoToList,
    toggleChange,
    updateChangeStatus,
    updateChangeWeek,
    scheduleChangeWeek,
    reportChangeWeek,
    setChangeStatusFilter,
    getWeekCode,
    getWeekOptions,
    parseWeekCode,
    getNotifications,
    getWeekRange,
    getCompletedInWeek,
    moveRemainingToTomorrow,
  }
}
