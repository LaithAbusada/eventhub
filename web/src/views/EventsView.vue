<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { api } from '@/api';
import { formatDate, formatPrice } from '@/format';
import PageState from '@/components/PageState.vue';

// The filters, in the order they appear in the URL
const FILTER_FIELDS = ['q', 'city', 'category', 'from', 'to', 'minPrice', 'maxPrice', 'sort'];
const DEFAULT_SORT = 'relevance';

const route = useRoute();
const router = useRouter();

const form = ref(emptyForm());
const cities = ref([]);

const results = ref([]);
const total = ref(0);
const page = ref(1);
const size = ref(12);
const loading = ref(false);
const error = ref(null);
const searchIsDown = ref(false);

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(total.value / size.value));
});

const totalText = computed(() => {
  if (total.value === 1) {
    return '1 event';
  }
  return `${total.value} events`;
});

function emptyForm() {
  return { q: '', city: '', category: '', from: '', to: '', minPrice: '', maxPrice: '', sort: DEFAULT_SORT };
}

// Empty values and the default sort stay out of the URL, so "/" means "no filters"
function isWorthKeeping(field, value) {
  if (value === '') {
    return false;
  }
  if (field === 'sort' && value === DEFAULT_SORT) {
    return false;
  }
  return true;
}

function filtersFromForm() {
  const filters = {};
  for (const field of FILTER_FIELDS) {
    const value = String(form.value[field]).trim();
    if (isWorthKeeping(field, value)) {
      filters[field] = value;
    }
  }
  return filters;
}

function filtersFromUrl() {
  const filters = {};
  for (const field of FILTER_FIELDS) {
    const value = route.query[field];
    if (typeof value === 'string' && isWorthKeeping(field, value)) {
      filters[field] = value;
    }
  }
  return filters;
}

function pageFromUrl() {
  const pageNumber = Number(route.query.page);
  if (Number.isInteger(pageNumber) && pageNumber >= 1) {
    return pageNumber;
  }
  return 1;
}

function copyUrlIntoForm() {
  const filters = filtersFromUrl();
  const nextForm = emptyForm();
  for (const field of FILTER_FIELDS) {
    if (filters[field] !== undefined) {
      nextForm[field] = filters[field];
    }
  }
  form.value = nextForm;
}

// The plain event list (used when search is down), in the same shape as search results
function toResult(event) {
  return {
    _id: event._id,
    title: event.title,
    startsAt: event.startsAt,
    venueName: event.venue.name,
    city: event.venue.city,
    price: event.price,
    highlight: {},
  };
}

// --- Loading results for what's in the URL ---

let currentRequest = null;

async function loadPlainListInstead(pageNumber, request) {
  try {
    const data = await api(`/events?page=${pageNumber}`, { signal: request.signal });

    const plainResults = [];
    for (const event of data.items) {
      plainResults.push(toResult(event));
    }

    results.value = plainResults;
    total.value = data.total;
    page.value = data.page;
    size.value = data.size;
  } catch (err) {
    if (err.name !== 'AbortError') {
      error.value = err;
    }
  }
}

async function loadResults() {
  // A newer search replaces the one still running
  if (currentRequest !== null) {
    currentRequest.abort();
  }
  const request = new AbortController();
  currentRequest = request;

  loading.value = true;
  error.value = null;
  searchIsDown.value = false;

  const pageNumber = pageFromUrl();
  const query = new URLSearchParams({ ...filtersFromUrl(), page: String(pageNumber) });

  try {
    const data = await api(`/events/search?${query}`, { signal: request.signal });
    results.value = data.results;
    total.value = data.total;
    page.value = data.page;
    size.value = data.size;
  } catch (err) {
    if (err.name === 'AbortError') {
      return;
    }

    if (err.code === 'SEARCH_UNAVAILABLE') {
      // Never a blank page: show the plain list, without filters
      searchIsDown.value = true;
      await loadPlainListInstead(pageNumber, request);
    } else {
      error.value = err;
    }
  } finally {
    // Only the newest request may switch loading off
    if (currentRequest === request) {
      loading.value = false;
    }
  }
}

