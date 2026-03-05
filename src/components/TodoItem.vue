<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import TodoDetail from './TodoDetail.vue'

const props = defineProps({
  todo: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  autoEdit: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle', 'update', 'delete', 'dragstart', 'dragenter', 'dragend', 'select', 'insert-below', 'mounted'])

const expanded = ref(false)
const editing = ref(false)
const editTitle = ref('')
const editInput = ref(null)
const itemEl = ref(null)

onMounted(() => {
  emit('mounted')
  if (props.autoEdit) {
    startEdit()
  }
})

watch(() => props.autoEdit, (val) => {
  if (val) startEdit()
})

function startEdit() {
  editing.value = true
  editTitle.value = props.todo.title
  nextTick(() => {
    editInput.value?.focus()
  })
}

function confirmEdit() {
  const trimmed = editTitle.value.trim()
  if (!trimmed) {
    // Empty title — if it was a new blank item, delete it
    if (!props.todo.title) {
      emit('delete')
    }
  } else if (trimmed !== props.todo.title) {
    emit('update', { title: trimmed })
  }
  editing.value = false
  nextTick(() => {
    itemEl.value?.focus()
  })
}

function cancelEdit() {
  if (!props.todo.title) {
    emit('delete')
  }
  editing.value = false
}

const today = new Date().toISOString().slice(0, 10)

const isOverdue = computed(() => {
  return props.todo.dueDate && !props.todo.completed && props.todo.dueDate < today
})

const scheduledLabel = computed(() => props.todo.scheduledDate)
const dueLabel = computed(() => props.todo.dueDate)

defineExpose({
  focus() {
    itemEl.value?.focus()
  },
  startEdit,
})

function onDragStart(e) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('todo-id', props.todo.id)
  emit('dragstart')
}

function onDragEnter(e) {
  e.preventDefault()
  emit('dragenter', e)
}

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}
</script>

<template>
  <div
    ref="itemEl"
    class="todo-item"
    :class="{ selected }"
    tabindex="0"
    draggable="true"
    @click="emit('select')"
    @keydown.space.prevent="emit('insert-below')"
    @dragstart="onDragStart"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragend="emit('dragend')"
  >
    <div class="todo-row">
      <span class="drag-handle">
        <el-icon :size="16"><Rank /></el-icon>
      </span>

      <el-checkbox
        :model-value="todo.completed"
        @change="emit('toggle')"
      />

      <input
        v-if="editing"
        ref="editInput"
        v-model="editTitle"
        class="todo-title-input"
        @keydown.enter="confirmEdit"
        @keydown.escape="cancelEdit"
        @blur="confirmEdit"
      />
      <span
        v-else
        class="todo-title"
        :class="{ completed: todo.completed }"
        @dblclick="startEdit"
      >
        {{ todo.title }}
      </span>

      <div class="todo-tags" v-if="todo.tags && todo.tags.length">
        <el-tag v-for="tag in todo.tags" :key="tag" size="small" type="info" class="todo-tag">{{ tag }}</el-tag>
      </div>

      <div class="todo-dates">
        <span v-if="scheduledLabel" title="預計執行日期">
          {{ scheduledLabel }}
        </span>
        <span v-if="dueLabel" :class="{ overdue: isOverdue }" title="截止日">
          {{ dueLabel }}
        </span>
      </div>

      <div class="todo-actions">
        <el-button
          :icon="expanded ? 'ArrowUp' : 'ArrowDown'"
          size="small"
          text
          @click="expanded = !expanded"
        />
        <el-popconfirm title="確定刪除此項目？" @confirm="emit('delete')">
          <template #reference>
            <el-button icon="Delete" size="small" text type="danger" />
          </template>
        </el-popconfirm>
      </div>
    </div>

    <TodoDetail
      v-if="expanded"
      :todo="todo"
      @update="(updates) => emit('update', updates)"
    />
  </div>
</template>
