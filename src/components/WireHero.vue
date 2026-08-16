<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { TresCanvas, useRenderLoop } from '@tresjs/core'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Points,
  ShaderMaterial,
} from 'three'

const lowPower = typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 4
const particleCount = lowPower ? 620 : 1100
const positions = new Float32Array(particleCount * 3)
const targets = new Float32Array(particleCount * 3)
const velocities = new Float32Array(particleCount * 3)
const colors = new Float32Array(particleCount * 3)
const pointer = { x: 0, y: 0, lookX: 0, lookY: 0, active: false }
const formIndex = ref(0)
const formNames = ['ORBIT', 'BLOOM', 'WAVE', 'HEART']
const geometry = new BufferGeometry()
let autoTimer = 0
let gatherTimer = 0

const palette = ['#151515', '#b8e986', '#f4a7ad', '#aaa3ff']

for (let index = 0; index < particleCount; index += 1) {
  const offset = index * 3
  positions[offset] = (Math.random() - 0.5) * 12
  positions[offset + 1] = (Math.random() - 0.5) * 8
  positions[offset + 2] = (Math.random() - 0.5) * 8

  const color = new Color(palette[index % palette.length])
  colors[offset] = color.r
  colors[offset + 1] = color.g
  colors[offset + 2] = color.b
}

const positionAttribute = new BufferAttribute(positions, 3)
positionAttribute.setUsage(DynamicDrawUsage)
geometry.setAttribute('position', positionAttribute)
geometry.setAttribute('color', new BufferAttribute(colors, 3))

const material = new ShaderMaterial({
  transparent: true,
  depthWrite: false,
  vertexColors: true,
  vertexShader: `
    varying vec3 vColor;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp(28.0 / -mvPosition.z, 2.0, 7.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
      if (distanceToCenter > 0.5) discard;
      float edge = 1.0 - smoothstep(0.32, 0.5, distanceToCenter);
      gl_FragColor = vec4(vColor, edge * 0.92);
    }
  `,
})

const points = new Points(geometry, material)

function formPosition(form, index) {
  const progress = index / particleCount
  const angle = progress * Math.PI * 2
  const band = ((index * 29) % 41) / 41 - 0.5

  if (form === 1) {
    const phi = Math.acos(1 - 2 * (index + 0.5) / particleCount)
    const theta = Math.PI * (1 + Math.sqrt(5)) * index
    const radius = 2.15 + Math.sin(index * 0.7) * 0.08
    return [
      Math.cos(theta) * Math.sin(phi) * radius,
      Math.cos(phi) * radius,
      Math.sin(theta) * Math.sin(phi) * radius,
    ]
  }

  if (form === 2) {
    const row = Math.floor(Math.sqrt(particleCount))
    const x = ((index % row) / (row - 1) - 0.5) * 7.4
    const z = (Math.floor(index / row) / (row - 1) - 0.5) * 4.8
    return [x, Math.sin(x * 1.35 + z * 0.9) * 0.72, z * 0.62]
  }

  if (form === 3) {
    const x = Math.sin(angle) ** 3 * 2.25
    const y = (13 * Math.cos(angle) - 5 * Math.cos(angle * 2) - 2 * Math.cos(angle * 3) - Math.cos(angle * 4)) * 0.14
    return [x + band * 0.16, y - 0.3 + band * 0.16, band * 1.25]
  }

  const major = 2.25
  const minor = 0.58 + band * 0.12
  const tubeAngle = angle * 7 + band * Math.PI
  return [
    (major + minor * Math.cos(tubeAngle)) * Math.cos(angle),
    (major + minor * Math.cos(tubeAngle)) * Math.sin(angle),
    minor * Math.sin(tubeAngle),
  ]
}

function gather(form = formIndex.value) {
  for (let index = 0; index < particleCount; index += 1) {
    const offset = index * 3
    const [x, y, z] = formPosition(form, index)
    targets[offset] = x
    targets[offset + 1] = y
    targets[offset + 2] = z
  }
}

