<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { TresCanvas, useRenderLoop } from '@tresjs/core'

const groupRef = ref()
const pointer = { x: 0, y: 0 }

function updatePointer(event) {
  pointer.x = (event.clientX / window.innerWidth - 0.5) * 2
  pointer.y = (event.clientY / window.innerHeight - 0.5) * 2
}

onMounted(() => {
  window.addEventListener('pointermove', updatePointer, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('pointermove', updatePointer)
})

useRenderLoop().onLoop(({ elapsed }) => {
  if (!groupRef.value) return
  groupRef.value.rotation.y += (pointer.x * 0.45 - groupRef.value.rotation.y) * 0.04
  groupRef.value.rotation.x += (pointer.y * 0.28 - groupRef.value.rotation.x) * 0.04
  groupRef.value.rotation.z = Math.sin(elapsed * 0.35) * 0.04
})
</script>

<template>
  <div class="wire-hero" aria-label="Tres.js immersive wireframe">
    <TresCanvas clear-color="#ffffff" shadows="false">
      <TresPerspectiveCamera :position="[0, 0, 7]" :look-at="[0, 0, 0]" />
      <TresAmbientLight :intensity="1" />
      <TresGroup ref="groupRef">
        <TresMesh :rotation="[0.45, 0.55, 0]">
          <TresBoxGeometry :args="[2.9, 2.9, 2.9]" />
          <TresMeshBasicMaterial color="#ffffff" wireframe />
        </TresMesh>
        <TresMesh :position="[2.8, -0.5, -1]" :rotation="[0.2, 0.1, 0.3]">
          <TresTorusGeometry :args="[1.05, 0.08, 10, 36]" />
          <TresMeshBasicMaterial color="#111111" wireframe />
        </TresMesh>
        <TresMesh :position="[-2.8, 0.7, -0.5]" :rotation="[0.2, 0.7, 0.1]">
          <TresConeGeometry :args="[0.95, 2, 4]" />
          <TresMeshBasicMaterial color="#111111" wireframe />
        </TresMesh>
      </TresGroup>
    </TresCanvas>
  </div>
</template>
