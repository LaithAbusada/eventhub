<!-- Wraps a page's content: shows loading, an error or an empty message instead of it when needed -->
<script setup>
defineProps({
  loading: Boolean,
  error: { type: Object, default: null },
  empty: Boolean,
  emptyText: { type: String, default: 'Nothing here yet.' },
});
</script>

<template>
  <p v-if="loading" class="page-state">Loading…</p>
  <p v-else-if="error" class="page-state error" role="alert">{{ error.message }}</p>
  <template v-else-if="empty">
    <!-- A page can pass its own empty message (with a link, say) as <template #empty> -->
    <slot name="empty">
      <p class="page-state">{{ emptyText }}</p>
    </slot>
  </template>
  <slot v-else />
</template>
