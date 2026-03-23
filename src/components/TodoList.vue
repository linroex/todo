<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from '../composables/useStore.js'
import TodoItem from './TodoItem.vue'

const { state, activeList, activeTodos, hasFutureTodos, futureTodoCount, activeListTags, addTodo, addTodoAfter, updateTodo, deleteTodo, toggleTodo, scheduleToday, toggleChange, updateChangeStatus, scheduleChangeWeek, reorderTodos, setFilter, setSort, setTagFilter, toggleHideFutureTodos } = useStore()

const dateFilters = ['scheduled-today', 'due-today', 'overdue', 'has-scheduled', 'has-due']
const showSort = computed(() => dateFilters.includes(state.filter))
const canDrag = computed(() => state.sort === 'order' && state.filter === 'all' && !state.tagFilter)

const sortOptions = computed(() => {
  const scheduledFilters = ['scheduled-today', 'has-scheduled']
  const dueFilters = ['due-today', 'has-due', 'overdue']
  const opts = [{ value: 'order', label: '預設排序' }]
  if (scheduledFilters.includes(state.filter)) {
    opts.push({ value: 'scheduled-asc', label: '執行日期 早→晚' })
    opts.push({ value: 'scheduled-desc', label: '執行日期 晚→早' })
  }
  if (dueFilters.includes(state.filter)) {
    opts.push({ value: 'due-asc', label: '截止日 早→晚' })
    opts.push({ value: 'due-desc', label: '截止日 晚→早' })
  }
  // For filters that could have both dates, show all options
  if (!scheduledFilters.includes(state.filter) && !dueFilters.includes(state.filter)) {
    opts.push({ value: 'scheduled-asc', label: '執行日期 早→晚' })
    opts.push({ value: 'scheduled-desc', label: '執行日期 晚→早' })
    opts.push({ value: 'due-asc', label: '截止日 早→晚' })
    opts.push({ value: 'due-desc', label: '截止日 晚→早' })
  }
  return opts
})

const selectedTodoId = ref(null)

function selectTodo(id) {
  selectedTodoId.value = selectedTodoId.value === id ? null : id
}

// Insert a new todo below the given todo, then inline-edit it
const insertEditId = ref(null)

function insertBelow(afterId) {
  const todo = addTodoAfter(afterId, '')
  if (todo) {
    insertEditId.value = todo.id
    selectedTodoId.value = todo.id
  }
}

function onItemMounted(todoId) {
  if (insertEditId.value === todoId) {
    insertEditId.value = null
  }
}

const todoItemRefs = ref({})

function setItemRef(id, el) {
  if (el) {
    todoItemRefs.value[id] = el
  } else {
    delete todoItemRefs.value[id]
  }
}

function moveSelection(direction) {
  const todos = activeTodos.value
  if (todos.length === 0) return
  const currentIndex = todos.findIndex((t) => t.id === selectedTodoId.value)
  let newIndex
  if (currentIndex === -1) {
    newIndex = direction === 'up' ? todos.length - 1 : 0
  } else {
    newIndex = currentIndex + (direction === 'up' ? -1 : 1)
    if (newIndex < 0 || newIndex >= todos.length) return
  }
  const newId = todos[newIndex].id
  selectedTodoId.value = newId
  nextTick(() => {
    todoItemRefs.value[newId]?.focus()
  })
}

function reorderSelected(direction) {
  if (!selectedTodoId.value) return
  const todos = activeTodos.value
  const currentIndex = todos.findIndex((t) => t.id === selectedTodoId.value)
  if (currentIndex === -1) return
  const newIndex = currentIndex + (direction === 'up' ? -1 : 1)
  if (newIndex < 0 || newIndex >= todos.length) return
  reorderTodos(currentIndex, newIndex)
  nextTick(() => {
    todoItemRefs.value[selectedTodoId.value]?.focus()
  })
}

function handleContainerKeydown(e) {
  const tag = e.target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  const mod = e.metaKey || e.ctrlKey
  if (e.key === 't' && !mod && selectedTodoId.value) {
    e.preventDefault()
    scheduleToday(selectedTodoId.value)
  } else if (e.key === 'ArrowUp' && mod) {
    e.preventDefault()
    reorderSelected('up')
  } else if (e.key === 'ArrowDown' && mod) {
    e.preventDefault()
    reorderSelected('down')
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    moveSelection('up')
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    moveSelection('down')
  } else if (e.key === 'Enter' && selectedTodoId.value) {
    e.preventDefault()
    todoItemRefs.value[selectedTodoId.value]?.startEdit()
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTodoId.value) {
    e.preventDefault()
    const todos = activeTodos.value
    const currentIndex = todos.findIndex((t) => t.id === selectedTodoId.value)
    const deletedId = selectedTodoId.value
    deleteTodo(deletedId)
    // Select next or previous item from the updated list
    const remaining = activeTodos.value
    if (remaining.length > 0) {
      const newIndex = Math.min(currentIndex, remaining.length - 1)
      selectedTodoId.value = remaining[newIndex].id
      nextTick(() => { todoItemRefs.value[selectedTodoId.value]?.focus() })
    } else {
      selectedTodoId.value = null
    }
  }
}

const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'scheduled-today', label: '今日執行' },
  { value: 'due-today', label: '今日到期' },
  { value: 'overdue', label: '已逾期' },
  { value: 'has-scheduled', label: '有執行日期' },
  { value: 'has-due', label: '有截止日' },
]

const newTitle = ref('')

function handleAdd() {
  const title = newTitle.value.trim()
  if (!title) return
  addTodo(title)
  newTitle.value = ''
}

