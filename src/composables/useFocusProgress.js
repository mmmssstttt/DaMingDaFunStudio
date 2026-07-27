import { onMounted, onUnmounted, ref } from 'vue'

export function useFocusProgress() {
  const heroProgress = ref(0)
  const topButtonProgress = ref(0)
  let targetHeroProgress = 0
  let targetTopButtonProgress = 0
  let frame = 0

  function updateTargets() {
    const scrollY = window.scrollY
    targetHeroProgress = Math.min(scrollY / (window.innerHeight * 0.65), 1)
    targetTopButtonProgress = scrollY > window.innerHeight * 0.65 ? 1 : 0
  }

  function animate() {
    heroProgress.value += (targetHeroProgress - heroProgress.value) * 0.12
    topButtonProgress.value += (targetTopButtonProgress - topButtonProgress.value) * 0.14

    if (Math.abs(targetHeroProgress - heroProgress.value) < 0.001) heroProgress.value = targetHeroProgress
    if (Math.abs(targetTopButtonProgress - topButtonProgress.value) < 0.001) {
      topButtonProgress.value = targetTopButtonProgress
    }

    frame = requestAnimationFrame(animate)
  }

  onMounted(() => {
    window.addEventListener('scroll', updateTargets, { passive: true })
    updateTargets()
    frame = requestAnimationFrame(animate)
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', updateTargets)
    cancelAnimationFrame(frame)
  })

  return { heroProgress, topButtonProgress }
}
