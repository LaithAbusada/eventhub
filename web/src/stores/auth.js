import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { api, ApiError, TOKEN_KEY } from '@/api';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY));
  const user = ref(null);

  const isLoggedIn = computed(() => {
    return token.value !== null;
  });

  const isOrganizer = computed(() => {
    return user.value !== null && user.value.role === 'organizer';
  });

  function saveSession(session) {
    token.value = session.token;
    user.value = session.user;
    localStorage.setItem(TOKEN_KEY, session.token);
  }

  async function login(email, password) {
    const session = await api('/auth/login', {
      method: 'POST',
      body: { email: email, password: password },
    });
    saveSession(session);
  }

  async function register(form) {
    const session = await api('/auth/register', { method: 'POST', body: form });
    saveSession(session);
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  // The /auth/me request in progress, shared by everyone who calls init() while it runs
  let loadingUser = null;

  async function loadUser() {
    try {
      user.value = await api('/auth/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
      } else {
        // The API is down or broken: keep the token, the next init() tries again
        console.error('Could not load the logged-in user:', err);
      }
    } finally {
      loadingUser = null;
    }
  }

  // After a page refresh there's only a token: load the user it belongs to
  async function init() {
    if (!token.value || user.value) {
      return;
    }

    if (loadingUser === null) {
      loadingUser = loadUser();
    }

    await loadingUser;
  }

  return { token, user, isLoggedIn, isOrganizer, login, register, logout, init };
});