function scatter() {
  for (let index = 0; index < particleCount; index += 1) {
    const offset = index * 3
    const radius = 4 + Math.random() * 5
    const angle = Math.random() * Math.PI * 2
    targets[offset] = Math.cos(angle) * radius
    targets[offset + 1] = (Math.random() - 0.5) * 7
    targets[offset + 2] = Math.sin(angle) * radius
    velocities[offset] += (Math.random() - 0.5) * 0.06
    velocities[offset + 1] += (Math.random() - 0.5) * 0.06
    velocities[offset + 2] += (Math.random() - 0.5) * 0.06
  }
}

function changeForm() {
  window.clearTimeout(gatherTimer)
  scatter()
  gatherTimer = window.setTimeout(() => {
    formIndex.value = (formIndex.value + 1) % formNames.length
    gather()
  }, 430)
}

function updatePointer(event) {
  pointer.lookX = (event.clientX / window.innerWidth - 0.5) * 2
  pointer.lookY = (event.clientY / window.innerHeight - 0.5) * 2
  pointer.x = pointer.lookX * 4.1
  pointer.y = -pointer.lookY * 2.6
  pointer.active = true
}

function clearPointer() {
  pointer.active = false
}

function handleClick(event) {
  if (event.target.closest('a, button, input, textarea, select')) return
  changeForm()
}

onMounted(() => {
  gather()
  window.addEventListener('pointermove', updatePointer, { passive: true })
  window.addEventListener('pointerleave', clearPointer)
  window.addEventListener('click', handleClick)
  autoTimer = window.setInterval(changeForm, 8500)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', updatePointer)
  window.removeEventListener('pointerleave', clearPointer)
  window.removeEventListener('click', handleClick)
  window.clearInterval(autoTimer)
  window.clearTimeout(gatherTimer)
  geometry.dispose()
  material.dispose()
})

useRenderLoop().onLoop(({ elapsed }) => {
  const attraction = 0.012
  const damping = 0.93
  const flightSpeed = 0.5
  const frameDamping = Math.pow(damping, flightSpeed)

  for (let index = 0; index < particleCount; index += 1) {
    const offset = index * 3
    velocities[offset] += (targets[offset] - positions[offset]) * attraction * flightSpeed
    velocities[offset + 1] += (targets[offset + 1] - positions[offset + 1]) * attraction * flightSpeed
    velocities[offset + 2] += (targets[offset + 2] - positions[offset + 2]) * attraction * flightSpeed

    if (pointer.active) {
      const dx = positions[offset] - pointer.x
      const dy = positions[offset + 1] - pointer.y
      const distanceSquared = dx * dx + dy * dy
      if (distanceSquared < 1.35) {
        const force = (1.35 - distanceSquared) * 0.018 * flightSpeed
        velocities[offset] += dx * force
        velocities[offset + 1] += dy * force
        velocities[offset + 2] += Math.sin(index) * force * 0.45
      }
    }

    velocities[offset] *= frameDamping
    velocities[offset + 1] *= frameDamping
    velocities[offset + 2] *= frameDamping
    positions[offset] += velocities[offset] * flightSpeed
    positions[offset + 1] += velocities[offset + 1] * flightSpeed
    positions[offset + 2] += velocities[offset + 2] * flightSpeed
  }

  const targetRotationY = pointer.active ? pointer.lookX * 0.42 : Math.sin(elapsed * 0.17) * 0.12
  const targetRotationX = pointer.active ? pointer.lookY * 0.24 : Math.cos(elapsed * 0.13) * 0.05
  points.rotation.y += (targetRotationY - points.rotation.y) * 0.035
  points.rotation.x += (targetRotationX - points.rotation.x) * 0.035
  positionAttribute.needsUpdate = true
})
</script>

<template>
  <div class="wire-hero" :aria-label="`互動粒子形狀：${formNames[formIndex]}`">
    <TresCanvas clear-color="#f6f7f0" :dpr="[1, 1.5]" :antialias="true" power-preference="high-performance">
      <TresPerspectiveCamera :position="[0, 0, 7.5]" :look-at="[0, 0, 0]" />
      <primitive :object="points" />
    </TresCanvas>
    <div class="particle-caption" aria-hidden="true">
      <span>PARTICLE FORM</span>
      <b>{{ formNames[formIndex] }}</b>
    </div>
  </div>
</template>
