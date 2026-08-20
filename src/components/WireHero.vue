<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { TresCanvas, useRenderLoop } from '@tresjs/core'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Matrix4,
  PerspectiveCamera,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three'

const entryTimestamp = Date.now()
const seedSource = (entryTimestamp ^ Math.floor(entryTimestamp / 4294967296)) >>> 0
const entrySeedCode = entryTimestamp.toString(36).toUpperCase().slice(-8)

function createRandom(seed) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let mixed = value
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const random = createRandom(seedSource)
const initialParticleCount = 1000
const particleCount = 8000
let activeParticleCount = initialParticleCount
const visibleParticleCount = ref(activeParticleCount)
const minimumParticleCount = 300
const positions = new Float32Array(particleCount * 3)
const targets = new Float32Array(particleCount * 3)
const previousTargets = new Float32Array(particleCount * 3)
const velocities = new Float32Array(particleCount * 3)
const colors = new Float32Array(particleCount * 3)
const energies = new Float32Array(particleCount)
const flowPrevious = new Uint32Array(particleCount)
const flowNext = new Uint32Array(particleCount)
const flowProgress = new Float32Array(particleCount)
const pointer = { screenX: 0, screenY: 0, lookX: 0, lookY: 0, active: false }
const scrollState = { target: 0, value: 0 }
const route = useRoute()
let homeHeroActive = route.path === '/' && window.scrollY < window.innerHeight * 0.75
const heroElement = ref(null)
const generation = ref(1)
const organismId = ref(entrySeedCode)
const geometry = new BufferGeometry()
const projectionCamera = new PerspectiveCamera(50, 1, 0.1, 100)
const projectedParticle = new Vector3()
const pointerPush = new Vector3()
const inversePointsMatrix = new Matrix4()
projectionCamera.position.set(0, 0, 7.5)
projectionCamera.lookAt(0, 0, 0)
projectionCamera.updateMatrixWorld(true)
let autoTimer = 0
let longPressTimer = 0
let pageUnlockTimer = 0
let isMounted = false
let morphProgress = 1
let suppressClickUntil = 0
const rotationFlow = { x: 0, y: 0, z: 0 }
const touchInteraction = {
  identifier: null,
  startX: 0,
  startY: 0,
  clientX: 0,
  clientY: 0,
  active: false,
}
const pageScrollLock = {
  active: false,
  scrollY: 0,
  bodyPosition: '',
  bodyTop: '',
  bodyLeft: '',
  bodyRight: '',
  bodyWidth: '',
  bodyOverflow: '',
  htmlOverflow: '',
}

const organism = {
  phase: random() * Math.PI * 2,
  radius: 0.88 + random() * 0.38,
  stretchX: 0.78 + random() * 0.55,
  stretchY: 0.78 + random() * 0.55,
  stretchZ: 0.72 + random() * 0.6,
  warp: 0.12 + random() * 0.34,
  twist: 0.72 + random() * 1.9,
  flowSpeed: 0.51 + random() * 0.36,
  pointScale: 22 + random() * 15,
}
const originalOrganism = { ...organism }
const workProfiles = {
  'industrial-design': { genome: 'industrial', topology: 'filament', flow: 0.72, points: 0.72, warp: 0.56, material: 1 },
  'interaction-design': { genome: 'interaction', topology: 'flock', flow: 1.16, points: 1.05, warp: 1.2, material: 2 },
  'virtual-reality': { genome: 'virtual', topology: 'ring', flow: 0.9, points: 1.22, warp: 1.42, material: 3 },
}
let activeGenomeProfile = 'home'
let activeTopology = ''

function randomDirection() {
  const y = -1 + random() * 2
  const angle = random() * Math.PI * 2
  const radius = Math.sqrt(1 - y * y)
  return [Math.cos(angle) * radius, y, Math.sin(angle) * radius]
}

function createCellNodes(count) {
  const nodes = [{ x: 0, y: 0, z: 0, radius: 0.72 + random() * 0.5 }]
  for (let index = 1; index < count; index += 1) {
    const parent = nodes[Math.floor(random() * nodes.length)]
    const [dx, dy, dz] = randomDirection()
    const radius = 0.52 + random() * 0.58
    const distance = (parent.radius + radius) * (0.68 + random() * 0.2)
    nodes.push({
      x: parent.x + dx * distance,
      y: parent.y + dy * distance,
      z: parent.z + dz * distance,
      radius,
    })
  }
  const center = nodes.reduce((sum, node) => ({ x: sum.x + node.x, y: sum.y + node.y, z: sum.z + node.z }), { x: 0, y: 0, z: 0 })
  nodes.forEach((node) => {
    node.x -= center.x / nodes.length
    node.y -= center.y / nodes.length
    node.z -= center.z / nodes.length
  })
  return nodes
}

function createFlockAgents(count) {
  return Array.from({ length: count }, (_, index) => {
    const angle = random() * Math.PI * 2
    const radius = 0.45 + random() * 1.8
    const x = Math.cos(angle) * radius
    const y = (random() - 0.5) * 2.6
    const z = Math.sin(angle) * radius * 0.72
    return {
      x,
      y,
      z,
      originX: x,
      originY: y,
      originZ: z,
      vx: (random() - 0.5) * 0.018,
      vy: (random() - 0.5) * 0.012,
      vz: (random() - 0.5) * 0.018,
      phase: random() * Math.PI * 2 + index,
    }
  })
}

