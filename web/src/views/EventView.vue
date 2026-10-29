<script setup>
import { ref, computed, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { api } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { formatDate, formatPrice } from '@/format';
import PageState from '@/components/PageState.vue';

const route = useRoute();
const auth = useAuthStore();

const event = ref(null);
const loading = ref(true);
const error = ref(null);

const isRegistered = ref(false);
const working = ref(false);
const actionMessage = ref('');

const isSoldOut = computed(() => {
  return event.value !== null && event.value.seatsLeft <= 0;
});

const buttonText = computed(() => {
  if (isRegistered.value) {
    return 'Cancel my registration';
  }
  if (isSoldOut.value) {
    return 'Sold out';
  }
  return 'Register';
});

// You can always cancel, but only register while seats are left
const buttonDisabled = computed(() => {
  if (working.value) {
    return true;
  }
  return isSoldOut.value && !isRegistered.value;
});

async function findMyRegistration(eventId) {
  if (!auth.isLoggedIn) {
    return false;
  }

  const registrations = await api('/me/registrations');
  for (const registration of registrations) {
    if (registration.event !== null && registration.event._id === eventId) {
      return true;
    }
  }
  return false;
}

async function fetchEventAndRegistration() {
  const eventId = route.params.id;

  const eventRequest = api(`/events/${eventId}`);
  const registrationRequest = findMyRegistration(eventId);
  const [loadedEvent, registered] = await Promise.all([eventRequest, registrationRequest]);

  event.value = loadedEvent;
  isRegistered.value = registered;
}

async function loadPage() {
  loading.value = true;
  error.value = null;
  actionMessage.value = '';

  try {
    await fetchEventAndRegistration();
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
}

async function registerOrCancel() {
  const eventId = route.params.id;
  actionMessage.value = '';
  working.value = true;

  try {
    if (isRegistered.value) {
      await api(`/events/${eventId}/register`, { method: 'DELETE' });
    } else {
      await api(`/events/${eventId}/register`, { method: 'POST', body: { ticketCount: 1 } });
    }
  } catch (err) {
    actionMessage.value = err.message;
  }

  // Reload either way: the seat count changed, or someone else took the last seat
  try {
    await fetchEventAndRegistration();
  } catch (err) {
    actionMessage.value = err.message;
  } finally {
    working.value = false;
  }
}

watch(
  () => route.params.id,
  () => {
    if (route.name === 'event') {
      loadPage();
    }
  },
  { immediate: true },
);
</script>

<template>
  <PageState :loading="loading" :error="error">
    <article v-if="event" class="event">
      <h1>{{ event.title }}</h1>
      <p class="meta">{{ formatDate(event.startsAt) }} · {{ formatPrice(event.price) }}</p>
      <p v-if="event.categories.length > 0" class="categories">{{ event.categories.join(', ') }}</p>

      <p v-if="event.description" class="description">{{ event.description }}</p>

      <h2>Venue</h2>
      <p>
        {{ event.venue.name }}<br />
        {{ event.venue.address }}, {{ event.venue.city }}
      </p>

      <p v-if="event.organizer">Organized by {{ event.organizer.name }}</p>
      <p class="seats">Seats left: {{ event.seatsLeft }} of {{ event.venue.capacity }}</p>

      <div v-if="auth.isLoggedIn" class="registration">
        <button type="button" :disabled="buttonDisabled" @click="registerOrCancel">{{ buttonText }}</button>
        <p v-if="actionMessage" class="error" role="alert">{{ actionMessage }}</p>
      </div>
      <RouterLink
        v-else
        :to="{ name: 'login', query: { redirect: route.fullPath } }"
      >Log in to register</RouterLink>
    </article>
  </PageState>
</template>
