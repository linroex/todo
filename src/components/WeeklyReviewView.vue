<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../composables/useStore.js'

const { state, getWeekRange, getCompletedInWeek, getListName, sortedLists } = useStore()

const weekOffset = ref(-1)

const weekRange = computed(() => getWeekRange(weekOffset.value))

const formatRange = computed(() => {
  const s = weekRange.value.start
  const e = weekRange.value.end
  const fmt = (d) => d.replace(/-/g, '/')
  if (s.slice(0, 4) !== e.slice(0, 4)) {
    return `${fmt(s)} ~ ${fmt(e)}`
  }
  return `${fmt(s)} ~ ${e.slice(5).replace(/-/g, '/')}`
})

const completedTodos = computed(() =>
  getCompletedInWeek(weekRange.value.start, weekRange.value.end)
)

const groupedByList = computed(() => {
  const groups = []
  const listOrder = sortedLists.value
  const map = new Map()

  completedTodos.value.forEach((todo) => {
    if (!map.has(todo.listId)) map.set(todo.listId, [])
    map.get(todo.listId).push(todo)
  })

  listOrder.forEach((list) => {
    if (map.has(list.id)) {
      groups.push({ listId: list.id, name: list.name, todos: map.get(list.id) })
    }
  })

  // Include todos from deleted lists (if any)
  map.forEach((todos, listId) => {
    if (!listOrder.some((l) => l.id === listId)) {
      groups.push({ listId, name: getListName(listId) || '(已刪除的清單)', todos })
    }
  })

  return groups
})

const cannotGoForward = computed(() => weekOffset.value >= 0)
</script>

<template>
  <div class="main-content">
    <div class="main-header">週報回顧</div>

    <div class="week-navigator">
      <el-button size="small" @click="weekOffset--">
        <el-icon><ArrowLeft /></el-icon>
        上一週
      </el-button>
      <span class="week-range-label">{{ formatRange }}</span>
      <el-button size="small" :disabled="cannotGoForward" @click="weekOffset++">
        下一週
        <el-icon><ArrowRight /></el-icon>
      </el-button>
    </div>

    <div class="week-summary" v-if="completedTodos.length > 0">
      <el-tag type="success" size="small">已完成 {{ completedTodos.length }} 項</el-tag>
    </div>

    <div class="todo-container" v-if="completedTodos.length > 0">
      <div v-for="group in groupedByList" :key="group.listId" class="week-group">
        <div class="week-group-header">{{ group.name }}</div>
        <div v-for="todo in group.todos" :key="todo.id" class="todo-item week-review-item">
          <div class="todo-row">
            <el-checkbox :model-value="true" disabled />
            <span class="todo-title completed">{{ todo.title }}</span>
            <div class="todo-tags" v-if="todo.tags && todo.tags.length">
              <el-tag v-for="tag in todo.tags" :key="tag" size="small" type="info" class="todo-tag">{{ tag }}</el-tag>
            </div>
            <div class="todo-dates">
              <span class="completed-date" title="完成日期">
                ✓ {{ todo.completedAt?.slice(0, 10) ?? '—' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <el-empty description="這一週沒有完成的事項" />
    </div>
  </div>
</template>

<style scoped>
.week-navigator {
  padding: 0 24px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.week-range-label {
  font-size: 15px;
  font-weight: 500;
  min-width: 180px;
  text-align: center;
}

.week-summary {
  padding: 0 24px 12px;
}

.week-group {
  margin-bottom: 16px;
}

.week-group-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 8px 0 4px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 8px;
}

.week-review-item {
  cursor: default;
}

.week-review-item:hover {
  box-shadow: none;
}
</style>