function createGenome(profile = 'home', requestedTopology = '') {
  const industrial = profile === 'industrial'
  const interaction = profile === 'interaction'
  const virtual = profile === 'virtual'
  const topologyTypes = ['spiral', 'filament', 'ring', 'flock', 'colony', 'helix', 'vortex', 'branch', 'shell']
  const topology = requestedTopology || topologyTypes[Math.floor(random() * topologyTypes.length)]
  const cellCount = 3 + Math.floor(random() * 5)
  const flockCount = 4 + Math.floor(random() * 5)

  return {
    topology,
    arms: 2 + Math.floor(random() * 5),
    turns: 1.2 + random() * 2.8,
    strandCount: 3 + Math.floor(random() * 6),
    strandFrequency: 1.4 + random() * 3.8,
    thickness: 0.08 + random() * 0.24,
    ringMajor: 1.35 + random() * 0.9,
    ringMinor: 0.28 + random() * 0.58,
    knotCount: 2 + Math.floor(random() * 6),
    branchCount: 4 + Math.floor(random() * 8),
    coilCount: 2 + Math.floor(random() * 5),
    flowAmplitude: 0.1 + random() * 0.22,
    spinDirection: random() < 0.5 ? -1 : 1,
    cells: createCellNodes(cellCount),
    agents: createFlockAgents(flockCount),
    phaseA: random() * Math.PI * 2,
    phaseB: random() * Math.PI * 2,
    phaseC: random() * Math.PI * 2,
    lobesA: 2 + Math.floor(random() * 7),
    lobesB: 2 + Math.floor(random() * 6),
    lobesC: 3 + Math.floor(random() * 9),
    amplitudeA: industrial ? 0.07 + random() * 0.08 : 0.11 + random() * 0.2,
    amplitudeB: industrial ? 0.04 + random() * 0.06 : 0.05 + random() * 0.14,
    twist: interaction ? 1.4 + random() * 2.1 : -0.8 + random() * 1.6,
    asymmetry: -0.28 + random() * 0.56,
    cavity: virtual ? 0.2 + random() * 0.24 : random() * 0.16,
    cavityPower: 3 + random() * 7,
    cavityTheta: random() * Math.PI * 2,
    cavityY: -0.7 + random() * 1.4,
    protrusions: virtual ? 0.24 + random() * 0.25 : 0.08 + random() * 0.24,
    protrusionFrequency: 5 + Math.floor(random() * 11),
    scaleX: (interaction ? 1.12 : 0.78) + random() * 0.5,
    scaleY: 0.72 + random() * 0.66,
    scaleZ: 0.72 + random() * 0.58,
    faceting: industrial ? 5 + Math.floor(random() * 6) : 0,
    shellOffset: -0.16 + random() * 0.32,
  }
}

let genome = createGenome()

const baseHue = random()
const palette = Array.from({ length: 4 }, (_, index) => {
  const hue = (baseHue + index * (0.09 + random() * 0.14)) % 1
  return new Color().setHSL(hue, 0.48 + random() * 0.28, 0.48 + random() * 0.22)
})

for (let index = 0; index < particleCount; index += 1) {
  const offset = index * 3
  positions[offset] = (Math.random() - 0.5) * 12
  positions[offset + 1] = (Math.random() - 0.5) * 8
  positions[offset + 2] = (Math.random() - 0.5) * 8

  const color = palette[index % palette.length]
  colors[offset] = color.r
  colors[offset + 1] = color.g
  colors[offset + 2] = color.b
  energies[index] = 0.5
}

const positionAttribute = new BufferAttribute(positions, 3)
positionAttribute.setUsage(DynamicDrawUsage)
geometry.setAttribute('position', positionAttribute)
geometry.setAttribute('color', new BufferAttribute(colors, 3))
const energyAttribute = new BufferAttribute(energies, 1)
energyAttribute.setUsage(DynamicDrawUsage)
geometry.setAttribute('energy', energyAttribute)
geometry.setDrawRange(0, activeParticleCount)

const material = new ShaderMaterial({
  transparent: true,
  depthWrite: false,
  vertexColors: true,
  uniforms: {
    uPointScale: { value: organism.pointScale },
    uHueShift: { value: organism.phase },
    uMaterialMode: { value: 0 },
  },
  vertexShader: `
    uniform float uPointScale;
    attribute float energy;
    varying vec3 vColor;
    varying float vEnergy;
    void main() {
      vColor = color;
      vEnergy = energy;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp((uPointScale * (0.72 + energy * 0.7)) / -mvPosition.z, 1.5, 9.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uHueShift;
    uniform float uMaterialMode;
    varying vec3 vColor;
    varying float vEnergy;
    vec3 rotateHue(vec3 color, float angle) {
      vec3 axis = normalize(vec3(1.0));
      return clamp(
        color * cos(angle) + cross(axis, color) * sin(angle) + axis * dot(axis, color) * (1.0 - cos(angle)),
        0.0,
        1.0
      );
    }
    void main() {
      float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
      float squareDistance = max(abs(gl_PointCoord.x - 0.5), abs(gl_PointCoord.y - 0.5));
      float alpha = 1.0 - smoothstep(0.32, 0.5, distanceToCenter);
      if (uMaterialMode > 0.5 && uMaterialMode < 1.5) {
        alpha = 1.0 - smoothstep(0.31, 0.5, squareDistance);
      } else if (uMaterialMode >= 1.5 && uMaterialMode < 2.5) {
        float ellipse = distance(vec2((gl_PointCoord.x - 0.5) * 0.58, gl_PointCoord.y - 0.5), vec2(0.0));
        alpha = 1.0 - smoothstep(0.3, 0.5, ellipse);
      } else if (uMaterialMode >= 2.5) {
        alpha = 1.0 - smoothstep(0.16, 0.5, distanceToCenter);
        alpha *= 0.7 + 0.3 * sin(distanceToCenter * 28.0);
      }
      if (alpha <= 0.01) discard;
      vec3 energyColor = rotateHue(vColor, uHueShift) * (0.72 + vEnergy * 0.55);
      gl_FragColor = vec4(clamp(energyColor, 0.0, 1.0), alpha * (0.68 + vEnergy * 0.32));
    }
  `,
})

const points = new Points(geometry, material)

