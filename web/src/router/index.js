import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import EventsView from '@/views/EventsView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // The first page loads with the app; the others are loaded when first visited
    { path: '/', name: 'events', component: EventsView },
    { path: '/events/:id', name: 'event', component: () => import('@/views/EventView.vue') },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue') },
    {
      path: '/me/registrations',
      name: 'my-registrations',
      component: () => import('@/views/MyRegistrationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true, role: 'organizer' },
    },
    {
      path: '/dashboard/new',
      name: 'event-new',
      component: () => import('@/views/EventFormView.vue'),
      meta: { requiresAuth: true, role: 'organizer' },
    },
    {
      path: '/dashboard/:id/edit',
      name: 'event-edit',
      component: () => import('@/views/EventFormView.vue'),
      meta: { requiresAuth: true, role: 'organizer' },
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  // After a refresh the user is still loading. Without waiting, an organizer looks like a guest.
  await auth.init();

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.role === 'organizer' && !auth.isOrganizer) {
    return { name: 'events' };
  }
});

export default router;
