<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { api, fieldErrors } from '@/api';
import PageState from '@/components/PageState.vue';

const COMMON_CATEGORIES = ['art', 'business', 'food', 'music', 'outdoors', 'sports', 'tech', 'workshop'];

const route = useRoute();
const router = useRouter();

// /dashboard/new has no id; /dashboard/:id/edit has one
const eventId = route.params.id;
const isEditing = eventId !== undefined;

const form = ref({ title: '', description: '', startsAt: '', price: 0, venue: '', categories: [] });
const venues = ref([]);
const loading = ref(true);
const loadError = ref(null);

const errors = ref({});
const errorMessage = ref('');
const saving = ref(false);

const heading = computed(() => {
  if (isEditing) {
    return 'Edit event';
  }
  return 'New event';
});

// The common categories, plus any other category this event already has, so editing never drops one
const categoryChoices = computed(() => {
  const choices = [...COMMON_CATEGORIES];
  for (const category of form.value.categories) {
    if (!choices.includes(category)) {
      choices.push(category);
    }
  }
  return choices;
});

// <input type="datetime-local"> works in local time with no timezone, like "2026-11-01T18:00"
function toLocalInput(isoString) {
  const date = new Date(isoString);
  const offsetMs = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

function toIsoString(localValue) {
  if (localValue === '') {
    // Let the API answer with an error under the date field
    return '';
  }
  return new Date(localValue).toISOString();
}

onMounted(async () => {
  try {
    venues.value = await api('/venues');

    if (isEditing) {
      const event = await api(`/events/${eventId}`);
      form.value = {
        title: event.title,
        description: event.description,
        startsAt: toLocalInput(event.startsAt),
        price: event.price,
        venue: event.venue._id,
        categories: [...event.categories],
      };
    }
  } catch (err) {
    loadError.value = err;
  } finally {
    loading.value = false;
  }
});

async function save() {
  errors.value = {};
  errorMessage.value = '';
  saving.value = true;

  const body = {
    title: form.value.title,
    description: form.value.description,
    startsAt: toIsoString(form.value.startsAt),
    price: form.value.price,
    venue: form.value.venue,
    categories: form.value.categories,
  };

  try {
    if (isEditing) {
      await api(`/events/${eventId}`, { method: 'PUT', body: body });
    } else {
      await api('/events', { method: 'POST', body: body });
    }
    await router.push({ name: 'dashboard' });
  } catch (err) {
    errors.value = fieldErrors(err);

    // Not about one field (like a venue that's too small, or someone else's event): show it above the button
    if (Object.keys(errors.value).length === 0) {
      errorMessage.value = err.message;
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <h1>{{ heading }}</h1>

  <PageState :loading="loading" :error="loadError">
    <form @submit.prevent="save">
      <label>
        Title
        <input v-model="form.title" required />
      </label>
      <small v-if="errors.title" class="error">{{ errors.title }}</small>

      <label>
        Description
        <textarea v-model="form.description" rows="5"></textarea>
      </label>
      <small v-if="errors.description" class="error">{{ errors.description }}</small>

      <label>
        Starts at
        <input v-model="form.startsAt" type="datetime-local" required />
      </label>
      <small v-if="errors.startsAt" class="error">{{ errors.startsAt }}</small>

      <label>
        Price (JOD)
        <input v-model.number="form.price" type="number" min="0" step="any" required />
      </label>
      <small v-if="errors.price" class="error">{{ errors.price }}</small>

      <label>
        Venue
        <select v-model="form.venue" required>
          <option value="" disabled>Choose a venue</option>
          <option v-for="venue in venues" :key="venue._id" :value="venue._id">
            {{ venue.name }}, {{ venue.city }} ({{ venue.capacity }} seats)
          </option>
        </select>
      </label>
      <small v-if="errors.venue" class="error">{{ errors.venue }}</small>

      <fieldset>
        <legend>Categories (up to 5)</legend>
        <label v-for="category in categoryChoices" :key="category" class="inline">
          <input v-model="form.categories" type="checkbox" :value="category" />
          {{ category }}
        </label>
      </fieldset>
      <small v-if="errors.categories" class="error">{{ errors.categories }}</small>

      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

      <div class="form-actions">
        <button :disabled="saving">Save</button>
        <RouterLink :to="{ name: 'dashboard' }">Cancel</RouterLink>
      </div>
    </form>
  </PageState>
</template>
