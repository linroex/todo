<script setup>
import { ref } from 'vue'
import { useStore } from '../composables/useStore.js'

const { state, sortedLists, todayTodos, addList, renameList, deleteList, setActiveList, setView, moveTodoToList } = useStore()

const dragOverListId = ref(null)

function onListDragOver(e, listId) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragOverListId.value = listId
}

function onListDragLeave(listId) {
  if (dragOverListId.value === listId) dragOverListId.value = null
}

function onListDrop(e, listId) {
  const todoId = e.dataTransfer.getData('todo-id')
  if (todoId) {
    moveTodoToList(todoId, listId)
  }
  dragOverListId.value = null
}

const newListName = ref('')
const renamingId = ref(null)
const renamingName = ref('')

function handleAddList() {
  const name = newListName.value.trim()
  if (!name) return
  addList(name)
  newListName.value = ''
}

function startRename(list) {
  renamingId.value = list.id
  renamingName.value = list.name
}

function confirmRename() {
  const name = renamingName.value.trim()
  if (name && renamingId.value) {
    renameList(renamingId.value, name)
  }
  renamingId.value = null
  renamingName.value = ''
}

function cancelRename() {
  renamingId.value = null
  renamingName.value = ''
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">清單</div>

    <div class="sidebar-actions">
      <el-input
        v-model="newListName"
        placeholder="新增清單..."
        size="small"
        @keyup.enter="handleAddList"
      >
        <template #append>
          <el-button :icon="'Plus'" @click="handleAddList" />
        </template>
      </el-input>
    </div>

    <div
      class="list-item"
      :class="{ active: state.view === 'search' }"
      @click="setView('search')"
    >
      <el-icon :size="16"><Search /></el-icon>
      <span class="list-name">搜尋</span>
    </div>

    <div
      class="list-item"
      :class="{ active: state.view === 'today' }"
      @click="setView('today')"
    >
      <el-icon :size="16"><Sunrise /></el-icon>
      <span class="list-name">今日待辦</span>
      <el-tag v-if="todayTodos.length > 0" size="small" type="danger" round>{{ todayTodos.length }}</el-tag>
    </div>

    <div
      class="list-item"
      :class="{ active: state.view === 'calendar' }"
      @click="setView('calendar')"
    >
      <el-icon :size="16"><Calendar /></el-icon>
      <span class="list-name">行事曆</span>
    </div>

    <div
      class="list-item"
      :class="{ active: state.view === 'weekly-review' }"
      @click="setView('weekly-review')"
    >
      <el-icon :size="16"><Finished /></el-icon>
      <span class="list-name">週報回顧</span>
    </div>

    <div class="sidebar-divider"></div>

    <el-scrollbar>
      <div
        v-for="list in sortedLists"
        :key="list.id"
        class="list-item"
        :class="{ active: state.activeListId === list.id && state.view === 'list', 'drop-target': dragOverListId === list.id }"
        @click="setActiveList(list.id); setView('list')"
        @dragover="(e) => onListDragOver(e, list.id)"
        @dragleave="onListDragLeave(list.id)"
        @drop="(e) => onListDrop(e, list.id)"
      >
        <el-icon :size="16"><List /></el-icon>

        <template v-if="renamingId === list.id">
          <el-input
            v-model="renamingName"
            size="small"
            class="list-rename-input"
            @keyup.enter="confirmRename"
            @keyup.escape="cancelRename"
            @blur="confirmRename"
            @click.stop
            autofocus
          />
        </template>

        <template v-else>
          <span class="list-name">{{ list.name }}</span>
          <span class="list-actions" @click.stop>
            <el-button
              icon="Edit"
              size="small"
              text
              @click="startRename(list)"
            />
            <el-popconfirm
              title="確定刪除此清單？"
              @confirm="deleteList(list.id)"
            >
              <template #reference>
                <el-button icon="Delete" size="small" text type="danger" />
              </template>
            </el-popconfirm>
          </span>
        </template>
      </div>
    </el-scrollbar>
  </div>
</template>
