<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  todo: { type: Object, required: true },
})

const emit = defineEmits(['update'])

const note = computed({
  get: () => props.todo.note,
  set: (val) => emit('update', { note: val }),
})

const scheduledDate = computed({
  get: () => props.todo.scheduledDate,
  set: (val) => emit('update', { scheduledDate: val }),
})

const dueDate = computed({
  get: () => props.todo.dueDate,
  set: (val) => emit('update', { dueDate: val }),
})

const tags = computed(() => props.todo.tags || [])
const newTag = ref('')

function addTag() {
  const tag = newTag.value.trim()
  if (!tag || tags.value.includes(tag)) { newTag.value = ''; return }
  emit('update', { tags: [...tags.value, tag] })
  newTag.value = ''
}

function removeTag(tag) {
  emit('update', { tags: tags.value.filter((t) => t !== tag) })
}
</script>

<template>
  <div class="todo-detail">
    <div class="detail-section">
      <div class="detail-label">備註</div>
      <el-input
        v-model="note"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 6 }"
        placeholder="新增備註..."
      />
    </div>
    <div class="detail-section">
      <div class="date-row">
        <div class="date-field">
          <div class="detail-label">預計執行日期</div>
          <el-date-picker
            v-model="scheduledDate"
            type="date"
            placeholder="選擇日期"
            value-format="YYYY-MM-DD"
            size="small"
          />
        </div>
        <div class="date-field">
          <div class="detail-label">截止日</div>
          <el-date-picker
            v-model="dueDate"
            type="date"
            placeholder="選擇日期"
            value-format="YYYY-MM-DD"
            size="small"
          />
        </div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-label">標籤</div>
      <div class="tag-editor">
        <el-tag
          v-for="tag in tags"
          :key="tag"
          closable
          size="small"
          @close="removeTag(tag)"
          class="tag-item"
        >{{ tag }}</el-tag>
        <el-input
          v-model="newTag"
          size="small"
          placeholder="新增標籤..."
          class="tag-input"
          @keydown.enter="addTag"
        />
      </div>
    </div>
  </div>
</template>
