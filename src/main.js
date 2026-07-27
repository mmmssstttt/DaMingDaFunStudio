import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import WorkDetail from './views/WorkDetail.vue'
import MemberDetail from './views/MemberDetail.vue'
import './styles.css'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/work/:slug', name: 'work', component: WorkDetail },
  { path: '/member/:slug', name: 'member', component: MemberDetail },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

createApp(App).use(router).mount('#app')
