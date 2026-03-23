<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useStore } from '../composables/useStore.js'
import TodoItem from './TodoItem.vue'

const { todayTodos, toggleTodo, updateTodo, deleteTodo, scheduleToday, toggleChange, updateChangeStatus, scheduleChangeWeek, reorderTodayTodos } = useStore()

// --- Selection ---
const selectedTodoId = ref(null)
const todoItemRefs = ref({})

function setItemRef(id, el) {
  if (el) {
    todoItemRefs.value[id] = el
  } else {
    delete todoItemRefs.value[id]
  }
}

function selectTodo(id) {
  selectedTodoId.value = selectedTodoId.value === id ? null : id
}

function moveSelection(direction) {
  const todos = todayTodos.value
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
  const todos = todayTodos.value
  const currentIndex = todos.findIndex((t) => t.id === selectedTodoId.value)
  if (currentIndex === -1) return
  const newIndex = currentIndex + (direction === 'up' ? -1 : 1)
  if (newIndex < 0 || newIndex >= todos.length) return
  reorderTodayTodos(currentIndex, newIndex)
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
    const todos = todayTodos.value
    const currentIndex = todos.findIndex((t) => t.id === selectedTodoId.value)
    deleteTodo(selectedTodoId.value)
    const remaining = todayTodos.value
    if (remaining.length > 0) {
      const newIndex = Math.min(currentIndex, remaining.length - 1)
      selectedTodoId.value = remaining[newIndex].id
      nextTick(() => { todoItemRefs.value[selectedTodoId.value]?.focus() })
    } else {
      selectedTodoId.value = null
    }
  }
}

// --- Drag & Drop ---
const dragTodoId = ref(null)
const dragIndex = ref(-1)
const overIndex = ref(-1)
const overPosition = ref('')

function onDragStart(index, todoId) {
  dragIndex.value = index
  dragTodoId.value = todoId
}

function onDragEnter(index, e) {
  if (dragIndex.value === -1) return
  overIndex.value = index
  const rect = e.currentTarget.closest('.todo-item').getBoundingClientRect()
  const midY = rect.top + rect.height / 2
  overPosition.value = e.clientY < midY ? 'top' : 'bottom'
}

function onDragEnd() {
  const stillHere = dragTodoId.value && todayTodos.value.some((t) => t.id === dragTodoId.value)
  if (stillHere && dragIndex.value !== -1 && overIndex.value !== -1) {
    let toIndex = overIndex.value
    if (overPosition.value === 'bottom' && toIndex < dragIndex.value) {
      toIndex++
    } else if (overPosition.value === 'top' && toIndex > dragIndex.value) {
      toIndex--
    }
    reorderTodayTodos(dragIndex.value, toIndex)
  }
  resetDragState()
}

function resetDragState() {
  dragTodoId.value = null
  dragIndex.value = -1
  overIndex.value = -1
  overPosition.value = ''
}

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
    <div class="main-header">今日待辦</div>

    <div
      class="todo-container"
      v-if="todayTodos.length > 0"
      tabindex="-1"
      @dragover.prevent
      @click.self="selectedTodoId = null"
      @keydown="handleContainerKeydown"
    >
      <TodoItem
        v-for="(todo, index) in todayTodos"
        :key="todo.id"
        :ref="(el) => setItemRef(todo.id, el)"
        :todo="todo"
        :selected="selectedTodoId === todo.id"
        :show-dates="false"
        :class="getDragClass(index, todo.id)"
        @select="selectTodo(todo.id)"
        @toggle="toggleTodo(todo.id)"
        @update="(updates) => updateTodo(todo.id, updates)"
        @delete="deleteTodo(todo.id)"
        @schedule-today="scheduleToday(todo.id)"
        @toggle-change="toggleChange(todo.id)"
        @update-change-status="(s) => updateChangeStatus(todo.id, s)"
        @schedule-change-week="(week) => scheduleChangeWeek(todo.id, week)"
        @dragstart="onDragStart(index, todo.id)"
        @dragenter="(e) => onDragEnter(index, e)"
        @dragend="onDragEnd"
      />
    </div>

    <div v-else class="empty-state">
      <el-empty description="今天沒有待辦事項" />
    </div>
  </div>
</template>