function generatedPosition(index) {
  if (genome.topology === 'spiral') {
    const arm = index % genome.arms
    const localIndex = Math.floor(index / genome.arms)
    const localCount = Math.ceil(activeParticleCount / genome.arms)
    const progress = (localIndex + 0.5) / localCount
    const hashA = ((localIndex * 47 + arm * 19) % 103) / 102 - 0.5
    const hashB = ((localIndex * 71 + arm * 31) % 107) / 106 - 0.5
    const radius = 0.22 + Math.pow(progress, 0.68) * (2.55 + genome.scaleX * 0.65)
    const angle = arm * Math.PI * 2 / genome.arms + radius * genome.turns + genome.phaseA + hashA * 0.24
    const thickness = genome.thickness * (1.15 - progress * 0.62)
    return [
      Math.cos(angle) * (radius + hashB * 0.24) * genome.scaleX,
      Math.sin(angle) * (radius + hashB * 0.24) * genome.scaleY,
      (hashA * thickness * 5 + Math.sin(angle * genome.lobesA) * 0.08) * genome.scaleZ,
    ]
  }

  if (genome.topology === 'helix') {
    const strand = index % genome.coilCount
    const localIndex = Math.floor(index / genome.coilCount)
    const localCount = Math.ceil(activeParticleCount / genome.coilCount)
    const progress = localIndex / Math.max(1, localCount - 1)
    const t = progress * 2 - 1
    const phase = t * Math.PI * genome.turns + strand * Math.PI * 2 / genome.coilCount + genome.phaseA
    const radius = 0.58 + Math.sin(t * Math.PI * genome.lobesA + genome.phaseB) * 0.16
    const fuzz = (((localIndex * 53) % 97) / 96 - 0.5) * genome.thickness
    return [
      t * 3.2 * genome.scaleX,
      (Math.cos(phase) * radius + fuzz) * genome.scaleY,
      Math.sin(phase) * radius * genome.scaleZ,
    ]
  }

  if (genome.topology === 'vortex') {
    const progress = (index + 0.5) / activeParticleCount
    const height = progress * 2 - 1
    const radius = 0.28 + Math.pow(progress, 0.78) * 2.45
    const angle = progress * Math.PI * 2 * (genome.turns + 1.8) + genome.phaseA + ((index * 41) % 43) / 43 * 0.28
    const thickness = (((index * 67) % 101) / 100 - 0.5) * genome.thickness
    return [
      Math.cos(angle) * (radius + thickness) * genome.scaleX,
      height * 2.15 * genome.scaleY,
      Math.sin(angle) * (radius + thickness) * genome.scaleZ,
    ]
  }

  if (genome.topology === 'branch') {
    const branch = index % genome.branchCount
    const localIndex = Math.floor(index / genome.branchCount)
    const localCount = Math.ceil(activeParticleCount / genome.branchCount)
    const progress = localIndex / Math.max(1, localCount - 1)
    const branchAngle = genome.phaseA + branch * Math.PI * 2 / genome.branchCount
    const bend = Math.sin(progress * Math.PI * (1.2 + genome.turns * 0.28) + genome.phaseB + branch) * 0.34
    const length = 0.28 + progress * (2.2 + (branch % 3) * 0.3)
    const twig = Math.pow(progress, 1.4) * Math.sin(progress * Math.PI * genome.lobesA + branch) * 0.42
    const fuzz = (((localIndex * 31) % 71) / 70 - 0.5) * genome.thickness
    return [
      Math.cos(branchAngle + bend) * length * genome.scaleX,
      (Math.sin(branchAngle + bend) * length + twig) * genome.scaleY,
      (Math.sin(progress * Math.PI * 2 + branchAngle) * 0.34 + fuzz) * genome.scaleZ,
    ]
  }

  if (genome.topology === 'shell') {
    const layer = index % genome.coilCount
    const localIndex = Math.floor(index / genome.coilCount)
    const localCount = Math.ceil(activeParticleCount / genome.coilCount)
    const progress = localIndex / Math.max(1, localCount - 1)
    const angle = progress * Math.PI * 2 * genome.turns + genome.phaseA + layer * 0.13
    const radius = 0.2 + Math.pow(progress, 1.12) * 2.65
    const ridge = Math.sin(angle * genome.lobesA + genome.phaseB) * genome.amplitudeA
    return [
      Math.cos(angle) * (radius + ridge) * genome.scaleX,
      Math.sin(angle) * (radius + ridge) * genome.scaleY,
      ((layer - (genome.coilCount - 1) / 2) * genome.thickness + Math.sin(progress * Math.PI) * 0.42) * genome.scaleZ,
    ]
  }

  if (genome.topology === 'filament') {
    const strand = index % genome.strandCount
    const localIndex = Math.floor(index / genome.strandCount)
    const localCount = Math.ceil(activeParticleCount / genome.strandCount)
    const progress = localIndex / Math.max(1, localCount - 1)
    const t = progress * 2 - 1
    const strandPhase = genome.phaseA + strand * Math.PI * 2 / genome.strandCount
    const tubeAngle = localIndex * 2.399963 + strandPhase
    const tubeRadius = genome.thickness * (0.35 + ((localIndex * 43) % 61) / 60)
    const curveY = Math.sin(t * genome.strandFrequency + strandPhase) * (0.72 + genome.scaleY * 0.3)
    const curveZ = Math.cos(t * (genome.strandFrequency * 0.72) + genome.phaseB + strand * 0.8) * (0.62 + genome.scaleZ * 0.26)
    const spread = (strand - (genome.strandCount - 1) / 2) * 0.22
    return [
      t * (2.7 + genome.scaleX * 0.5) + Math.cos(tubeAngle) * tubeRadius,
      curveY + spread + Math.sin(tubeAngle) * tubeRadius,
      curveZ + Math.cos(strandPhase) * spread * 1.5 + Math.cos(tubeAngle) * tubeRadius,
    ]
  }

  if (genome.topology === 'ring') {
    const row = Math.max(8, Math.floor(Math.sqrt(activeParticleCount)))
    const rows = Math.ceil(activeParticleCount / row)
    const u = (index % row) / row * Math.PI * 2
    const v = Math.floor(index / row) / rows * Math.PI * 2
    const major = genome.ringMajor + Math.sin(u * genome.knotCount + genome.phaseA) * genome.amplitudeA * 0.72
    const minor = genome.ringMinor * (1 + Math.cos(u * genome.lobesB + genome.phaseB) * 0.18)
    const shell = major + minor * Math.cos(v)
    return [
      Math.cos(u) * shell * genome.scaleX,
      (minor * Math.sin(v) + Math.sin(u * genome.knotCount) * 0.18) * genome.scaleY,
      Math.sin(u) * shell * genome.scaleZ,
    ]
  }

  if (genome.topology === 'flock') {
    const agentIndex = index % genome.agents.length
    const agent = genome.agents[agentIndex]
    const localIndex = Math.floor(index / genome.agents.length)
    const localCount = Math.ceil(activeParticleCount / genome.agents.length)
    const progress = localIndex / Math.max(1, localCount - 1)
    const hashA = ((localIndex * 37 + agentIndex * 17) % 101) / 100
    const hashB = ((localIndex * 61 + agentIndex * 29) % 97) / 96
    const back = Math.pow(progress, 0.7) * (1.25 + genome.scaleX * 0.85)
    const side = (hashA * 2 - 1) * (0.16 + back * 0.54)
    const lift = (hashB - 0.5) * (0.16 + back * 0.22) + Math.sin(progress * Math.PI * 5 + agent.phase) * 0.09
    const heading = Math.atan2(agent.vz, agent.vx)
    const localX = -back
    const localZ = side

    return [
      agent.x + (localX * Math.cos(heading) - localZ * Math.sin(heading)),
      agent.y + lift,
      agent.z + (localX * Math.sin(heading) + localZ * Math.cos(heading)),
    ]
  }

  const cellIndex = index % genome.cells.length
  const cell = genome.cells[cellIndex]
  const localIndex = Math.floor(index / genome.cells.length)
  const localCount = Math.ceil(activeParticleCount / genome.cells.length)
  const progress = Math.min(0.9999, (localIndex + 0.5) / localCount)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const latitudeY = 1 - progress * 2
  const latitudeRadius = Math.sqrt(Math.max(0, 1 - latitudeY * latitudeY))
  const longitude = localIndex * goldenAngle + cellIndex * genome.phaseA
  const latitude = Math.asin(latitudeY)
  const normalX = Math.cos(longitude) * latitudeRadius
  const normalZ = Math.sin(longitude) * latitudeRadius
  const harmonicA = Math.sin(longitude * genome.lobesA + genome.phaseA) * Math.cos(latitude * genome.lobesB)
  const harmonicB = Math.cos((longitude + latitude) * genome.lobesC + genome.phaseB)
  const budding = Math.pow(Math.max(0, Math.sin(longitude * genome.protrusionFrequency + latitude * 3 + genome.phaseC)), 7)
  let radius = cell.radius * (1 + harmonicA * genome.amplitudeA + harmonicB * genome.amplitudeB + budding * genome.protrusions)
  const cavityAxisX = Math.cos(genome.cavityTheta) * Math.sqrt(1 - genome.cavityY * genome.cavityY)
  const cavityAxisZ = Math.sin(genome.cavityTheta) * Math.sqrt(1 - genome.cavityY * genome.cavityY)
  const cavityAlignment = Math.max(0, normalX * cavityAxisX + latitudeY * genome.cavityY + normalZ * cavityAxisZ)
  radius *= 1 - genome.cavity * Math.pow(cavityAlignment, genome.cavityPower)
  if (genome.faceting) radius = Math.round(radius * genome.faceting) / genome.faceting

  const twist = latitudeY * genome.twist * 0.45
  const twistedLongitude = longitude + twist
  const shellVariation = 1 + (((localIndex * 37) % 11) / 10 - 0.5) * genome.shellOffset
  const colonyScale = 1.22 * organism.radius

  return [
    (cell.x + Math.cos(twistedLongitude) * latitudeRadius * radius * shellVariation) * colonyScale * genome.scaleX,
    (cell.y + latitudeY * radius + genome.asymmetry * latitudeRadius * latitudeRadius * 0.24) * colonyScale * genome.scaleY,
    (cell.z + Math.sin(twistedLongitude) * latitudeRadius * radius * shellVariation) * colonyScale * genome.scaleZ,
  ]
}

