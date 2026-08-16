<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'

const router = useRouter()
const externalUrl = ref('')
let externalClickHandler
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

function preventTextSelection(event) {
  event.preventDefault()
}

function preventSelectAll(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
    event.preventDefault()
  }
}

onMounted(() => {
  installExternalGuard()
  restoreScrollPosition()
  window.addEventListener('scroll', scheduleScrollSave, { passive: true })
  window.addEventListener('pagehide', saveScrollPosition)
  document.addEventListener('selectstart', preventTextSelection)
  document.addEventListener('keydown', preventSelectAll)
})

onUnmounted(() => {
  if (externalClickHandler) document.removeEventListener('click', externalClickHandler, true)
  window.removeEventListener('scroll', scheduleScrollSave)
  window.removeEventListener('pagehide', saveScrollPosition)
  document.removeEventListener('selectstart', preventTextSelection)
  document.removeEventListener('keydown', preventSelectAll)
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
</template>
