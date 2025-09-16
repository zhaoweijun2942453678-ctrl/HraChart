// src/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router'
import EventLedger from '../components/EventLedger.vue'
import HraScreening from '../views/HraScreening.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/events', name: 'EventLedger', component: EventLedger },
    { path: '/hra-screening', name: 'HraScreening', component: HraScreening },
    { path: '/', redirect: '/events' }
  ]
})
