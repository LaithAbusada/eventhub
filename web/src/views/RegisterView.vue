<script setup>
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { fieldErrors } from '@/api';

const auth = useAuthStore();
const router = useRouter();

const form = ref({ name: '', email: '', password: '', role: 'attendee' });
const errors = ref({});
const errorMessage = ref('');
const submitting = ref(false);

async function register() {
  errors.value = {};
  errorMessage.value = '';
  submitting.value = true;

  try {
    await auth.register(form.value);

    if (auth.isOrganizer) {
      await router.push({ name: 'dashboard' });
    } else {
      await router.push({ name: 'events' });
    }
  } catch (err) {
    errors.value = fieldErrors(err);

    if (err.code === 'EMAIL_TAKEN') {
      errors.value.email = err.message;
    }

    if (Object.keys(errors.value).length === 0) {
      errorMessage.value = err.message;
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <h1>Register</h1>

  <form @submit.prevent="register">
    <label>
      Name
      <input v-model.trim="form.name" autocomplete="name" required />
      <small v-if="errors.name" class="error">{{ errors.name }}</small>
    </label>

    <label>
      Email
      <input v-model.trim="form.email" type="email" autocomplete="email" required />
      <small v-if="errors.email" class="error">{{ errors.email }}</small>
    </label>

    <label>
      Password
      <input v-model="form.password" type="password" autocomplete="new-password" required />
      <small v-if="errors.password" class="error">{{ errors.password }}</small>
    </label>

    <fieldset>
      <legend>I want to</legend>
      <label class="inline">
        <input v-model="form.role" type="radio" value="attendee" />
        attend events
      </label>
      <label class="inline">
        <input v-model="form.role" type="radio" value="organizer" />
        organize events
      </label>
      <small v-if="errors.role" class="error">{{ errors.role }}</small>
    </fieldset>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <button :disabled="submitting">Create account</button>
  </form>

  <p>Already have an account? <RouterLink :to="{ name: 'login' }">Log in</RouterLink></p>
</template>
