<script setup>
import { computed, nextTick, onActivated, onDeactivated, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { works } from '../data'

const route = useRoute()
const router = useRouter()
const work = computed(() => works.find((item) => item.slug === route.params.slug) || works[0])
const otherWorks = computed(() => works.filter((item) => item.slug !== work.value.slug))
const workGallery = ref(null)
const relatedGallery = ref(null)
const showTopButton = ref(false)
const selectedPreview = ref(null)
const isBackLeaving = ref(false)
const previousPath = computed(() => {
  route.fullPath
  return typeof window.history.state?.back === 'string' ? window.history.state.back : null
})
const returnsToHome = computed(() => previousPath.value === '/' || previousPath.value === '#/' || previousPath.value?.endsWith('#/'))
const backLabel = computed(() => (returnsToHome.value ? '回主頁' : '回上一頁'))
const workCarouselState = reactive({ canScroll: false, canPrev: false, canNext: false })
const relatedCarouselState = reactive({ canScroll: false, canPrev: false, canNext: false })
let dragState = null
let suppressPreviewUntil = 0
const scrollAnimations = new WeakMap()

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

function updateCarouselState(scroller, state) {
  if (!scroller) return
  const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
  state.canScroll = maxScroll > 2
  state.canPrev = state.canScroll && scroller.scrollLeft > 2
  state.canNext = state.canScroll && scroller.scrollLeft < maxScroll - 2
}

function refreshCarousels() {
  nextTick(() => {
    updateCarouselState(workGallery.value, workCarouselState)
    updateCarouselState(relatedGallery.value, relatedCarouselState)
  })
}

function getGalleryMetrics(scroller) {
  const firstCard = scroller?.firstElementChild
  const styles = scroller ? window.getComputedStyle(scroller) : null
  const gap = Number.parseFloat(styles?.columnGap || styles?.gap || '0')
  // Computed custom properties preserve clamp(...) as text, so resolve the
  // matching CSS length here instead of passing NaN into the scroll math.
  const peek = Math.min(40, Math.max(28, window.innerWidth * 0.03))
  const step = firstCard ? firstCard.getBoundingClientRect().width + gap : scroller.clientWidth * 0.78
  const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
  return { step, peek, maxScroll }
}

function galleryTarget(scroller, index) {
  const { step, peek, maxScroll } = getGalleryMetrics(scroller)
  if (index <= 0) return 0
  return Math.max(0, Math.min(maxScroll, index * step - peek))
}

function animateGallery(scroller, target, duration = 480) {
  if (!scroller) return
  const start = scroller.scrollLeft
  const startTime = performance.now()
  const previousFrame = scrollAnimations.get(scroller)
  if (previousFrame) cancelAnimationFrame(previousFrame)
  scroller.classList.add('is-programmatic')

  function tick(now) {
    const elapsed = Math.min((now - startTime) / duration, 1)
    const ease = 1 - Math.pow(1 - elapsed, 4)
    scroller.scrollLeft = start + (target - start) * ease
    if (elapsed < 1) {
      scrollAnimations.set(scroller, requestAnimationFrame(tick))
    } else {
      scrollAnimations.delete(scroller)
      scroller.classList.remove('is-programmatic')
      updateCarouselState(scroller, scroller === workGallery.value ? workCarouselState : relatedCarouselState)
    }
  }

  scrollAnimations.set(scroller, requestAnimationFrame(tick))
}

function scrollGallery(scroller, direction) {
  if (!scroller) return
  const { step, peek, maxScroll } = getGalleryMetrics(scroller)
  const currentIndex = Math.round((scroller.scrollLeft + peek) / step)
  const maxIndex = Math.ceil((maxScroll + peek) / step)
  const nextIndex = Math.max(0, Math.min(maxIndex, currentIndex + direction))
  animateGallery(scroller, galleryTarget(scroller, nextIndex))
}

function startDrag(event) {
  if (event.pointerType !== 'mouse' || event.button !== 0) return
  const scroller = event.currentTarget
  const previousFrame = scrollAnimations.get(scroller)
  if (previousFrame) cancelAnimationFrame(previousFrame)
  scrollAnimations.delete(scroller)
  scroller.classList.remove('is-programmatic')
  dragState = {
    scroller,
    pointerId: event.pointerId,
    startX: event.clientX,
    startScrollLeft: scroller.scrollLeft,
    moved: false,
  }
}

function moveDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return
  const distance = event.clientX - dragState.startX
  if (Math.abs(distance) <= 6 && !dragState.moved) return
  event.preventDefault()
  if (!dragState.moved) {
    dragState.moved = true
    dragState.scroller.classList.add('is-dragging')
    dragState.scroller.setPointerCapture(event.pointerId)
  }
  dragState.scroller.scrollLeft = dragState.startScrollLeft - distance
}

function endDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return
  const scroller = dragState.scroller
  const { step, peek } = getGalleryMetrics(scroller)
  const nearestIndex = Math.round((scroller.scrollLeft + peek) / step)
  const target = galleryTarget(scroller, nearestIndex)
  scroller.classList.add('is-programmatic')
  scroller.classList.remove('is-dragging')
  if (scroller.hasPointerCapture(event.pointerId)) {
    scroller.releasePointerCapture(event.pointerId)
  }
  if (dragState.moved) suppressPreviewUntil = performance.now() + 280
  dragState = null
  animateGallery(scroller, target, 420)
}

function openPreview(item, index) {
  if (performance.now() < suppressPreviewUntil) return
  selectedPreview.value = { item, index }
  document.documentElement.classList.add('has-gallery-preview')
}

function openHeroPreview() {
  openPreview(
    {
      src: work.value.cover,
      alt: work.value.coverAlt,
      caption: work.value.title,
    },
    -1,
  )
}

function closePreview(event) {
  event?.stopPropagation?.()
  selectedPreview.value = null
  document.documentElement.classList.remove('has-gallery-preview')
}

function handlePreviewKeydown(event) {
  if (event.key === 'Escape' && selectedPreview.value) closePreview(event)
}

function updateTopButton() {
  showTopButton.value = window.scrollY > window.innerHeight * 0.55
}

