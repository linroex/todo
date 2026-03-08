<script setup>
import { onMounted } from 'vue'
import { ElNotification } from 'element-plus'
import Sidebar from './components/Sidebar.vue'
import TodoList from './components/TodoList.vue'
import CalendarView from './components/CalendarView.vue'
import TodayView from './components/TodayView.vue'
import WeeklyReviewView from './components/WeeklyReviewView.vue'
import { useStore } from './composables/useStore.js'

const { state, getNotifications } = useStore()

onMounted(() => {
  const { overdue, dueToday, scheduledToday } = getNotifications()

  if (overdue.length > 0) {
    ElNotification({
      title: '逾期提醒',
      message: `你有 ${overdue.length} 項已逾期的待辦事項`,
      type: 'error',
      duration: 5000,
    })
  }

  if (dueToday.length > 0) {
    ElNotification({
      title: '今日到期',
      message: `你有 ${dueToday.length} 項今天到期的待辦事項`,
      type: 'warning',
      duration: 5000,
    })
  }

  if (scheduledToday.length > 0) {
    ElNotification({
      title: '今日預計執行',
      message: `你有 ${scheduledToday.length} 項預計今天執行的待辦事項`,
      type: 'info',
      duration: 5000,
    })
  }
})
</script>

<template>
  <Sidebar />
  <TodayView v-if="state.view === 'today'" />
  <TodoList v-else-if="state.view === 'list'" />
  <CalendarView v-else-if="state.view === 'calendar'" />
  <WeeklyReviewView v-else-if="state.view === 'weekly-review'" />
</template>
