<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '@/api';
import { formatDate } from '@/format';
import PageState from '@/components/PageState.vue';

const registrations = ref([]);
const loading = ref(true);
const error = ref(null);

function ticketText(count) {
  if (count === 1) {
    return '1 ticket';
  }
  return `${count} tickets`;
}

onMounted(async () => {
  try {
    const allRegistrations = await api('/me/registrations');

    // Skip any whose event no longer exists: there's nothing to show or link to
    const withEvents = [];
    for (const registration of allRegistrations) {
      if (registration.event !== null) {
        withEvents.push(registration);
      }
    }
    registrations.value = withEvents;
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <h1>My registrations</h1>

  <PageState :loading="loading" :error="error" :empty="registrations.length === 0">
    <template #empty>
      <p class="page-state">
        You haven't registered for any events yet.
        <RouterLink :to="{ name: 'events' }">Find an event</RouterLink>
      </p>
    </template>

    <ul class="results">
      <li v-for="registration in registrations" :key="registration._id">
        <RouterLink class="result-title" :to="{ name: 'event', params: { id: registration.event._id } }">
          {{ registration.event.title }}
        </RouterLink>
        <p class="meta">
          {{ formatDate(registration.event.startsAt) }} ·
          {{ registration.event.venue.name }}, {{ registration.event.venue.city }} ·
          {{ ticketText(registration.ticketCount) }}
        </p>
      </li>
    </ul>
  </PageState>
</template>
