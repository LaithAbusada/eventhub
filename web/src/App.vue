<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

async function logOut() {
  auth.logout();
  await router.push({ name: 'events' });
}
</script>

<template>
  <header class="site-header">
    <nav>
      <RouterLink :to="{ name: 'events' }">Events</RouterLink>
      <RouterLink v-if="auth.isLoggedIn" :to="{ name: 'my-registrations' }">My registrations</RouterLink>
      <RouterLink v-if="auth.isOrganizer" :to="{ name: 'dashboard' }">Dashboard</RouterLink>
    </nav>

    <div v-if="auth.isLoggedIn" class="account">
      <span v-if="auth.user">{{ auth.user.name }}</span>
      <button type="button" @click="logOut">Log out</button>
    </div>
    <RouterLink v-else :to="{ name: 'login' }">Log in</RouterLink>
  </header>

  <main>
    <RouterView />
  </main>
</template>