function updateFlowPaths() {
  let stride = 1
  if (genome.topology === 'spiral') stride = genome.arms
  if (genome.topology === 'filament') stride = genome.strandCount
  if (genome.topology === 'flock') stride = genome.agents.length
  if (genome.topology === 'colony') stride = genome.cells.length
  if (genome.topology === 'helix' || genome.topology === 'shell') stride = genome.coilCount
  if (genome.topology === 'branch') stride = genome.branchCount

  for (let index = 0; index < activeParticleCount; index += 1) {
    if (genome.topology === 'ring') {
      const row = Math.max(8, Math.floor(Math.sqrt(activeParticleCount)))
      const rowStart = Math.floor(index / row) * row
      const rowLength = Math.min(row, activeParticleCount - rowStart)
      const localIndex = index - rowStart
      flowPrevious[index] = rowStart + Math.max(0, localIndex - 1)
      flowNext[index] = rowStart + Math.min(rowLength - 1, localIndex + 1)
      flowProgress[index] = localIndex / Math.max(1, rowLength - 1)
      continue
    }

    const localIndex = Math.floor(index / stride)
    const group = index % stride
    const localCount = Math.ceil((activeParticleCount - group) / stride)
    flowPrevious[index] = Math.max(group, group + Math.max(0, localIndex - 1) * stride)
    flowNext[index] = Math.min(activeParticleCount - 1, group + Math.min(localCount - 1, localIndex + 1) * stride)
    flowProgress[index] = localIndex / Math.max(1, localCount - 1)
  }
}