// The URL is the source of truth: on load, Back/Forward, a shared link or a filter change
watch(
  () => route.query,
  () => {
    // Leaving this page also changes the query: nothing to do then
    if (route.name !== 'events') {
      return;
    }
    copyUrlIntoForm();
    loadResults();
  },
  { immediate: true },
);

// --- Writing the form into the URL, 300 ms after the last change ---

let debounceTimer = null;

function applyFormToUrl() {
  const filters = filtersFromForm();

  // The form already matches the URL (it was just filled from it, or Next was clicked): leave it
  if (JSON.stringify(filters) === JSON.stringify(filtersFromUrl())) {
    return;
  }

  // replace, not push: Back shouldn't step through every keystroke.
  // No page in the query, so new filters start again at page 1.
  router.replace({ name: 'events', query: filters });
}

watch(
  form,
  () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFormToUrl, 300);
  },
  { deep: true },
);

// push, not replace: Back should return to the previous page of results
function goToPage(pageNumber) {
  const query = { ...route.query };
  if (pageNumber === 1) {
    delete query.page;
  } else {
    query.page = String(pageNumber);
  }
  router.push({ name: 'events', query: query });
}

onMounted(async () => {
  try {
    const venues = await api('/venues');
    const uniqueCities = new Set();
    for (const venue of venues) {
      uniqueCities.add(venue.city);
    }
    cities.value = [...uniqueCities].sort();
  } catch {
    // Without the list, the city filter only offers "Any city"
  }
});

onBeforeUnmount(() => {
  clearTimeout(debounceTimer);
  if (currentRequest !== null) {
    currentRequest.abort();
  }
});
</script>

<template>
  <h1>Events</h1>

  <form class="filters" @submit.prevent>
    <label class="wide">
      Search
      <input v-model="form.q" type="search" placeholder="Jazz, workshop, Amman…" />
    </label>

    <label>
      City
      <select v-model="form.city">
        <option value="">Any city</option>
        <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
      </select>
    </label>

    <label>
      Category
      <input v-model="form.category" placeholder="e.g. music" />
    </label>

    <label>
      From
      <input v-model="form.from" type="date" />
    </label>

    <label>
      To
      <input v-model="form.to" type="date" />
    </label>

    <label>
      Min price (JOD)
      <input v-model.number="form.minPrice" type="number" min="0" />
    </label>

    <label>
      Max price (JOD)
      <input v-model.number="form.maxPrice" type="number" min="0" />
    </label>

    <label>
      Sort
      <select v-model="form.sort">
        <option value="relevance">Best match</option>
        <option value="soonest">Soonest</option>
        <option value="cheapest">Cheapest</option>
      </select>
    </label>
  </form>

  <p v-if="searchIsDown" class="banner" role="status">
    Search is down right now, so the filters are off. Showing all upcoming events instead.
  </p>

  <PageState
    :loading="loading"
    :error="error"
    :empty="results.length === 0"
    empty-text="No events match these filters. Try removing one."
  >
    <p class="total">{{ totalText }}</p>

    <ul class="results">
      <li v-for="event in results" :key="event._id">
        <RouterLink class="result-title" :to="{ name: 'event', params: { id: event._id } }">
          <!-- v-html is safe here only because the API asked Elasticsearch to escape the text (encoder: 'html') -->
          <span v-if="event.highlight.title" v-html="event.highlight.title[0]"></span>
          <span v-else>{{ event.title }}</span>
        </RouterLink>
        <p class="meta">
          {{ formatDate(event.startsAt) }} · {{ event.venueName }}, {{ event.city }} · {{ formatPrice(event.price) }}
        </p>
        <p v-if="event.highlight.description" class="snippet" v-html="event.highlight.description[0]"></p>
      </li>
    </ul>

    <nav class="pager">
      <button type="button" :disabled="page <= 1" @click="goToPage(page - 1)">Previous</button>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button type="button" :disabled="page >= totalPages" @click="goToPage(page + 1)">Next</button>
    </nav>
  </PageState>
</template>
