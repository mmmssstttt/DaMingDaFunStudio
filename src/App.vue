<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'

const router = useRouter()
const cursorX = ref(0)
const cursorY = ref(0)
const cursorVisible = ref(false)
const externalUrl = ref('')
let externalClickHandler
let hoveredElement = null
let scrollSaveFrame = 0

function getScrollKey() {
  return `scroll:${window.location.hash || window.location.pathname}`
}

function saveScrollPosition() {
  sessionStorage.setItem(getScrollKey(), String(window.scrollY))
  const state = { ...(window.history.state || {}), scrollY: window.scrollY }
  window.history.replaceState(state, '')
}

function scheduleScrollSave() {
  if (scrollSaveFrame) return
  scrollSaveFrame = requestAnimationFrame(() => {
    scrollSaveFrame = 0
    saveScrollPosition()
    refreshHoverTarget()
  })
}

function restoreScrollPosition() {
  const stateY = window.history.state?.scrollY
  const storedY = sessionStorage.getItem(getScrollKey())
  const top = Number.isFinite(stateY) ? stateY : Number(storedY || 0)
  requestAnimationFrame(() => window.scrollTo(0, top))
}

function installExternalGuard() {
  externalClickHandler = (event) => {
    const anchor = event.target.closest('a[href]')
    if (!anchor) return
    const url = new URL(anchor.href, window.location.href)
    if (url.origin === window.location.origin && url.protocol !== 'mailto:') return
    event.preventDefault()
    event.stopPropagation()
    externalUrl.value = url.href
  }
  document.addEventListener('click', externalClickHandler, true)
}

function closeExternalModal() {
  externalUrl.value = ''
}

function continueExternalLink() {
  const url = externalUrl.value
  closeExternalModal()
  window.location.href = url
}

function updateCursor(event) {
  cursorX.value = event.clientX
  cursorY.value = event.clientY
  cursorVisible.value = true
  refreshHoverTarget()
}

function hideCursor() {
  cursorVisible.value = false
}

function preventTextSelection(event) {
  event.preventDefault()
}

function preventSelectAll(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
    event.preventDefault()
  }
}

function refreshHoverTarget() {
  const target = document.elementFromPoint(cursorX.value, cursorY.value)?.closest(
    'button, a, .large-frame, .member-card, .mail-frame, .back-link, .ming-mark',
  )
  if (hoveredElement === target) return
  hoveredElement?.classList.remove('is-pointer-hover')
  hoveredElement = target
  hoveredElement?.classList.add('is-pointer-hover')
}

onMounted(() => {
  installExternalGuard()
  restoreScrollPosition()
  window.addEventListener('pointermove', updateCursor, { passive: true })
  window.addEventListener('pointerleave', hideCursor)
  window.addEventListener('scroll', scheduleScrollSave, { passive: true })
  window.addEventListener('pagehide', saveScrollPosition)
  document.addEventListener('selectstart', preventTextSelection)
  document.addEventListener('keydown', preventSelectAll)
})

onUnmounted(() => {
  if (externalClickHandler) document.removeEventListener('click', externalClickHandler, true)
  window.removeEventListener('pointermove', updateCursor)
  window.removeEventListener('pointerleave', hideCursor)
  window.removeEventListener('scroll', scheduleScrollSave)
  window.removeEventListener('pagehide', saveScrollPosition)
  document.removeEventListener('selectstart', preventTextSelection)
  document.removeEventListener('keydown', preventSelectAll)
  hoveredElement?.classList.remove('is-pointer-hover')
})

router.afterEach(() => {
  document.documentElement.classList.add('route-entering')
  window.setTimeout(() => document.documentElement.classList.remove('route-entering'), 420)
  restoreScrollPosition()
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive>
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
  <div v-if="externalUrl" class="external-modal" role="dialog" aria-modal="true" aria-labelledby="external-title">
    <div class="external-dialog">
      <p id="external-title">External Website</p>
      <h2>Continue to this link?</h2>
      <span>{{ externalUrl }}</span>
      <div class="external-actions">
        <button type="button" @click="closeExternalModal">Cancel</button>
        <button type="button" @click="continueExternalLink">Continue</button>
      </div>
    </div>
  </div>
  <div
    class="hamster-cursor"
    :class="{ 'is-visible': cursorVisible }"
    :style="{ '--cursor-x': `${cursorX}px`, '--cursor-y': `${cursorY}px` }"
    aria-hidden="true"
  >
    <img src="/assets/hamster-cursor.png" alt="" />
  </div>
</template>
