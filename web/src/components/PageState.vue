<script setup>
defineProps({
  loading: Boolean,
  error: { type: Object, default: null },
  empty: Boolean,
});
</script>

<template>
  <p v-if="loading" class="page-state">Loading…</p>
  <p v-else-if="error" class="page-state error" role="alert">{{ error.message }}</p>
  <slot v-else-if="empty" name="empty" />
  <slot v-else />
</template>
