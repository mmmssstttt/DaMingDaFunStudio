<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { members } from '../data'

const route = useRoute()
const router = useRouter()
const member = computed(() => members.find((item) => item.slug === route.params.slug) || members[0])

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <main class="detail-shell">
    <button class="back-link" type="button" @click="goBack">回上一頁</button>
    <section class="detail-layout member-detail">
      <div class="detail-visual portrait">{{ member.name }} 頭貼</div>
      <article class="detail-copy">
        <p>成員個別頁面</p>
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