function scrollToTop() {
  const start = window.scrollY
  const duration = 460
  const startTime = performance.now()

  function tick(now) {
    const elapsed = Math.min((now - startTime) / duration, 1)
    const ease = elapsed < 0.5 ? 4 * elapsed ** 3 : 1 - Math.pow(-2 * elapsed + 2, 3) / 2
    window.scrollTo(0, start * (1 - ease))
    if (elapsed < 1) requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}

onActivated(() => {
  isBackLeaving.value = false
  window.addEventListener('scroll', updateTopButton, { passive: true })
  window.addEventListener('resize', refreshCarousels, { passive: true })
  window.addEventListener('keydown', handlePreviewKeydown)
  updateTopButton()
  refreshCarousels()
})

onDeactivated(() => {
  window.removeEventListener('scroll', updateTopButton)
  window.removeEventListener('resize', refreshCarousels)
  window.removeEventListener('keydown', handlePreviewKeydown)
  closePreview()
})

watch(
  () => work.value.slug,
  () => {
    isBackLeaving.value = false
    closePreview()
    nextTick(() => {
      workGallery.value?.scrollTo({ left: 0 })
      relatedGallery.value?.scrollTo({ left: 0 })
      refreshCarousels()
    })
  },
)
</script>

<template>
  <main class="detail-shell work-detail-shell" :class="`work-${work.slug}`">
    <button class="back-link" :class="{ 'is-leaving': isBackLeaving }" type="button" @click="goBack">{{ backLabel }}</button>
    <article class="work-detail-page">
      <header class="work-detail-header">
        <h1>{{ work.title }}</h1>
      </header>

      <div class="detail-visual work-detail-hero">
        <button
          class="work-hero-trigger"
          type="button"
          :aria-label="`放大檢視：${work.title}`"
          @click="openHeroPreview"
        >
          <img :src="work.cover" :alt="work.coverAlt" draggable="false" />
        </button>
      </div>

      <section class="work-detail-intro">
        <h2>{{ work.subtitle }}</h2>
        <div>
          <p>{{ work.summary }}</p>
          <p>{{ work.description }}</p>
          <dl class="work-meta">
            <div><dt>年份</dt><dd>{{ work.year }}</dd></div>
            <div><dt>合作單位</dt><dd>{{ work.client }}</dd></div>
            <div><dt>設計範圍</dt><dd>{{ work.scope }}</dd></div>
          </dl>
          <p class="work-highlight">{{ work.highlight }}</p>
        </div>
      </section>

      <div class="horizontal-gallery-block">
        <div v-if="workCarouselState.canScroll" class="gallery-controls" aria-label="作品圖片控制">
          <button type="button" :disabled="!workCarouselState.canPrev" aria-label="向左瀏覽作品圖片" @click="scrollGallery(workGallery, -1)">←</button>
          <button type="button" :disabled="!workCarouselState.canNext" aria-label="向右瀏覽作品圖片" @click="scrollGallery(workGallery, 1)">→</button>
        </div>
        <div
          ref="workGallery"
          class="work-gallery horizontal-drag"
          aria-label="作品圖片"
          @scroll.passive="updateCarouselState(workGallery, workCarouselState)"
          @pointerdown="startDrag"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <figure v-for="(item, index) in work.gallery" :key="item.src" class="work-gallery-card">
            <button
              class="gallery-preview-trigger"
              type="button"
              :aria-label="`放大檢視：${item.caption}`"
              @click="openPreview(item, index)"
            >
              <img class="gallery-visual" :src="item.src" :alt="item.alt" loading="lazy" draggable="false" />
            </button>
            <figcaption>{{ item.caption }}</figcaption>
          </figure>
        </div>
      </div>

      <div class="related-gallery-block">
        <div v-if="relatedCarouselState.canScroll" class="gallery-controls" aria-label="其他作品控制">
          <button type="button" :disabled="!relatedCarouselState.canPrev" aria-label="向左瀏覽其他作品" @click="scrollGallery(relatedGallery, -1)">←</button>
          <button type="button" :disabled="!relatedCarouselState.canNext" aria-label="向右瀏覽其他作品" @click="scrollGallery(relatedGallery, 1)">→</button>
        </div>
        <nav
          ref="relatedGallery"
          class="related-work-gallery horizontal-drag"
          aria-label="其他作品"
          @scroll.passive="updateCarouselState(relatedGallery, relatedCarouselState)"
        >
          <RouterLink
            v-for="(item, index) in otherWorks"
            :key="item.slug"
            class="related-work-card"
            :to="`/work/${item.slug}`"
          >
            <img class="related-work-visual" :src="item.cover" :alt="item.coverAlt" loading="lazy" draggable="false" />
            <div>
              <h2>{{ item.title }}</h2>
              <p>{{ item.subtitle }}</p>
            </div>
          </RouterLink>
        </nav>
      </div>
    </article>

    <Teleport to="body">
      <Transition name="gallery-lightbox">
        <div
          v-if="selectedPreview"
          class="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          :aria-label="selectedPreview.item.caption"
          @click.self="closePreview"
        >
          <button class="gallery-lightbox-close" type="button" aria-label="關閉大圖" @click="closePreview">×</button>
          <div class="gallery-lightbox-content" @click.stop>
            <img
              class="gallery-lightbox-visual gallery-visual"
              :src="selectedPreview.item.src"
              :alt="selectedPreview.item.alt"
              draggable="false"
            />
            <p>{{ selectedPreview.item.caption }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <button
      class="detail-back-to-top"
      :class="{ 'is-visible': showTopButton }"
      type="button"
      aria-label="回到作品頁頂端"
      @click="scrollToTop"
    >
      ↑
    </button>
  </main>
</template>
