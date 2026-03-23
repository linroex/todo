<script setup>
import { useStore } from '../composables/useStore.js'
import TodoItem from './TodoItem.vue'

const {
  state, changeTodoGroups,
  toggleTodo, updateTodo, deleteTodo, scheduleToday,
  toggleChange, updateChangeStatus, scheduleChangeThisWeek,
  reportChangeWeek, setChangeStatusFilter,
  getListName, parseWeekCode, getWeekCode,
} = useStore()

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'unscheduled', label: '未安排' },
  { value: 'scheduled', label: '已安排' },
  { value: 'reported', label: '已報告' },
  { value: 'done', label: '已完成' },
]

const currentWeek = getWeekCode()

function getWeekLabel(group) {
  if (!group.weekCode) return '尚未安排'
  const parsed = parseWeekCode(group.weekCode)
  return parsed ? `${group.weekCode}（${parsed.start} - ${parsed.end}）` : group.weekCode
}

function isCurrentWeek(group) {
  return group.weekCode === currentWeek
}

function hasUnreported(group) {
  return group.weekCode && group.todos.some((t) => t.changeStatus !== 'reported' && t.changeStatus !== 'done')
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
          <el-tag v-if="isCurrentWeek(group)" size="small" type="success">本週</el-tag>
          <el-tag size="small" type="info">{{ group.todos.length }}</el-tag>
          <el-button
            v-if="hasUnreported(group)"
            size="small"
            text
            type="primary"
            @click="reportChangeWeek(group.weekCode)"
          >
            整週已報告
          </el-button>
        </div>

        <div class="change-group-todos">
          <TodoItem
            v-for="todo in group.todos"
            :key="todo.id"
            :todo="todo"
            :draggable="false"
            :list-name="getListName(todo.listId)"
            @toggle="toggleTodo(todo.id)"
            @update="(updates) => updateTodo(todo.id, updates)"
            @delete="deleteTodo(todo.id)"
            @schedule-today="scheduleToday(todo.id)"
            @toggle-change="toggleChange(todo.id)"
            @update-change-status="(s) => updateChangeStatus(todo.id, s)"
            @schedule-change-week="scheduleChangeThisWeek(todo.id)"
          />
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <el-empty description="沒有 Change 項目" />
    </div>
  </div>
</template>
