<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import TodoDetail from './TodoDetail.vue'

const props = defineProps({
  todo: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  autoEdit: { type: Boolean, default: false },
  draggable: { type: Boolean, default: true },
  showDates: { type: Boolean, default: true },
})

const emit = defineEmits(['toggle', 'update', 'delete', 'dragstart', 'dragenter', 'dragend', 'select', 'insert-below', 'mounted', 'schedule-today'])

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

watch(() => props.selected, (val) => {
  if (!val) expanded.value = false
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
    // Empty title — revert to original; if it was a new blank item, delete it
    if (!props.todo.title) {
      emit('delete')
    } else {
      editTitle.value = props.todo.title
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

const today = computed(() => new Date().toISOString().slice(0, 10))

const isScheduledToday = computed(() => props.todo.scheduledDate === today.value)

const isOverdue = computed(() => {
  return props.todo.dueDate && !props.todo.completed && props.todo.dueDate < today.value
})

const scheduledLabel = computed(() => props.todo.scheduledDate)
const dueLabel = computed(() => props.todo.dueDate)
const completedLabel = computed(() => {
  if (!props.todo.completedAt) return null
  return props.todo.completedAt.slice(0, 10)
})

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
    :draggable="draggable"
    @click="emit('select')"
    @keydown.space.self.prevent="emit('insert-below')"
    @dragstart="onDragStart"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragend="emit('dragend')"
  >
    <div class="todo-row">
      <span v-if="draggable" class="drag-handle">
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

      <div class="todo-dates" v-if="showDates">
        <span v-if="completedLabel" class="completed-date" title="完成日期">
          ✓ {{ completedLabel }}
        </span>
        <span v-if="scheduledLabel" title="預計執行日期">
          {{ scheduledLabel }}
        </span>
        <span v-if="dueLabel" :class="{ overdue: isOverdue }" title="截止日">
          {{ dueLabel }}
        </span>
      </div>

      <div class="todo-actions">
        <el-tooltip v-if="!todo.completed" :content="isScheduledToday ? '取消今日排程' : '排到今天'" placement="top">
          <el-button
            icon="Sunny"
            size="small"
            text
            :type="isScheduledToday ? 'warning' : ''"
            @click.stop="emit('schedule-today')"
          />
        </el-tooltip>
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
      @click.stop
    />
  </div>
</template>
