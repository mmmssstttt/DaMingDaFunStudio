import { ref } from 'vue'

export function useClipboard(text) {
  const copied = ref(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      window.setTimeout(() => {
        copied.value = false
      }, 1200)
    } catch {
      copied.value = false
    }
  }

  return { copied, copy }
}