function gather() {
  for (let index = 0; index < activeParticleCount; index += 1) {
    const offset = index * 3
    const [x, y, z] = generatedPosition(index)
    targets[offset] = x
    targets[offset + 1] = y
    targets[offset + 2] = z
  }
  updateFlowPaths()
}

function setActiveParticleCount(nextCount) {
  const clampedCount = Math.max(minimumParticleCount, Math.min(particleCount, Math.round(nextCount)))
  if (clampedCount === activeParticleCount) return

  const previousCount = activeParticleCount
  previousTargets.set(targets)
  activeParticleCount = clampedCount
  gather()

  if (activeParticleCount > previousCount) {
    for (let index = previousCount; index < activeParticleCount; index += 1) {
      const offset = index * 3
      positions[offset] = targets[offset]
      positions[offset + 1] = targets[offset + 1]
      positions[offset + 2] = targets[offset + 2]
      previousTargets[offset] = targets[offset]
      previousTargets[offset + 1] = targets[offset + 1]
      previousTargets[offset + 2] = targets[offset + 2]
      velocities[offset] = 0
      velocities[offset + 1] = 0
      velocities[offset + 2] = 0
      energies[index] = 0.5
    }
  }

  geometry.setDrawRange(0, activeParticleCount)
  visibleParticleCount.value = activeParticleCount
  morphProgress = 0
}

const performanceGovernor = {
  elapsed: 0,
  frames: 0,
}

function resetPerformanceGovernor() {
  performanceGovernor.elapsed = 0
  performanceGovernor.frames = 0
}

function syncHomeParticleState(path = route.path) {
  const nextActive = path === '/' && window.scrollY < window.innerHeight * 0.75
  if (nextActive === homeHeroActive) return
  const wasActive = homeHeroActive
  const countBeforeLeaving = activeParticleCount
  homeHeroActive = nextActive
  resetPerformanceGovernor()

  if (wasActive && !nextActive) {
    if (countBeforeLeaving >= initialParticleCount) setActiveParticleCount(initialParticleCount)
    return
  }

  if (!wasActive && nextActive && activeParticleCount >= initialParticleCount) {
    setActiveParticleCount(particleCount)
  }
}

function monitorPerformance(delta) {
  if (!homeHeroActive || document.hidden || delta <= 0 || delta > 0.2) return
  performanceGovernor.elapsed += delta
  performanceGovernor.frames += 1
  if (performanceGovernor.elapsed < 0.5) return

  const fps = performanceGovernor.frames / performanceGovernor.elapsed
  performanceGovernor.elapsed = 0
  performanceGovernor.frames = 0

  if (fps < 30) {
    if (activeParticleCount > initialParticleCount) setActiveParticleCount(initialParticleCount)
    else if (activeParticleCount > minimumParticleCount) setActiveParticleCount(minimumParticleCount)
    return
  }

  if (fps > 100 && activeParticleCount < particleCount) setActiveParticleCount(particleCount)
}

function evolveOrganism(profile = activeGenomeProfile) {
  previousTargets.set(targets)
  genome = createGenome(profile, activeTopology)
  generation.value += 1
  gather()
  morphProgress = 0
}

function updateScroll() {
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  scrollState.target = Math.min(1, Math.max(0, window.scrollY / scrollRange))
  syncHomeParticleState()
}

function applyRouteProfile(path) {
  syncHomeParticleState(path)
  const slug = path.includes('/work/') ? path.split('/work/')[1]?.split('/')[0] : ''
  const profile = workProfiles[slug]
  activeGenomeProfile = profile?.genome ?? 'home'
  activeTopology = profile?.topology ?? ''

  organism.flowSpeed = originalOrganism.flowSpeed * (profile?.flow ?? 1)
  organism.pointScale = originalOrganism.pointScale * (profile?.points ?? 1)
  organism.warp = originalOrganism.warp * (profile?.warp ?? 1)
  material.uniforms.uMaterialMode.value = profile?.material ?? 0

  if (!isMounted) {
    genome = createGenome(activeGenomeProfile, activeTopology)
    return
  }

  evolveOrganism(activeGenomeProfile)
  scheduleAutoEvolution()
}

function updatePointerPosition(clientX, clientY) {
  const bounds = heroElement.value?.getBoundingClientRect()
  if (!bounds) return
  pointer.screenX = ((clientX - bounds.left) / bounds.width) * 2 - 1
  pointer.screenY = 1 - ((clientY - bounds.top) / bounds.height) * 2
  pointer.lookX = pointer.screenX
  pointer.lookY = -pointer.screenY
  pointer.active = true
}

function updatePointer(event) {
  if (event.pointerType === 'touch') return
  updatePointerPosition(event.clientX, event.clientY)
}

function clearPointer() {
  pointer.active = false
}

function findTrackedTouch(touches) {
  return Array.from(touches).find((touch) => touch.identifier === touchInteraction.identifier)
}

function clearLongPressTimer() {
  window.clearTimeout(longPressTimer)
  longPressTimer = 0
}

