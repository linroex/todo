<script setup>
import { computed } from 'vue'
import { useStore } from '../composables/useStore.js'
import TodoItem from './TodoItem.vue'

const {
  state, changeTodoGroups, changeTodoCount,
  toggleTodo, updateTodo, deleteTodo, scheduleToday,
  updateChangeStatus, setActiveList, setView,
  setChangeStatusFilter, getListName, parseWeekCode,
} = useStore()

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'unscheduled', label: '未安排' },
  { value: 'scheduled', label: '已安排' },
  { value: 'reported', label: '已報告' },
  { value: 'done', label: '已完成' },
]

const statusTagType = {
  unscheduled: 'info',
  scheduled: 'warning',
  reported: 'primary',
  done: 'success',
}

const statusLabel = {
  unscheduled: '未安排',
  scheduled: '已安排',
  reported: '已報告',
  done: '已完成',
}

const statusOrder = ['unscheduled', 'scheduled', 'reported', 'done']

function cycleStatus(todo) {
  const idx = statusOrder.indexOf(todo.changeStatus)
  const next = statusOrder[(idx + 1) % statusOrder.length]
  updateChangeStatus(todo.id, next)
}

function getWeekLabel(group) {
  if (!group.weekCode) return '尚未安排'
  const parsed = parseWeekCode(group.weekCode)
  return parsed ? `${group.weekCode}（${parsed.start} - ${parsed.end}）` : group.weekCode
}

function navigateToTodo(todo) {
  setActiveList(todo.listId)
  setView('list')
}
</script>

<template>
  <div class="main-content">
    <div class="main-header">Change 追蹤</div>

    <div class="change-filter-bar">
      <el-radio-group :model-value="state.changeStatusFilter" size="small" @change="setChangeStatusFilter">
        <el-radio-button
          v-for="opt in statusOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <div class="todo-container" v-if="changeTodoGroups.length > 0">
      <div v-for="group in changeTodoGroups" :key="group.weekCode || '__unscheduled__'" class="change-group">
        <div class="change-group-header">
          <el-icon :size="16"><Calendar /></el-icon>
          <span>{{ getWeekLabel(group) }}</span>
          <el-tag size="small" type="info">{{ group.todos.length }}</el-tag>
        </div>

        <div class="change-group-todos">
          <div
            v-for="todo in group.todos"
            :key="todo.id"
            class="change-result-item"
          >
            <TodoItem
              :todo="todo"
              :draggable="false"
              @toggle="toggleTodo(todo.id)"
              @update="(updates) => updateTodo(todo.id, updates)"
              @delete="deleteTodo(todo.id)"
              @schedule-today="scheduleToday(todo.id)"
            />
            <div class="change-item-meta">
              <el-tag
                :type="statusTagType[todo.changeStatus] ?? 'info'"
                size="small"
                class="change-status-tag"
                @click="cycleStatus(todo)"
              >
                {{ statusLabel[todo.changeStatus] ?? '未知' }}
              </el-tag>
              <span class="change-item-list">{{ getListName(todo.listId) }}</span>
              <el-button
                size="small"
                text
                type="primary"
                @click="navigateToTodo(todo)"
              >
                前往清單
                <el-icon class="el-icon--right"><Right /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <el-empty description="沒有 Change 項目" />
    </div>
  </div>
</template>
