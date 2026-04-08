<script setup>
import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useStore } from '../composables/useStore.js'
import TodoItem from './TodoItem.vue'

const { todayTodos, yesterdayTodos, tomorrowTodos, toggleTodo, updateTodo, deleteTodo, scheduleToday, toggleChange, updateChangeStatus, scheduleChangeWeek, reorderTodayTodos, moveRemainingToTomorrow, moveTodoToDate } = useStore()

// --- Selection ---
const selectedTodoId = ref(null)
const selectedSection = ref('today') // 'yesterday' | 'today' | 'tomorrow'
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
  // Determine which section this todo belongs to
  if (selectedTodoId.value) {
    if (yesterdayTodos.value.some(t => t.id === id)) selectedSection.value = 'yesterday'
    else if (todayTodos.value.some(t => t.id === id)) selectedSection.value = 'today'
    else if (tomorrowTodos.value.some(t => t.id === id)) selectedSection.value = 'tomorrow'
  }
}

function getAllTodosInOrder() {
  return [
    ...yesterdayTodos.value.map(t => ({ ...t, section: 'yesterday' })),
    ...todayTodos.value.map(t => ({ ...t, section: 'today' })),
    ...tomorrowTodos.value.map(t => ({ ...t, section: 'tomorrow' }))
  ]
}

function moveSelection(direction) {
  const allTodos = getAllTodosInOrder()
  if (allTodos.length === 0) return

  const currentIndex = allTodos.findIndex((t) => t.id === selectedTodoId.value)
  let newIndex
  if (currentIndex === -1) {
    newIndex = direction === 'up' ? allTodos.length - 1 : 0
  } else {
    newIndex = currentIndex + (direction === 'up' ? -1 : 1)
    if (newIndex < 0 || newIndex >= allTodos.length) return
  }

  const newTodo = allTodos[newIndex]
  selectedTodoId.value = newTodo.id
  selectedSection.value = newTodo.section
  nextTick(() => {
    todoItemRefs.value[newTodo.id]?.focus()
  })
}

function reorderSelected(direction) {
  if (!selectedTodoId.value || selectedSection.value !== 'today') return
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
    const allTodos = getAllTodosInOrder()
    const currentIndex = allTodos.findIndex((t) => t.id === selectedTodoId.value)
    deleteTodo(selectedTodoId.value)
    const remainingTodos = getAllTodosInOrder()
    if (remainingTodos.length > 0) {
      const newIndex = Math.min(currentIndex, remainingTodos.length - 1)
      const newTodo = remainingTodos[newIndex]
      selectedTodoId.value = newTodo.id
      selectedSection.value = newTodo.section
      nextTick(() => { todoItemRefs.value[selectedTodoId.value]?.focus() })
    } else {
      selectedTodoId.value = null
      selectedSection.value = 'today'
    }
  }
}

// --- Drag & Drop ---
const dragTodoId = ref(null)
const dragIndex = ref(-1)
const dragSourceDate = ref('') // 'yesterday' | 'today' | 'tomorrow'
const overIndex = ref(-1)
const overPosition = ref('')
const overDate = ref('') // 'yesterday' | 'today' | 'tomorrow'

function onDragStart(index, todoId, dateType) {
  dragIndex.value = index
  dragTodoId.value = todoId
  dragSourceDate.value = dateType
}

function onDragEnter(index, e, dateType) {
  if (dragIndex.value === -1) return
  overIndex.value = index
  overDate.value = dateType
  const rect = e.currentTarget.closest('.todo-item').getBoundingClientRect()
  const midY = rect.top + rect.height / 2
  overPosition.value = e.clientY < midY ? 'top' : 'bottom'
}

function onDragEnterZone(e, dateType) {
  if (dragIndex.value === -1) return
  overDate.value = dateType
  overIndex.value = -1 // No specific item target, just zone
}

