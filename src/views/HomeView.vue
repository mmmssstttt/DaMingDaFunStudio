<script setup>
import { RouterLink } from 'vue-router'
import { members, works } from '../data'
import { useClipboard } from '../composables/useClipboard'
import { useFocusProgress } from '../composables/useFocusProgress'
import { useSnapScroll } from '../composables/useSnapScroll'

const email = '0800guava@gmail.com'
const { heroProgress, topButtonProgress } = useFocusProgress()
const { returningHome, smoothScrollTo, transitionToTop } = useSnapScroll()
const { copied, copy: copyEmail } = useClipboard(email)
</script>

<template>
  <main id="top" class="site-shell" :class="{ 'is-returning-home': returningHome }">
    <section class="hero-section" aria-labelledby="site-title">
      <div
        class="hero-fixed-layer"
        :style="{
          '--hero-scale': 1 + heroProgress * 0.55,
          '--hero-blur': `${heroProgress * 18}px`,
          '--hero-opacity': 1 - heroProgress,
        }"
      >
        <header class="site-title-block">
          <h1 id="site-title">
            大<span class="ming-mark">明</span>大放studio
            <small>DaMingDaFun studio</small>
          </h1>
        </header>

        <p class="studio-statement">
          <span>每一件好的設計，</span><br />
          <span>都始於理解，</span><br />
          <span>終於綻放。</span>
        </p>

        <nav class="corner-tags" aria-label="首頁段落">
          <button type="button" @click="smoothScrollTo('works')">商業作品</button>
          <button type="button" @click="smoothScrollTo('members')">成員</button>
          <button type="button" @click="smoothScrollTo('contact')">工作室信箱</button>
        </nav>
      </div>
    </section>

    <section id="works" class="content-section" aria-labelledby="works-title">
      <div class="section-heading">
        <h2 id="works-title">商業作品</h2>
      </div>
      <div class="work-list">
        <RouterLink v-for="work in works" :key="work.slug" class="work-card" :to="`/work/${work.slug}`">
          <div class="large-frame">
            <img :src="work.cover" :alt="work.coverAlt" draggable="false" />
          </div>
          <div class="item-copy">
            <h3>{{ work.title }}</h3>
            <p>{{ work.subtitle }}</p>
            <span>{{ work.summary }}</span>
          </div>
        </RouterLink>
      </div>
    </section>

    <section id="members" class="content-section" aria-labelledby="members-title">
      <div class="section-heading">
        <h2 id="members-title">成員</h2>
      </div>
      <div class="member-grid">
        <RouterLink v-for="member in members" :key="member.slug" class="member-card" :to="`/member/${member.slug}`">
          <div class="avatar-frame">
            <img :src="member.portrait" :alt="`${member.name} 的頭貼`" loading="lazy">
          </div>
          <h3>{{ member.name }}</h3>
          <p>{{ member.role }}</p>
        </RouterLink>
      </div>
    </section>

    <section id="contact" class="content-section contact-section" aria-labelledby="contact-title">
      <div class="section-heading">
        <h2 id="contact-title">工作室信箱</h2>
      </div>
      <div class="contact-grid">
        <div class="email-actions">
          <a class="mail-frame" :href="`mailto:${email}`">{{ email }}</a>
          <button class="copy-button" type="button" @click="copyEmail">{{ copied ? 'Copied' : 'Copy' }}</button>
        </div>
        <div class="form-frame">產品、體驗或打樣需求，歡迎來信聊聊。</div>
      </div>
    </section>

    <footer class="site-footer">© DaMingDaFun studio. All rights reserved.</footer>

    <button
      class="back-to-top"
      :class="{ 'is-visible': topButtonProgress > 0.08 }"
      type="button"
      aria-label="回到首頁"
      :style="{
        '--top-opacity': topButtonProgress,
        '--top-blur': `${(1 - topButtonProgress) * 12}px`,
        '--top-scale': 0.78 + topButtonProgress * 0.22,
      }"
      @click="transitionToTop"
    >
      ↑
    </button>
  </main>
</template>