// --- Drag & Drop ---
const dragTodoId = ref(null)
const dragIndex = ref(-1)
const overIndex = ref(-1)
const overPosition = ref('') // 'top' | 'bottom'

function onDragStart(index, todoId) {
  dragIndex.value = index
  dragTodoId.value = todoId
}

function onDragEnter(index, e) {
  if (dragIndex.value === -1) return
  overIndex.value = index
  // Determine if cursor is in top or bottom half
  const rect = e.currentTarget.closest('.todo-item').getBoundingClientRect()
  const midY = rect.top + rect.height / 2
  overPosition.value = e.clientY < midY ? 'top' : 'bottom'
}

function onDragEnd() {
  // Only reorder if the todo is still in this list
  const stillHere = dragTodoId.value && activeTodos.value.some((t) => t.id === dragTodoId.value)
  if (stillHere && dragIndex.value !== -1 && overIndex.value !== -1) {
    let toIndex = overIndex.value
    if (overPosition.value === 'bottom' && toIndex < dragIndex.value) {
      toIndex++
    } else if (overPosition.value === 'top' && toIndex > dragIndex.value) {
      toIndex--
    }
    reorderTodos(dragIndex.value, toIndex)
  }
  dragTodoId.value = null
  dragIndex.value = -1
  overIndex.value = -1
  overPosition.value = ''
}

function resetDragState() {
  dragTodoId.value = null
  dragIndex.value = -1
  overIndex.value = -1
  overPosition.value = ''
}

watch(() => state.activeListId, resetDragState)

// Fallback: if dragend doesn't fire (element removed), reset on global dragend
onMounted(() => {
  document.addEventListener('dragend', resetDragState)
})
onUnmounted(() => {
  document.removeEventListener('dragend', resetDragState)
})

function getDragClass(index, todoId) {
  if (dragIndex.value === index && dragTodoId.value === todoId) return 'dragging'
  if (overIndex.value === index && overPosition.value === 'top') return 'drag-over-top'
  if (overIndex.value === index && overPosition.value === 'bottom') return 'drag-over-bottom'
  return ''
}
</script>

<template>
  <div class="main-content">
    <template v-if="activeList">
      <div class="main-header">{{ activeList.name }}</div>

      <div class="todo-filter-bar">
        <el-radio-group v-model="state.filter" size="small" @change="setFilter">
          <el-radio-button
            v-for="opt in filterOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="showSort" class="todo-sort-bar">
        <span class="sort-label">排序：</span>
        <el-radio-group v-model="state.sort" size="small" @change="setSort">
          <el-radio-button
            v-for="opt in sortOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="activeListTags.length > 0" class="todo-tag-filter-bar">
        <span class="tag-filter-label">標籤篩選：</span>
        <el-tag
          v-for="tag in activeListTags"
          :key="tag"
          size="small"
          :effect="state.tagFilter === tag ? 'dark' : 'plain'"
          class="tag-filter-item"
          @click="setTagFilter(tag)"
        >{{ tag }}</el-tag>
        <el-tag
          v-if="state.tagFilter"
          size="small"
          type="info"
          class="tag-filter-item"
          @click="setTagFilter(null)"
        >清除</el-tag>
      </div>

      <div class="todo-container" tabindex="-1" @dragover.prevent @click.self="selectedTodoId = null" @keydown="handleContainerKeydown">
        <div class="todo-item todo-inline-add">
          <div class="todo-row">
            <span class="drag-handle" style="visibility: hidden">
              <el-icon :size="16"><Rank /></el-icon>
            </span>
            <el-icon :size="16" color="var(--color-text-secondary)"><Plus /></el-icon>
            <input
              v-model="newTitle"
              class="todo-title-input todo-add-input"
              placeholder="新增待辦事項..."
              @keydown.enter="handleAdd"
              @focus="selectedTodoId = null"
            />
          </div>
        </div>

        <TodoItem
          v-for="(todo, index) in activeTodos"
          :key="todo.id"
          :ref="(el) => setItemRef(todo.id, el)"
          :todo="todo"
          :selected="selectedTodoId === todo.id"
          :class="canDrag ? getDragClass(index, todo.id) : ''"
          :draggable="canDrag"
          :auto-edit="insertEditId === todo.id"
          @select="selectTodo(todo.id)"
          @insert-below="insertBelow(todo.id)"
          @mounted="onItemMounted(todo.id)"
          @toggle="toggleTodo(todo.id)"
          @update="(u) => updateTodo(todo.id, u)"
          @delete="deleteTodo(todo.id)"
          @schedule-today="scheduleToday(todo.id)"
          @toggle-change="toggleChange(todo.id)"
          @update-change-status="(s) => updateChangeStatus(todo.id, s)"
          @schedule-change-week="(week) => scheduleChangeWeek(todo.id, week)"
          @dragstart="onDragStart(index, todo.id)"
          @dragenter="(e) => onDragEnter(index, e)"
          @dragend="onDragEnd"
        />

        <div v-if="activeTodos.length === 0" class="empty-state">
          <el-empty description="沒有待辦事項" />
        </div>

        <div v-if="state.filter === 'all' && hasFutureTodos" class="hide-future-toggle">
          <el-button
            size="small"
            text
            type="info"
            @click="toggleHideFutureTodos"
          >
            <el-icon class="el-icon--left"><Hide v-if="!state.hideFutureTodos" /><View v-else /></el-icon>
            {{ state.hideFutureTodos ? '顯示未來事項' : '隱藏未來事項' }}（{{ futureTodoCount }}）
          </el-button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="empty-state">
        <el-empty description="請先建立一個清單" />
      </div>
    </template>
  </div>
</template>
