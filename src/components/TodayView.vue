<script setup>
import { useStore } from '../composables/useStore.js'
import TodoItem from './TodoItem.vue'

const { todayTodos, getListName, toggleTodo, updateTodo, deleteTodo } = useStore()
</script>

<template>
  <div class="main-content">
    <div class="main-header">今日待辦</div>

    <div class="todo-container" v-if="todayTodos.length > 0">
      <div v-for="todo in todayTodos" :key="todo.id" class="calendar-todo-item-wrapper">
        <TodoItem
          :todo="todo"
          :draggable="false"
          @toggle="toggleTodo(todo.id)"
          @update="(updates) => updateTodo(todo.id, updates)"
          @delete="deleteTodo(todo.id)"
        />
        <div class="calendar-todo-list-badge">
          <el-tag size="small">{{ getListName(todo.listId) }}</el-tag>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <el-empty description="今天沒有待辦事項" />
    </div>
  </div>
</template>
