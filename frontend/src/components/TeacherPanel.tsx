import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'

const IDLE_MODEL_SRC = `${__XR_ENV_BASE__}/models/teacher-fbx/breathing-idle.fbx`
const TALKING_MODEL_SRC = `${__XR_ENV_BASE__}/models/teacher-fbx/talking2.fbx`

type LoadState = 'loading' | 'ready' | 'error'

interface Props {
  isTalking: boolean
}

type LoadedRig = {
  group: THREE.Group
  mixer: THREE.AnimationMixer | null
  action: THREE.AnimationAction | null
}

function disposeMaterial(material: THREE.Material) {
  const values = Object.values(material) as unknown[]
  for (const value of values) {
    if (value && typeof value === 'object' && 'isTexture' in (value as Record<string, unknown>)) {
      ;(value as THREE.Texture).dispose()
    }
  }
  material.dispose()
}

function disposeRig(rig: LoadedRig | null) {
  if (!rig) return

  rig.group.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      for (const material of mesh.material) {
        disposeMaterial(material)
      }
      return
    }

    if (mesh.material) {
      disposeMaterial(mesh.material)
    }
  })

  rig.mixer?.stopAllAction()
}

function createRig(source: THREE.Group) {
  const group = cloneSkeleton(source) as THREE.Group

  group.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
  })

  const initialBox = new THREE.Box3().setFromObject(group)
  const initialSize = new THREE.Vector3()
  initialBox.getSize(initialSize)

  const targetHeight = 2.25
  const scale = initialSize.y > 0 ? targetHeight / initialSize.y : 1
  group.scale.setScalar(scale)

  const fittedBox = new THREE.Box3().setFromObject(group)
  const fittedCenter = new THREE.Vector3()
  fittedBox.getCenter(fittedCenter)

  group.position.x -= fittedCenter.x
  group.position.z -= fittedCenter.z
  group.position.y -= fittedBox.min.y
  group.position.y -= 0.02

  const animations = source.animations ?? []
  let mixer: THREE.AnimationMixer | null = null
  let action: THREE.AnimationAction | null = null

  if (animations.length > 0) {
    mixer = new THREE.AnimationMixer(group)
    action = mixer.clipAction(animations[0])
    action.setLoop(THREE.LoopRepeat, Infinity)
    action.enabled = true
    action.play()
  }

  return { group, mixer, action }
}

export default function TeacherPanel({ isTalking: _isTalking }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const frameRef = useRef<number | null>(null)
  const idleRigRef = useRef<LoadedRig | null>(null)
  const talkingRigRef = useRef<LoadedRig | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    camera.position.set(0, 1.3, 4.7)
    camera.lookAt(0, 1.15, 0)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.pointerEvents = 'none'

    container.replaceChildren(renderer.domElement)
    rendererRef.current = renderer

    const ambient = new THREE.AmbientLight(0xffffff, 2.2)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8)
    keyLight.position.set(3.2, 5.2, 4.4)
    const fillLight = new THREE.DirectionalLight(0xbfd9ff, 1.15)
    fillLight.position.set(-2.7, 2.9, 2.1)
    const rimLight = new THREE.DirectionalLight(0xfff3dd, 0.7)
    rimLight.position.set(0.8, 3.5, -3.1)

    scene.add(ambient, keyLight, fillLight, rimLight)

    const updateSize = () => {
      const width = container.clientWidth || 1
      const height = container.clientHeight || 1
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(container)
    resizeObserverRef.current = resizeObserver

    const loader = new FBXLoader()
    const clock = new THREE.Clock()

    const renderFrame = () => {
      if (cancelled) return

      const delta = clock.getDelta()
      idleRigRef.current?.mixer?.update(delta)
      talkingRigRef.current?.mixer?.update(delta)
      renderer.render(scene, camera)
      frameRef.current = window.requestAnimationFrame(renderFrame)
    }

    const loadRigs = async () => {
      setLoadState('loading')
      try {
        const [idleSource, talkingSource] = await Promise.all([
          loader.loadAsync(IDLE_MODEL_SRC),
          loader.loadAsync(TALKING_MODEL_SRC),
        ])

        if (cancelled) return

        const idleRig = createRig(idleSource)
        const talkingRig = createRig(talkingSource)

        idleRig.group.visible = false
        talkingRig.group.visible = true
        if (idleRig.action) idleRig.action.paused = true
        if (talkingRig.action) talkingRig.action.paused = false

        scene.add(idleRig.group, talkingRig.group)
        idleRigRef.current = idleRig
        talkingRigRef.current = talkingRig
        setLoadState('ready')
      } catch {
        if (!cancelled) {
          setLoadState('error')
        }
      }
    }

    void loadRigs()
    renderFrame()

    return () => {
      cancelled = true

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }

      resizeObserver.disconnect()
      resizeObserverRef.current = null

      if (idleRigRef.current) {
        scene.remove(idleRigRef.current.group)
      }
      if (talkingRigRef.current) {
        scene.remove(talkingRigRef.current.group)
      }
      disposeRig(idleRigRef.current)
      disposeRig(talkingRigRef.current)
      idleRigRef.current = null
      talkingRigRef.current = null

      renderer.dispose()
      rendererRef.current = null
      container.replaceChildren()
    }
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        background: `
          radial-gradient(circle at 50% 28%, rgba(255,255,255,0.06), rgba(255,255,255,0) 34%),
          linear-gradient(180deg, rgba(9,11,20,0.96) 0%, rgba(6,8,15,0.98) 100%)
        `,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03), 0 18px 48px rgba(0,0,0,0.38)',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />

      {loadState !== 'ready' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            background: 'radial-gradient(circle at 50% 45%, rgba(20,24,38,0.2), rgba(9,11,20,0.58))',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: loadState === 'error' ? 'rgba(255,160,160,0.85)' : 'rgba(196,181,253,0.82)',
            }}
          >
            {loadState === 'error' ? '3D Load Failed' : 'Loading 3D Teacher'}
          </span>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '14px',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(239,178,255,0.74)',
            textShadow: '0 0 12px rgba(239,178,255,0.28)',
          }}
        >
          3D Teacher
        </span>
      </div>
    </div>
  )
}
