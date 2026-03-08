<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../composables/useStore.js'
import TodoItem from './TodoItem.vue'

const { state, allTodosWithDates, getTodosByDate, getListName, toggleTodo, updateTodo, deleteTodo } = useStore()

const selectedDate = ref(null)
const calendarValue = ref(new Date())

// Build a Set of dates that have todos for quick lookup
const dateMarkers = computed(() => {
  const markers = {}
  allTodosWithDates.value.forEach((t) => {
    if (t.scheduledDate) {
      if (!markers[t.scheduledDate]) markers[t.scheduledDate] = { scheduled: false, due: false }
      markers[t.scheduledDate].scheduled = true
    }
    if (t.dueDate) {
      if (!markers[t.dueDate]) markers[t.dueDate] = { scheduled: false, due: false }
      markers[t.dueDate].due = true
    }
  })
  return markers
})

const selectedTodos = computed(() => {
  if (!selectedDate.value) return []
  return getTodosByDate(selectedDate.value)
})

function formatDate(cell) {
  const d = cell.getFullYear() + '-' +
    String(cell.getMonth() + 1).padStart(2, '0') + '-' +
    String(cell.getDate()).padStart(2, '0')
  return d
}

function onDateClick(cell) {
  const dateStr = formatDate(cell)
  selectedDate.value = selectedDate.value === dateStr ? null : dateStr
}
</script>

<template>
  <div class="main-content">
    <div class="main-header">行事曆</div>

    <div class="calendar-container">
      <el-calendar v-model="calendarValue">
        <template #date-cell="{ data }">
          <div class="calendar-cell" @click="onDateClick(data.date)">
            <span class="calendar-day" :class="{ 'is-selected-date': formatDate(data.date) === selectedDate }">
              {{ data.date.getDate() }}
            </span>
            <div class="calendar-dots" v-if="dateMarkers[formatDate(data.date)]">
              <span
                v-if="dateMarkers[formatDate(data.date)].scheduled"
                class="dot dot-scheduled"
                title="預計執行"
              />
              <span
                v-if="dateMarkers[formatDate(data.date)].due"
                class="dot dot-due"
                title="截止日"
              />
            </div>
          </div>
        </template>
      </el-calendar>
    </div>

    <div v-if="selectedDate" class="calendar-todo-section">
      <div class="calendar-todo-header">
        {{ selectedDate }} 的待辦事項
        <el-tag size="small" type="info">{{ selectedTodos.length }} 項</el-tag>
      </div>

      <div class="todo-container" v-if="selectedTodos.length > 0">
        <div v-for="todo in selectedTodos" :key="todo.id" class="calendar-todo-item-wrapper">
          <TodoItem
            :todo="todo"
            :draggable="false"
            @toggle="toggleTodo(todo.id)"
            @update="(updates) => updateTodo(todo.id, updates)"
            @delete="deleteTodo(todo.id)"
          />
          <div class="calendar-todo-list-badge">
            <el-tag size="small" type="">{{ getListName(todo.listId) }}</el-tag>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <el-empty description="這天沒有待辦事項" :image-size="80" />
      </div>
    </div>
  </div>
</template>
