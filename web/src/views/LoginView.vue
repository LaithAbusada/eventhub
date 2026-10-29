<script setup>
import { ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const submitting = ref(false);

// Only accept a path inside the app
function pageAfterLogin() {
  const redirect = route.query.redirect;
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    return redirect;
  }
  return '/';
}

async function logIn() {
  errorMessage.value = '';
  submitting.value = true;

  try {
    await auth.login(email.value, password.value);
    await router.push(pageAfterLogin());
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <h1>Log in</h1>

  <form @submit.prevent="logIn">
    <label>
      Email
      <input v-model.trim="email" type="email" autocomplete="email" required />
    </label>

    <label>
      Password
      <input v-model="password" type="password" autocomplete="current-password" required />
    </label>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <button :disabled="submitting">Log in</button>
  </form>

  <p>No account yet? <RouterLink :to="{ name: 'register' }">Register</RouterLink></p>
</template>
