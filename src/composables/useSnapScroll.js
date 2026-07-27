import { onMounted, onUnmounted, ref } from 'vue'

export function useSnapScroll() {
  const returningHome = ref(false)
  let isSnapping = false
  let touchStartY = 0

  function jumpTo(id) {
    const target = document.getElementById(id)
    if (!target) return
    window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY)
    isSnapping = false
  }

  function transitionToTop() {
    if (returningHome.value) return
    returningHome.value = true
    isSnapping = true
    window.setTimeout(() => {
      jumpTo('top')
      window.setTimeout(() => {
        returningHome.value = false
      }, 260)
    }, 260)
  }

  function smoothScrollTo(id) {
    const target = document.getElementById(id)
    if (!target) return
    const start = window.scrollY
    const end = target.getBoundingClientRect().top + start
    const distance = end - start
    const duration = 760
    const startTime = performance.now()
    isSnapping = id === 'works'

    function tick(now) {
      const elapsed = Math.min((now - startTime) / duration, 1)
      const ease = elapsed < 0.5 ? 4 * elapsed ** 3 : 1 - Math.pow(-2 * elapsed + 2, 3) / 2
      window.scrollTo(0, start + distance * ease)
      if (elapsed < 1) requestAnimationFrame(tick)
      else isSnapping = false
    }

    requestAnimationFrame(tick)
  }

  function getSnapTarget(deltaY) {
    const works = document.getElementById('works')
    if (!works) return ''
    const worksTop = works.offsetTop
    const scrollY = window.scrollY
    if (deltaY > 0 && scrollY < worksTop * 0.72) return 'works'
    if (deltaY < 0 && Math.abs(scrollY - worksTop) < window.innerHeight * 0.22) return 'top'
    return ''
  }

  function consumeSnap(target, event) {
    event.preventDefault()
    if (target === 'top') transitionToTop()
    else smoothScrollTo(target)
  }

  function handleWheel(event) {
    if (isSnapping) {
      event.preventDefault()
      return
    }
    const target = getSnapTarget(event.deltaY)
    if (target) consumeSnap(target, event)
  }

  function handleTouchStart(event) {
    touchStartY = event.touches[0]?.clientY || 0
  }

  function handleTouchMove(event) {
    if (isSnapping) {
      event.preventDefault()
      return
    }
    const currentY = event.touches[0]?.clientY || touchStartY
    const target = getSnapTarget(touchStartY - currentY)
    if (target) consumeSnap(target, event)
  }

  onMounted(() => {
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
  })

  onUnmounted(() => {
    window.removeEventListener('wheel', handleWheel)
    window.removeEventListener('touchstart', handleTouchStart)
    window.removeEventListener('touchmove', handleTouchMove)
  })

  return { returningHome, smoothScrollTo, transitionToTop }
}
