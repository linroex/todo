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
  tagFilter: null, // null = all, or a tag string
  view: 'list', // 'list' | 'calendar'
})

// Initialize activeListId
state.activeListId = state.lists.length > 0 ? state.lists[0].id : null

// Persist to localStorage
watch(() => state.lists, (val) => {
  localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(val))
}, { deep: true })

watch(() => state.todos, (val) => {
  localStorage.setItem(STORAGE_KEY_TODOS, JSON.stringify(val))
}, { deep: true })

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

    // When completed, move to bottom of the list
    if (todo.completed) {
      const siblings = state.todos.filter((t) => t.listId === todo.listId)
      const maxOrder = Math.max(...siblings.map((t) => t.order))
      todo.order = maxOrder + 1
    }
  }

  // --- Reorder ---
  function reorderTodos(fromIndex, toIndex) {
    const list = activeTodos.value
    if (fromIndex < 0 || fromIndex >= list.length) return
    if (toIndex < 0 || toIndex >= list.length) return
    if (fromIndex === toIndex) return

    // Get the actual todo ids in current sorted order
    const ids = list.map((t) => t.id)
    const [movedId] = ids.splice(fromIndex, 1)
    ids.splice(toIndex, 0, movedId)

    // Reassign order values
    ids.forEach((id, i) => {
      const todo = state.todos.find((t) => t.id === id)
      if (todo) todo.order = i
    })
  }

  return {
    state,
    sortedLists,
    activeList,
    activeTodos,
    activeListTags,
    allTodosWithDates,
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
    setTagFilter,
    moveTodoToList,
    getNotifications,
  }
}
