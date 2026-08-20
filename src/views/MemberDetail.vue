<script setup>
import { computed, onActivated, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { members } from '../data'

const route = useRoute()
const router = useRouter()
const member = computed(() => members.find((item) => item.slug === route.params.slug) || members[0])
const isBackLeaving = ref(false)
const previousPath = computed(() => {
  route.fullPath
  return typeof window.history.state?.back === 'string' ? window.history.state.back : null
})
const returnsToHome = computed(() => previousPath.value === '/' || previousPath.value === '#/' || previousPath.value?.endsWith('#/'))
const backLabel = computed(() => (returnsToHome.value ? '回主頁' : '回上一頁'))

function goBack() {
  if (isBackLeaving.value) return
  const navigate = () => {
    if (previousPath.value?.startsWith('/')) {
      router.back()
    } else {
      router.push('/')
    }
  }

  if (returnsToHome.value) {
    isBackLeaving.value = true
    window.setTimeout(navigate, 240)
  } else {
    navigate()
  }
}

onActivated(() => {
  isBackLeaving.value = false
})
</script>

<template>
  <main class="detail-shell">
    <button class="back-link" :class="{ 'is-leaving': isBackLeaving }" type="button" @click="goBack">{{ backLabel }}</button>
    <section class="detail-layout member-detail">
      <img class="detail-visual portrait" :src="member.portrait" :alt="`${member.name} 的頭貼`">
      <article class="detail-copy">
        <h1>{{ member.name }}</h1>
        <h2>{{ member.role }}</h2>

        <h3>Experience</h3>
        <ul>
          <li v-for="item in member.experience" :key="item">{{ item }}</li>
        </ul>

        <h3>Projects</h3>
        <ul>
          <li v-for="item in member.projects" :key="item">{{ item }}</li>
        </ul>
      </article>
    </section>
  </main>
</template>
