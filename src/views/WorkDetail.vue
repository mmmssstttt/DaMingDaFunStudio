<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { works } from '../data'

const route = useRoute()
const router = useRouter()
const work = computed(() => works.find((item) => item.slug === route.params.slug) || works[0])

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
    <section class="detail-layout">
      <div class="detail-visual">{{ work.title }} 詳細大圖片</div>
      <article class="detail-copy">
        <p>作品介紹</p>
        <h1>{{ work.title }}</h1>
        <h2>{{ work.subtitle }}</h2>
        <ul>
          <li v-for="item in work.detail" :key="item">{{ item }}</li>
        </ul>
        <p class="future-note">未來方向：粒子即時演算互動 / 3D模型呈現互動</p>
      </article>
    </section>
  </main>
</template>
