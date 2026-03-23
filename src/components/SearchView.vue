<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useStore } from '../composables/useStore.js'
import TodoItem from './TodoItem.vue'

const { state, searchResults, setSearchQuery, toggleTodo, updateTodo, deleteTodo, scheduleToday, toggleChange, updateChangeStatus, setActiveList, setView } = useStore()

const searchInput = ref(null)

onMounted(() => {
  nextTick(() => {
    searchInput.value?.focus()
  })
})

function onInput(val) {
  setSearchQuery(val)
}

function clearSearch() {
  setSearchQuery('')
  nextTick(() => {
    searchInput.value?.focus()
  })
}

function navigateToTodo(todo) {
  setActiveList(todo.listId)
  setView('list')
}

const totalCount = computed(() => {
  return searchResults.value.reduce((sum, group) => sum + group.todos.length, 0)
})
</script>

<template>
  <div class="main-content">
    <div class="main-header">搜尋</div>

    <div class="search-bar">
      <el-input
        ref="searchInput"
        :model-value="state.searchQuery"
        @update:model-value="onInput"
        placeholder="搜尋所有清單的待辦事項..."
        clearable
        @clear="clearSearch"
        size="large"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <div class="search-results" v-if="state.searchQuery.trim()">
      <div class="search-summary" v-if="totalCount > 0">
        找到 {{ totalCount }} 項結果
      </div>

      <div v-if="searchResults.length > 0" class="search-groups">
        <div v-for="group in searchResults" :key="group.listId" class="search-group">
          <div class="search-group-header">
            <el-icon :size="16"><List /></el-icon>
            <span>{{ group.listName }}</span>
            <el-tag size="small" type="info">{{ group.todos.length }}</el-tag>
          </div>

          <div class="search-group-todos">
            <div
              v-for="todo in group.todos"
              :key="todo.id"
              class="search-result-item"
            >
              <TodoItem
                :todo="todo"
                :draggable="false"
                :show-dates="true"
                @toggle="toggleTodo(todo.id)"
                @update="(updates) => updateTodo(todo.id, updates)"
                @delete="deleteTodo(todo.id)"
                @schedule-today="scheduleToday(todo.id)"
                @toggle-change="toggleChange(todo.id)"
                @update-change-status="(s) => updateChangeStatus(todo.id, s)"
              />
              <div class="search-item-actions">
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
        <el-empty description="找不到符合的待辦事項" />
      </div>
    </div>

    <div v-else class="empty-state">
      <el-empty description="輸入關鍵字搜尋所有清單的待辦事項" />
    </div>
  </div>
</template>