function onDragEnd() {
  if (!dragTodoId.value) return

  // Check if we're moving between different dates
  if (overDate.value && overDate.value !== dragSourceDate.value) {
    // Cross-date move
    const dateOffset = overDate.value === 'yesterday' ? -1 : overDate.value === 'tomorrow' ? 1 : 0
    moveTodoToDate(dragTodoId.value, dateOffset)
  } else if (dragSourceDate.value === 'today' && overIndex.value !== -1 && overIndex.value !== dragIndex.value) {
    // Same-day reorder for today only (preserve existing behavior)
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
  dragSourceDate.value = ''
  overIndex.value = -1
  overPosition.value = ''
  overDate.value = ''
}

onMounted(() => {
  document.addEventListener('dragend', resetDragState)
})
onUnmounted(() => {
  document.removeEventListener('dragend', resetDragState)
})

function getDragClass(index, todoId, dateType) {
  if (dragIndex.value === index && dragTodoId.value === todoId && dragSourceDate.value === dateType) return 'dragging'
  if (overIndex.value === index && overDate.value === dateType && overPosition.value === 'top') return 'drag-over-top'
  if (overIndex.value === index && overDate.value === dateType && overPosition.value === 'bottom') return 'drag-over-bottom'
  if (overDate.value === dateType && overIndex.value === -1) return 'drag-over-zone'
  return ''
}

// --- Move to Tomorrow ---
const hasRemainingTodos = computed(() => todayTodos.value.length > 0)

async function handleMoveToTomorrow() {
  if (!hasRemainingTodos.value) return

  try {
    await ElMessageBox.confirm(
      `確定要將今日剩餘的 ${todayTodos.value.length} 個待辦事項移動到明天嗎？`,
      '確認移動',
      {
        confirmButtonText: '確定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const movedCount = moveRemainingToTomorrow()
    ElMessage.success(`已將 ${movedCount} 個待辦事項移動至明天`)
  } catch {
    // User cancelled, do nothing
  }
}
</script>

<template>
  <div class="main-content">
    <div class="main-header">
      <span>待處理事項</span>
      <el-button
        v-if="hasRemainingTodos"
        type="primary"
        size="small"
        @click="handleMoveToTomorrow"
      >
        剩餘全部延至明天
      </el-button>
    </div>

    <div
      class="multi-day-container"
      tabindex="-1"
      @dragover.prevent
      @click.self="selectedTodoId = null"
      @keydown="handleContainerKeydown"
    >
      <!-- 左上：昨日未完成 -->
      <div class="yesterday-section">
        <h3 class="section-title">昨日未完成 ({{ yesterdayTodos.length }})</h3>
        <div
          class="section-content yesterday"
          @dragover.prevent
          @dragenter="(e) => onDragEnterZone(e, 'yesterday')"
        >
          <div v-if="yesterdayTodos.length === 0" class="empty-section">
            無未完成事項
          </div>
          <TodoItem
            v-else
            v-for="(todo, index) in yesterdayTodos"
            :key="todo.id"
            :ref="(el) => setItemRef(todo.id, el)"
            :todo="todo"
            :selected="selectedTodoId === todo.id"
            :show-dates="false"
            :class="getDragClass(index, todo.id, 'yesterday')"
            @select="selectTodo(todo.id)"
            @toggle="toggleTodo(todo.id)"
            @update="(updates) => updateTodo(todo.id, updates)"
            @delete="deleteTodo(todo.id)"
            @schedule-today="scheduleToday(todo.id)"
            @toggle-change="toggleChange(todo.id)"
            @update-change-status="(s) => updateChangeStatus(todo.id, s)"
            @schedule-change-week="(week) => scheduleChangeWeek(todo.id, week)"
            @dragstart="onDragStart(index, todo.id, 'yesterday')"
            @dragenter="(e) => onDragEnter(index, e, 'yesterday')"
            @dragend="onDragEnd"
          />
        </div>
      </div>

      <!-- 右上：明日事項 -->
      <div class="tomorrow-section">
        <h3 class="section-title">明日待辦 ({{ tomorrowTodos.length }})</h3>
        <div
          class="section-content tomorrow"
          @dragover.prevent
          @dragenter="(e) => onDragEnterZone(e, 'tomorrow')"
        >
          <div v-if="tomorrowTodos.length === 0" class="empty-section">
            無待辦事項
          </div>
          <TodoItem
            v-else
            v-for="(todo, index) in tomorrowTodos"
            :key="todo.id"
            :ref="(el) => setItemRef(todo.id, el)"
            :todo="todo"
            :selected="selectedTodoId === todo.id"
            :show-dates="false"
            :class="getDragClass(index, todo.id, 'tomorrow')"
            @select="selectTodo(todo.id)"
            @toggle="toggleTodo(todo.id)"
            @update="(updates) => updateTodo(todo.id, updates)"
            @delete="deleteTodo(todo.id)"
            @schedule-today="scheduleToday(todo.id)"
            @toggle-change="toggleChange(todo.id)"
            @update-change-status="(s) => updateChangeStatus(todo.id, s)"
            @schedule-change-week="(week) => scheduleChangeWeek(todo.id, week)"
            @dragstart="onDragStart(index, todo.id, 'tomorrow')"
            @dragenter="(e) => onDragEnter(index, e, 'tomorrow')"
            @dragend="onDragEnd"
          />
        </div>
      </div>

      <!-- 下方大塊：今日主體 -->
      <div class="today-section">
        <h3 class="section-title">今日待辦 ({{ todayTodos.length }})</h3>
        <div
          class="section-content today"
          @dragover.prevent
          @dragenter="(e) => onDragEnterZone(e, 'today')"
        >
          <div v-if="todayTodos.length === 0" class="empty-section">
            今天沒有待辦事項
          </div>
          <TodoItem
            v-else
            v-for="(todo, index) in todayTodos"
            :key="todo.id"
            :ref="(el) => setItemRef(todo.id, el)"
            :todo="todo"
            :selected="selectedTodoId === todo.id"
            :show-dates="false"
            :class="getDragClass(index, todo.id, 'today')"
            @select="selectTodo(todo.id)"
            @toggle="toggleTodo(todo.id)"
            @update="(updates) => updateTodo(todo.id, updates)"
            @delete="deleteTodo(todo.id)"
            @schedule-today="scheduleToday(todo.id)"
            @toggle-change="toggleChange(todo.id)"
            @update-change-status="(s) => updateChangeStatus(todo.id, s)"
            @schedule-change-week="(week) => scheduleChangeWeek(todo.id, week)"
            @dragstart="onDragStart(index, todo.id, 'today')"
            @dragenter="(e) => onDragEnter(index, e, 'today')"
            @dragend="onDragEnd"
          />
        </div>
      </div>
    </div>
  </div>
</template>
