<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '@/api';
import { formatDate } from '@/format';
import PageState from '@/components/PageState.vue';

const events = ref([]);
const loading = ref(true);
const error = ref(null);
const deleteMessage = ref('');

async function loadEvents() {
  loading.value = true;
  error.value = null;

  try {
    events.value = await api('/me/events');
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
}

async function deleteEvent(event) {
  const sure = confirm(`Delete "${event.title}"? Its registrations are deleted too.`);
  if (!sure) {
    return;
  }

  deleteMessage.value = '';
  try {
    await api(`/events/${event._id}`, { method: 'DELETE' });
  } catch (err) {
    deleteMessage.value = err.message;
  }

  await loadEvents();
}

onMounted(loadEvents);
</script>

<template>
  <div class="page-heading">
    <h1>Dashboard</h1>
    <RouterLink class="button" :to="{ name: 'event-new' }">New event</RouterLink>
  </div>

  <p v-if="deleteMessage" class="error" role="alert">{{ deleteMessage }}</p>

  <PageState :loading="loading" :error="error" :empty="events.length === 0">
    <template #empty>
      <p class="page-state">
        You haven't created any events yet.
        <RouterLink :to="{ name: 'event-new' }">Create your first one</RouterLink>
      </p>
    </template>

    <table class="dashboard">
      <thead>
        <tr>
          <th>Event</th>
          <th>Date</th>
          <th>Venue</th>
          <th>Registrations</th>
          <th>Seats left</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="event in events" :key="event._id">
          <td>
            <RouterLink :to="{ name: 'event', params: { id: event._id } }">{{ event.title }}</RouterLink>
          </td>
          <td>{{ formatDate(event.startsAt) }}</td>
          <td>{{ event.venue.name }}, {{ event.venue.city }}</td>
          <td>{{ event.registrationCount }}</td>
          <td>{{ event.seatsLeft }} of {{ event.venue.capacity }}</td>
          <td class="actions">
            <RouterLink :to="{ name: 'event-edit', params: { id: event._id } }">Edit</RouterLink>
            <button type="button" @click="deleteEvent(event)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
  </PageState>
</template>
