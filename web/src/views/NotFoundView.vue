<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <h1>Page not found</h1>
  <p>There's nothing at this address.</p>
  <RouterLink :to="{ name: 'events' }">Back to events</RouterLink>
</template>
