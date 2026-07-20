import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '今日' },
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('@/views/Calendar.vue'),
    meta: { title: '日历' },
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('@/views/Stats.vue'),
    meta: { title: '统计' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '设置' },
  },
  {
    path: '/day/:date',
    name: 'dayDetail',
    component: () => import('@/views/DayDetail.vue'),
    meta: { title: '日期详情' },
  },
]

const router = createRouter({
  history: createWebHashHistory('/jishi/'),
  routes,
})

export default router