function lockPageScroll() {
  window.clearTimeout(pageUnlockTimer)
  pageUnlockTimer = 0
  if (pageScrollLock.active) return
  const body = document.body
  const html = document.documentElement
  pageScrollLock.active = true
  pageScrollLock.scrollY = window.scrollY
  pageScrollLock.bodyPosition = body.style.position
  pageScrollLock.bodyTop = body.style.top
  pageScrollLock.bodyLeft = body.style.left
  pageScrollLock.bodyRight = body.style.right
  pageScrollLock.bodyWidth = body.style.width
  pageScrollLock.bodyOverflow = body.style.overflow
  pageScrollLock.htmlOverflow = html.style.overflow
  body.style.position = 'fixed'
  body.style.top = `${-pageScrollLock.scrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  body.style.overflow = 'hidden'
  html.style.overflow = 'hidden'
  html.classList.add('particle-touch-active')
}

function unlockPageScroll(immediate = false) {
  window.clearTimeout(pageUnlockTimer)
  pageUnlockTimer = 0
  if (!pageScrollLock.active) return
  if (!immediate) {
    pageUnlockTimer = window.setTimeout(() => unlockPageScroll(true), 140)
    return
  }
  const body = document.body
  const html = document.documentElement
  const savedScrollY = pageScrollLock.scrollY
  body.style.position = pageScrollLock.bodyPosition
  body.style.top = pageScrollLock.bodyTop
  body.style.left = pageScrollLock.bodyLeft
  body.style.right = pageScrollLock.bodyRight
  body.style.width = pageScrollLock.bodyWidth
  body.style.overflow = pageScrollLock.bodyOverflow
  html.style.overflow = pageScrollLock.htmlOverflow
  html.classList.remove('particle-touch-active')
  pageScrollLock.active = false
  window.scrollTo(0, savedScrollY)
}

function endTouchInteraction(event) {
  clearLongPressTimer()
  if (touchInteraction.active) {
    event?.preventDefault()
    event?.stopPropagation()
    suppressClickUntil = performance.now() + 600
  }
  touchInteraction.identifier = null
  touchInteraction.active = false
  pointer.active = false
  unlockPageScroll()
}

function handleTouchStart(event) {
  if (pageScrollLock.active && !touchInteraction.active) unlockPageScroll(true)
  if (event.touches.length !== 1 || event.target instanceof Element && event.target.closest('a, button, input, textarea, select')) {
    endTouchInteraction()
    return
  }

  const touch = event.touches[0]
  touchInteraction.identifier = touch.identifier
  touchInteraction.startX = touch.clientX
  touchInteraction.startY = touch.clientY
  touchInteraction.clientX = touch.clientX
  touchInteraction.clientY = touch.clientY
  touchInteraction.active = false
  clearLongPressTimer()
  longPressTimer = window.setTimeout(() => {
    if (touchInteraction.identifier === null) return
    touchInteraction.active = true
    lockPageScroll()
    updatePointerPosition(touchInteraction.clientX, touchInteraction.clientY)
  }, 450)
}

function handleTouchMove(event) {
  const touch = findTrackedTouch(event.touches)
  if (!touch) return
  touchInteraction.clientX = touch.clientX
  touchInteraction.clientY = touch.clientY

  if (!touchInteraction.active) {
    const distance = Math.hypot(touch.clientX - touchInteraction.startX, touch.clientY - touchInteraction.startY)
    if (distance > 12) clearLongPressTimer()
    return
  }

  event.preventDefault()
  event.stopPropagation()
  updatePointerPosition(touch.clientX, touch.clientY)
}

function handleTouchEnd(event) {
  if (touchInteraction.identifier === null) return
  const touchStillActive = findTrackedTouch(event.touches)
  if (!touchStillActive) endTouchInteraction(event)
}

function handleTouchContextMenu(event) {
  if (touchInteraction.active) event.preventDefault()
}

function handleClick(event) {
  if (performance.now() < suppressClickUntil) return
  if (!homeHeroActive) return
  if (event.target.closest('a, button, input, textarea, select')) return
  evolveOrganism()
  scheduleAutoEvolution()
}

function scheduleAutoEvolution() {
  window.clearTimeout(autoTimer)
  autoTimer = window.setTimeout(() => {
    evolveOrganism()
    scheduleAutoEvolution()
  }, 7200 + random() * 4200)
}

onMounted(() => {
  isMounted = true
  gather()
  previousTargets.set(targets)
  updateScroll()
  if (homeHeroActive) setActiveParticleCount(particleCount)
  window.addEventListener('pointermove', updatePointer, { passive: true })
  window.addEventListener('pointerleave', clearPointer)
  document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true })
  document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
  document.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true })
  document.addEventListener('touchcancel', handleTouchEnd, { passive: false, capture: true })
  document.addEventListener('contextmenu', handleTouchContextMenu, { capture: true })
  window.addEventListener('scroll', updateScroll, { passive: true })
  window.addEventListener('click', handleClick)
  scheduleAutoEvolution()
})

onUnmounted(() => {
  isMounted = false
  window.removeEventListener('pointermove', updatePointer)
  window.removeEventListener('pointerleave', clearPointer)
  document.removeEventListener('touchstart', handleTouchStart, true)
  document.removeEventListener('touchmove', handleTouchMove, true)
  document.removeEventListener('touchend', handleTouchEnd, true)
  document.removeEventListener('touchcancel', handleTouchEnd, true)
  document.removeEventListener('contextmenu', handleTouchContextMenu, true)
  window.removeEventListener('scroll', updateScroll)
  window.removeEventListener('click', handleClick)
  window.clearTimeout(autoTimer)
  endTouchInteraction()
  unlockPageScroll(true)
  geometry.dispose()
  material.dispose()
})

watch(() => route.path, applyRouteProfile, { immediate: true })

function updateFlockAgents(elapsed, frameScale) {
  if (genome.topology !== 'flock') return
  const nextVelocities = []

  for (let index = 0; index < genome.agents.length; index += 1) {
    const agent = genome.agents[index]
    let separationX = 0
    let separationY = 0
    let separationZ = 0
    let cohesionX = 0
    let cohesionY = 0
    let cohesionZ = 0
    let alignmentX = 0
    let alignmentY = 0
    let alignmentZ = 0
    let neighbors = 0

    for (let otherIndex = 0; otherIndex < genome.agents.length; otherIndex += 1) {
      if (otherIndex === index) continue
      const other = genome.agents[otherIndex]
      const dx = agent.x - other.x
      const dy = agent.y - other.y
      const dz = agent.z - other.z
      const distanceSquared = dx * dx + dy * dy + dz * dz
      if (distanceSquared > 7.5) continue
      neighbors += 1
      cohesionX += other.x
      cohesionY += other.y
      cohesionZ += other.z
      alignmentX += other.vx
      alignmentY += other.vy
      alignmentZ += other.vz
      if (distanceSquared < 1.05) {
        const strength = 1 / Math.max(0.18, distanceSquared)
        separationX += dx * strength
        separationY += dy * strength
        separationZ += dz * strength
      }
    }

    let vx = agent.vx
    let vy = agent.vy
    let vz = agent.vz
    if (neighbors) {
      vx += ((cohesionX / neighbors - agent.x) * 0.00016 + (alignmentX / neighbors - agent.vx) * 0.018 + separationX * 0.00072) * frameScale
      vy += ((cohesionY / neighbors - agent.y) * 0.00016 + (alignmentY / neighbors - agent.vy) * 0.018 + separationY * 0.00072) * frameScale
      vz += ((cohesionZ / neighbors - agent.z) * 0.00016 + (alignmentZ / neighbors - agent.vz) * 0.018 + separationZ * 0.00072) * frameScale
    }

    vx += (Math.sin(elapsed * 0.37 + agent.phase) * 0.0002 - agent.x * 0.000055) * frameScale
    vy += (Math.cos(elapsed * 0.31 + agent.phase) * 0.00014 - agent.y * 0.00006) * frameScale
    vz += (Math.sin(elapsed * 0.29 + agent.phase * 1.7) * 0.0002 - agent.z * 0.000055) * frameScale
    const speed = Math.hypot(vx, vy, vz)
    const maxSpeed = 0.018
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed
      vx *= scale
      vy *= scale
      vz *= scale
    }
    nextVelocities.push([vx, vy, vz])
  }

  genome.agents.forEach((agent, index) => {
    const [vx, vy, vz] = nextVelocities[index]
    agent.vx = vx
    agent.vy = vy
    agent.vz = vz
    agent.x += vx * frameScale
    agent.y += vy * frameScale
    agent.z += vz * frameScale
  })
}

useRenderLoop().onLoop(({ elapsed, delta }) => {
  monitorPerformance(delta || 1 / 60)
  const attraction = 0.009
  const damping = 0.7
  const flightSpeed = organism.flowSpeed
  const frameDamping = Math.pow(damping, flightSpeed)
  const frameScale = Math.min(2, Math.max(0.2, (delta || 1 / 60) * 60))
  const evolution = elapsed * organism.flowSpeed + organism.phase
  updateFlockAgents(elapsed, frameScale)
  morphProgress = Math.min(1, morphProgress + 0.0065 * flightSpeed * frameScale)
  const morphEase = morphProgress ** 3 * (morphProgress * (morphProgress * 6 - 15) + 10)
  scrollState.value += (scrollState.target - scrollState.value) * 0.025
  const scrollEvolution = scrollState.value
  const breathe = 1 + Math.sin(evolution * 0.72) * 0.045 + scrollEvolution * 0.1
  const twistAngle = scrollEvolution * (0.38 + organism.twist * 0.17)
  const twistCos = Math.cos(twistAngle)
  const twistSin = Math.sin(twistAngle)
  const canvasBounds = heroElement.value?.getBoundingClientRect()
  projectionCamera.aspect = canvasBounds ? canvasBounds.width / Math.max(1, canvasBounds.height) : window.innerWidth / window.innerHeight
  projectionCamera.updateProjectionMatrix()
  points.updateMatrixWorld(true)
  inversePointsMatrix.copy(points.matrixWorld).invert()

  for (let index = 0; index < activeParticleCount; index += 1) {
    const offset = index * 3
    const phase = index * 0.017 + evolution
    let baseX = (previousTargets[offset] + (targets[offset] - previousTargets[offset]) * morphEase) * breathe
    let baseY = (previousTargets[offset + 1] + (targets[offset + 1] - previousTargets[offset + 1]) * morphEase) * breathe
    let baseZ = (previousTargets[offset + 2] + (targets[offset + 2] - previousTargets[offset + 2]) * morphEase) * breathe
    if (genome.topology === 'flock') {
      const agent = genome.agents[index % genome.agents.length]
      baseX += (agent.x - agent.originX) * morphEase
      baseY += (agent.y - agent.originY) * morphEase
      baseZ += (agent.z - agent.originZ) * morphEase
    }
    const flow = genome.flowAmplitude
    let energyRate = 4.2
    let energyDensity = 14
    if (genome.topology === 'branch') { energyRate = 6.2; energyDensity = 21 }
    if (genome.topology === 'filament' || genome.topology === 'helix') { energyRate = 5.4; energyDensity = 18 }
    if (genome.topology === 'flock') { energyRate = 6.6; energyDensity = 16 }
    if (genome.topology === 'colony') { energyRate = 3.8; energyDensity = 11 }
    if (genome.topology === 'vortex' || genome.topology === 'ring') { energyRate = 5; energyDensity = 17 }
    const energyPhase = evolution * energyRate - flowProgress[index] * energyDensity + (index % 7) * 0.08
    const energyWave = 0.5 + 0.5 * Math.sin(energyPhase)
    const energyPulse = Math.pow(energyWave, 4)
    energies[index] = 0.16 + energyPulse * 0.84

    if (genome.topology !== 'colony') {
      const previousOffset = flowPrevious[index] * 3
      const nextOffset = flowNext[index] * 3
      const tangentX = targets[nextOffset] - targets[previousOffset]
      const tangentY = targets[nextOffset + 1] - targets[previousOffset + 1]
      const tangentZ = targets[nextOffset + 2] - targets[previousOffset + 2]
      const tangentLength = Math.max(0.001, Math.hypot(tangentX, tangentY, tangentZ))
      const energyPush = energyPulse * flow * 0.58 * (0.35 + morphEase * 0.65)
      baseX += tangentX / tangentLength * energyPush
      baseY += tangentY / tangentLength * energyPush
      baseZ += tangentZ / tangentLength * energyPush
    }

    if (genome.topology === 'colony') {
      const cellPulse = 1 + Math.sin(evolution * 1.65 + (index % genome.cells.length) * 1.7) * flow * 0.16
      baseX *= cellPulse
      baseY *= cellPulse
      baseZ *= cellPulse
    } else if (genome.topology === 'filament' || genome.topology === 'helix' || genome.topology === 'branch') {
      baseY += Math.sin(baseX * 1.45 + phase * 1.08) * flow * 0.4
      baseZ += Math.cos(baseX * 0.9 + phase * 0.9) * flow * 0.32
    } else if (genome.topology === 'vortex') {
      const vortexAngle = evolution * 0.13 * genome.spinDirection
      const cosVortex = Math.cos(vortexAngle)
      const sinVortex = Math.sin(vortexAngle)
      const rotatedX = baseX * cosVortex - baseZ * sinVortex
      baseZ = baseX * sinVortex + baseZ * cosVortex
      baseX = rotatedX
    } else {
      baseX += Math.sin(phase * 0.78 + baseY) * flow * 0.16
      baseY += Math.cos(phase * 0.66 + baseX) * flow * 0.16
      baseZ += Math.sin(phase * 0.52 + baseZ) * flow * 0.12
    }
    const desiredX = (baseX * twistCos - baseZ * twistSin) + Math.sin(phase * 1.3) * organism.warp * 0.1
    const desiredY = baseY + Math.cos(phase * 0.83) * organism.warp * (0.08 + scrollEvolution * 0.14)
    const desiredZ = (baseX * twistSin + baseZ * twistCos) + Math.sin(phase * 0.61) * organism.warp * 0.1

    velocities[offset] += (desiredX - positions[offset]) * attraction * flightSpeed
    velocities[offset + 1] += (desiredY - positions[offset + 1]) * attraction * flightSpeed
    velocities[offset + 2] += (desiredZ - positions[offset + 2]) * attraction * flightSpeed

    if (pointer.active) {
      projectedParticle
        .set(positions[offset], positions[offset + 1], positions[offset + 2])
        .applyMatrix4(points.matrixWorld)
        .project(projectionCamera)
      const screenDx = projectedParticle.x - pointer.screenX
      const screenDy = projectedParticle.y - pointer.screenY
      const distanceSquared = screenDx * screenDx + screenDy * screenDy
      const influenceRadius = touchInteraction.active ? 0.24 : 0.16
      if (distanceSquared < influenceRadius * influenceRadius) {
        pointerPush.set(screenDx, screenDy, 0)
        if (pointerPush.lengthSq() < 0.000001) pointerPush.set(Math.sin(index), Math.cos(index), 0)
        pointerPush.transformDirection(inversePointsMatrix).normalize()
        const forceStrength = touchInteraction.active ? 0.03 : 0.011
        const force = (1 - distanceSquared / (influenceRadius * influenceRadius)) * forceStrength * flightSpeed
        velocities[offset] += pointerPush.x * force
        velocities[offset + 1] += pointerPush.y * force
        velocities[offset + 2] += pointerPush.z * force
      }
    }

    velocities[offset] *= frameDamping
    velocities[offset + 1] *= frameDamping
    velocities[offset + 2] *= frameDamping
    positions[offset] += velocities[offset] * flightSpeed
    positions[offset + 1] += velocities[offset + 1] * flightSpeed
    positions[offset + 2] += velocities[offset + 2] * flightSpeed
  }

  const planarTopology = genome.topology === 'spiral' || genome.topology === 'shell' || genome.topology === 'ring'
  if (planarTopology) {
    rotationFlow.z += 0.0021 * flightSpeed * frameScale * genome.spinDirection
  } else {
    rotationFlow.y += 0.00155 * flightSpeed * frameScale * genome.spinDirection
    rotationFlow.x += Math.sin(elapsed * 0.28) * 0.00008 * frameScale
  }
  const targetRotationY = rotationFlow.y + (pointer.active ? pointer.lookX * 0.42 : Math.sin(elapsed * 0.17) * 0.08)
  const targetRotationX = rotationFlow.x + (pointer.active ? pointer.lookY * 0.24 : Math.cos(elapsed * 0.13) * 0.04)
  const targetRotationZ = rotationFlow.z + scrollEvolution * 0.28
  points.rotation.y += (targetRotationY - points.rotation.y) * 0.035
  points.rotation.x += (targetRotationX - points.rotation.x) * 0.035
  points.rotation.z += (targetRotationZ - points.rotation.z) * 0.025
  material.uniforms.uHueShift.value = organism.phase + elapsed * 0.035 + scrollEvolution * 0.9
  material.uniforms.uPointScale.value = organism.pointScale * (1 + Math.sin(evolution * 0.48) * 0.08)
  positionAttribute.needsUpdate = true
  energyAttribute.needsUpdate = true
})
</script>

<template>
  <div ref="heroElement" class="wire-hero" :aria-label="`生成式粒子生命體 ${organismId}，第 ${generation} 代`">
    <TresCanvas clear-color="#f6f7f0" :dpr="[1, 1.5]" :antialias="true" power-preference="high-performance">
      <TresPerspectiveCamera :position="[0, 0, 7.5]" :look-at="[0, 0, 0]" :fov="50" />
      <primitive :object="points" />
    </TresCanvas>
    <div class="particle-caption" aria-hidden="true">
      <span>GENERATIVE LIFE · {{ visibleParticleCount }} PARTICLES</span>
      <b>LIFEFORM {{ organismId }} · GEN {{ generation }} · {{ genome.topology.toUpperCase() }}</b>
    </div>
  </div>
</template>
