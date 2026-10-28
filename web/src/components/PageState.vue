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
  <p v-else-if="empty" class="page-state">{{ emptyText }}</p>
  <slot v-else />
</template>
