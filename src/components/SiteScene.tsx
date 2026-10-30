import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Grid, Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { SceneLayers, SceneQuality, SceneView, SiteAsset, SiteZone } from '../types/operations'
import { YARD_TRUCK_ROUTE } from '../data/site-data'

const DEFAULT_CAMERA = new THREE.Vector3(35, 30, 38)
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)
const CANVAS_CAMERA = { position: [DEFAULT_CAMERA.x, DEFAULT_CAMERA.y, DEFAULT_CAMERA.z] as [number, number, number], fov: 38, near: 0.1, far: 150 }
const CANVAS_DPR: [number, number] = [1, 1.5]
const CANVAS_GL = { antialias: true, powerPreference: 'high-performance' as const }

interface SiteSceneProps {
  assets: SiteAsset[]
  selectedId: string | null
  layers: SceneLayers
  zones: SiteZone[]
  selectedZoneId: string | null
  resetKey: number
  focusRequest: { assetId: string; key: number; position: [number, number]; distance: number } | null
  view: SceneView
  quality: SceneQuality
  onSelect: (assetId: string) => void
  onSelectZone: (zoneId: string | null) => void
}

function CameraRig({ resetKey, focusRequest, view }: Pick<SiteSceneProps, 'resetKey' | 'focusRequest' | 'view'>) {
  const camera = useThree((state) => state.camera)
  const controls = useRef<OrbitControlsImpl>(null)
  const transition = useRef<{ fromPosition: THREE.Vector3; fromTarget: THREE.Vector3; toPosition: THREE.Vector3; toTarget: THREE.Vector3; elapsed: number } | null>(null)

  useEffect(() => {
    const currentTarget = controls.current?.target.clone() ?? DEFAULT_TARGET.clone()
    const currentPosition = camera.position.clone()
    const destinationTarget = DEFAULT_TARGET.clone()
    transition.current = {
      fromPosition: currentPosition,
      fromTarget: currentTarget,
      toPosition: DEFAULT_CAMERA.clone(),
      toTarget: destinationTarget,
      elapsed: 0,
    }
    const positions: Record<SceneView, THREE.Vector3> = {
      perspective: DEFAULT_CAMERA.clone(),
      isometric: new THREE.Vector3(40, 43, 40),
      'top-down': new THREE.Vector3(0.01, 61, 0.01),
    }
    transition.current.toPosition.copy(positions[view])
  }, [camera, resetKey, view])

  useEffect(() => {
    if (!focusRequest || !controls.current) return
    const currentTarget = controls.current.target.clone()
    const currentPosition = camera.position.clone()
    const destinationTarget = new THREE.Vector3(focusRequest.position[0], 0, focusRequest.position[1])
    let offset = currentPosition.clone().sub(currentTarget)
    if (offset.length() < 1) offset = new THREE.Vector3(16, 13, 17)
    offset.setLength(focusRequest.distance)
    const destinationPosition = destinationTarget.clone().add(offset)

    transition.current = {
      fromPosition: currentPosition,
      fromTarget: currentTarget,
      toPosition: destinationPosition,
      toTarget: destinationTarget,
      elapsed: 0,
    }
  }, [camera, focusRequest])

  useFrame((_, delta) => {
    const current = transition.current
    if (!current) return
    current.elapsed = Math.min(1, current.elapsed + delta / 0.72)
    const progress = current.elapsed * current.elapsed * (3 - 2 * current.elapsed)
    camera.position.lerpVectors(current.fromPosition, current.toPosition, progress)
    controls.current?.target.lerpVectors(current.fromTarget, current.toTarget, progress)
    controls.current?.update()
    if (current.elapsed >= 1) transition.current = null
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, 0, 0]}
      enableDamping
      dampingFactor={0.075}
      minDistance={12}
      maxDistance={76}
      maxPolarAngle={Math.PI / 2.06}
      minPolarAngle={0.18}
      rotateSpeed={0.62}
      panSpeed={0.68}
      zoomSpeed={0.78}
    />
  )
}

function CanvasLabel({ children, position, rotation = [0, 0, 0], color = '#c5d3b6' }: {
  children: string
  position: [number, number, number]
  rotation?: [number, number, number]
  color?: string
}) {
  const label = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (!context) return null
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.font = '600 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineJoin = 'round'
    context.lineWidth = 6
    context.strokeStyle = '#101515'
    context.strokeText(children, canvas.width / 2, canvas.height / 2)
    context.fillStyle = color
    context.fillText(children, canvas.width / 2, canvas.height / 2)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const width = Math.min(10, Math.max(2.2, children.length * 0.46))
    return { texture, width, height: width / 4 }
  }, [children, color])

  useEffect(() => () => label?.texture.dispose(), [label])
  if (!label) return null

  return (
    <mesh position={position} rotation={rotation} renderOrder={2}>
      <planeGeometry args={[label.width, label.height]} />
      <meshBasicMaterial map={label.texture} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

function ModelLabel({ children, position }: { children: string; position: [number, number, number] }) {
  return <CanvasLabel position={position}>{children}</CanvasLabel>
}

function statusColor(status: SiteAsset['status']) {
  if (status === 'offline') return '#fb7185'
  if (status === 'attention' || status === 'maintenance') return '#fbbf24'
  if (status === 'active') return '#60a5fa'
  return '#34d399'
}

function LoadingBays({ width, depth, buildingHeight, assetName }: { width: number; depth: number; buildingHeight: number; assetName: string }) {
  const count = width >= 10 ? 3 : width >= 8 ? 2 : 0
  const doorWidth = Math.min(2.15, width / (count + 1) * 0.72)
  const doorHeight = Math.min(2.8, buildingHeight * 0.52)
  const centers = Array.from({ length: count }, (_, index) => -width / 2 + (width / (count + 1)) * (index + 1))
  const platformWidth = Math.min(width * 0.88, 10.5)
  const front = depth / 2

  return <group>
    {count > 0 ? <>
      <mesh receiveShadow position={[0, 0.18, front + 0.62]}><boxGeometry args={[platformWidth, 0.36, 1.25]} /><meshStandardMaterial color="#515b57" roughness={0.92} /></mesh>
      <mesh castShadow position={[0, doorHeight + 0.48, front + 0.2]}><boxGeometry args={[platformWidth + 0.4, 0.12, 0.9]} /><meshStandardMaterial color="#68736e" metalness={0.26} roughness={0.62} /></mesh>
      {centers.map((center, index) => <group key={index}>
        <mesh position={[center, doorHeight / 2 + 0.08, front + 0.065]}><boxGeometry args={[doorWidth, doorHeight, 0.08]} /><meshStandardMaterial color="#28312f" roughness={0.82} /></mesh>
        {[-1, 1].map((side) => <mesh key={side} position={[center + side * (doorWidth / 2 + 0.08), doorHeight / 2 + 0.08, front + 0.1]}><boxGeometry args={[0.12, doorHeight + 0.16, 0.14]} /><meshStandardMaterial color="#858e83" roughness={0.75} /></mesh>)}
        {Array.from({ length: 4 }, (_, rib) => <mesh key={rib} position={[center, 0.38 + rib * 0.56, front + 0.115]}><boxGeometry args={[doorWidth - 0.12, 0.035, 0.025]} /><meshStandardMaterial color="#46504c" roughness={0.8} /></mesh>)}
        {[-1, 1].map((side) => <mesh key={`bumper-${side}`} castShadow position={[center + side * (doorWidth / 2 + 0.22), 0.4, front + 1.26]}><boxGeometry args={[0.14, 0.52, 0.16]} /><meshStandardMaterial color="#c0a15e" roughness={0.66} /></mesh>)}
        <mesh position={[center, 0.375, front + 1.265]}><boxGeometry args={[doorWidth * 0.8, 0.025, 0.025]} /><meshBasicMaterial color="#d0ae58" /></mesh>
      </group>)}
    </> : <>
      <mesh position={[0, 1.05, front + 0.06]}><boxGeometry args={[1.35, 1.85, 0.08]} /><meshStandardMaterial color="#293130" roughness={0.72} /></mesh>
      <mesh position={[-1.8, 1.75, front + 0.08]}><boxGeometry args={[1.1, 0.75, 0.08]} /><meshStandardMaterial color="#78918e" metalness={0.18} roughness={0.42} /></mesh>
      <mesh position={[1.8, 1.75, front + 0.08]}><boxGeometry args={[1.1, 0.75, 0.08]} /><meshStandardMaterial color="#78918e" metalness={0.18} roughness={0.42} /></mesh>
    </>}
    <CanvasLabel position={[0, Math.max(1.25, buildingHeight - 0.48), front + 0.14]} color="#d8dfd2">{assetName.toUpperCase()}</CanvasLabel>
  </group>
}

function SiteFence() {
  const fence = useRef<THREE.InstancedMesh>(null)
  const posts = useMemo(() => {
    const points: [number, number][] = []
    for (let x = -29; x <= 27; x += 4) points.push([x, -19])
    for (let x = -29; x <= 27; x += 4) if (x < -4 || x > 6) points.push([x, 19])
    for (let z = -15; z <= 15; z += 4) { points.push([-29, z], [29, z]) }
    return points
  }, [])

  useLayoutEffect(() => {
    const mesh = fence.current
    if (!mesh) return
    const object = new THREE.Object3D()
    posts.forEach(([x, z], index) => {
      object.position.set(x, 0.74, z)
      object.updateMatrix()
      mesh.setMatrixAt(index, object.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [posts])

  const rails: { position: [number, number, number]; size: [number, number, number] }[] = [
    { position: [0, 0, -19], size: [58, 0.08, 0.07] },
    { position: [-29, 0, 0], size: [0.07, 0.08, 38] },
    { position: [29, 0, 0], size: [0.07, 0.08, 38] },
    { position: [-16.5, 0, 19], size: [25, 0.08, 0.07] },
    { position: [17.5, 0, 19], size: [23, 0.08, 0.07] },
  ]

  return <group name="site-perimeter-fence">
    <instancedMesh ref={fence} args={[undefined, undefined, posts.length]} castShadow receiveShadow>
      <boxGeometry args={[0.11, 1.48, 0.11]} />
      <meshStandardMaterial color="#59645e" metalness={0.48} roughness={0.66} />
    </instancedMesh>
    {rails.flatMap((rail, index) => [0.53, 1.16].map((height) => <mesh key={`${index}-${height}`} position={[rail.position[0], height, rail.position[2]]} castShadow><boxGeometry args={rail.size} /><meshStandardMaterial color="#59645e" metalness={0.48} roughness={0.66} /></mesh>))}
  </group>
}

function StoragePallets() {
  const stacks: [number, number, number][] = [[25, 0, 7], [25, 0, 10], [28, 0, 7], [28, 0, 10]]
  return <group name="loading-apron-pallets">
    {stacks.map(([x, , z], index) => <group key={index} position={[x, 0, z]}>
      <mesh receiveShadow position={[0, 0.09, 0]}><boxGeometry args={[1.5, 0.16, 1.15]} /><meshStandardMaterial color="#786347" roughness={0.94} /></mesh>
      {[-0.38, 0, 0.38].map((offset) => <mesh key={offset} position={[0, 0.2, offset]}><boxGeometry args={[1.4, 0.08, 0.11]} /><meshStandardMaterial color="#9a805a" roughness={0.92} /></mesh>)}
      <mesh castShadow position={[0, 0.75, 0]}><boxGeometry args={[0.98, 0.95, 0.78]} /><meshStandardMaterial color={index % 2 ? '#6c7771' : '#768078'} roughness={0.82} /></mesh>
      <mesh position={[0, 0.76, 0.4]}><boxGeometry args={[0.64, 0.62, 0.025]} /><meshStandardMaterial color="#343c39" roughness={0.86} /></mesh>
    </group>)}
  </group>
}

function AssetGroup({ asset, selected, showLabel, onSelect }: {
  asset: SiteAsset
  selected: boolean
  showLabel: boolean
  onSelect: (event: ThreeEvent<MouseEvent>, assetId: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const body = selected ? '#687b49' : '#394447'
  const clickable = (event: ThreeEvent<MouseEvent>) => onSelect(event, asset.id)
  const footprint = asset.footprint
  const height = asset.height ?? (asset.kind === 'lighting' ? 7.6 : asset.kind === 'checkpoint' ? 2.1 : 1.2)
  const ringRadius = footprint ? Math.max(...footprint) * 0.57 : asset.kind === 'vehicle' ? 1.65 : 1.35
  const bounds: Record<SiteAsset['kind'], [number, number, number]> = {
    warehouse: [footprint?.[0] ?? 8, height, footprint?.[1] ?? 6],
    'process-hall': [footprint?.[0] ?? 8, height, footprint?.[1] ?? 6],
    vehicle: [5, 2.4, 2.3], container: [5.8, 2.35, 3.1], pump: [3.7, 2.25, 3], sensor: [1.8, 2.3, 1.8],
    generator: [5.2, 2.9, 3.1], lighting: [1.8, 8, 1.8], checkpoint: [5, 2.4, 2.4],
  }
  const [boundWidth, boundHeight, boundDepth] = bounds[asset.kind]

  return (
    <group position={[asset.position[0], 0, asset.position[1]]} rotation={[0, asset.kind === 'vehicle' ? asset.heading ?? 0 : 0, 0]} name={asset.id} onClick={clickable} onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }} onPointerOut={() => { setHovered(false); document.body.style.cursor = '' }}>
      {asset.kind === 'warehouse' || asset.kind === 'process-hall' ? (
        <>
          <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
            <boxGeometry args={[footprint?.[0] ?? 8, height, footprint?.[1] ?? 6]} />
            <meshStandardMaterial color={selected ? '#687b49' : hovered ? '#53655e' : body} roughness={0.88} metalness={0.08} />
          </mesh>
          <mesh castShadow position={[0, height + 0.12, 0]}>
            <boxGeometry args={[(footprint?.[0] ?? 8) + 0.38, 0.26, (footprint?.[1] ?? 6) + 0.38]} />
            <meshStandardMaterial color={selected ? '#9aaa7b' : '#667170'} roughness={0.72} metalness={0.16} />
          </mesh>
          <LoadingBays width={footprint?.[0] ?? 8} depth={footprint?.[1] ?? 6} buildingHeight={height} assetName={asset.id} />
          {Array.from({ length: Math.max(1, Math.floor((footprint?.[0] ?? 8) / 6)) }, (_, index) => {
            const ventCount = Math.max(1, Math.floor((footprint?.[0] ?? 8) / 6))
            const x = ventCount === 1 ? 0 : -(footprint?.[0] ?? 8) / 4 + index * ((footprint?.[0] ?? 8) / 2) / (ventCount - 1)
            return <group key={`roof-vent-${index}`} position={[x, height + 0.3, -(footprint?.[1] ?? 6) / 4]}>
              <mesh castShadow><boxGeometry args={[1.05, 0.48, 0.82]} /><meshStandardMaterial color="#89918b" metalness={0.32} roughness={0.58} /></mesh>
              <mesh position={[0, 0.26, 0]}><boxGeometry args={[0.8, 0.08, 0.65]} /><meshStandardMaterial color="#434c49" metalness={0.42} roughness={0.5} /></mesh>
              <mesh position={[0, 0.29, 0]}><cylinderGeometry args={[0.22, 0.22, 0.08, 10]} /><meshStandardMaterial color="#29312f" metalness={0.35} /></mesh>
            </group>
          })}
          {asset.kind === 'process-hall' && <><mesh position={[0, height + 1.1, -1.5]} castShadow><cylinderGeometry args={[0.48, 0.48, 1.8, 12]} /><meshStandardMaterial color="#77817d" metalness={0.4} roughness={0.55} /></mesh><mesh position={[0, height + 2.05, -1.5]}><cylinderGeometry args={[0.52, 0.52, 0.12, 12]} /><meshStandardMaterial color="#a28c62" metalness={0.35} /></mesh></>}
        </>
      ) : null}

      {asset.kind === 'vehicle' ? (
        <>
          {asset.id === 'VHC-12' ? <>
            <mesh castShadow position={[0, 0.55, 0]}><boxGeometry args={[2.6, 0.56, 1.32]} /><meshStandardMaterial color={body} roughness={0.72} metalness={0.25} /></mesh>
            <mesh castShadow position={[-0.42, 1.04, 0]}><boxGeometry args={[1.08, 0.72, 1.16]} /><meshStandardMaterial color={selected ? '#d9f0a8' : '#71807a'} roughness={0.56} metalness={0.16} /></mesh>
            {[-0.62, 0.58].map((x) => <mesh key={x} position={[x, 1.68, 0]}><boxGeometry args={[0.11, 1.25, 0.1]} /><meshStandardMaterial color="#c7a25d" metalness={0.42} /></mesh>)}
            <mesh castShadow position={[-0.02, 2.28, 0]}><boxGeometry args={[1.35, 0.13, 1.4]} /><meshStandardMaterial color="#c7a25d" metalness={0.42} /></mesh>
            <mesh position={[1.43, 1.3, 0]}><boxGeometry args={[0.12, 1.95, 1.2]} /><meshStandardMaterial color="#c49c50" metalness={0.48} /></mesh>
            {[-0.43, 0.43].map((z) => <mesh key={z} position={[2.08, 0.13, z]}><boxGeometry args={[1.45, 0.09, 0.09]} /><meshStandardMaterial color="#dbb466" metalness={0.54} /></mesh>)}
            {[-0.9, 0.8].flatMap((x) => [-0.62, 0.62].map((z) => <mesh key={`${x}-${z}`} castShadow rotation={[0, 0, Math.PI / 2]} position={[x, 0.35, z]}><cylinderGeometry args={[0.29, 0.29, 0.18, 14]} /><meshStandardMaterial color="#141918" roughness={0.9} /></mesh>))}
          </> : asset.id === 'VHC-03' ? <>
            <mesh castShadow position={[0.05, 0.62, 0]}><boxGeometry args={[3.15, 0.55, 1.35]} /><meshStandardMaterial color={body} roughness={0.7} metalness={0.22} /></mesh>
            <mesh castShadow position={[-0.62, 1.2, 0]}><boxGeometry args={[1.38, 0.92, 1.3]} /><meshStandardMaterial color={selected ? '#d9f0a8' : '#738580'} roughness={0.48} metalness={0.2} /></mesh>
            <mesh position={[-0.72, 1.42, 0.66]}><boxGeometry args={[0.76, 0.48, 0.035]} /><meshStandardMaterial color="#a3b7b3" metalness={0.15} roughness={0.3} /></mesh>
            <mesh castShadow position={[0.74, 1.18, 0]}><boxGeometry args={[1.5, 1.45, 1.35]} /><meshStandardMaterial color="#65726d" roughness={0.76} metalness={0.16} /></mesh>
            <mesh position={[0.74, 1.94, 0]}><boxGeometry args={[1.38, 0.07, 1.2]} /><meshStandardMaterial color="#929a8c" roughness={0.64} /></mesh>
            {[-0.96, 1.04].flatMap((x) => [-0.61, 0.61].map((z) => <mesh key={`${x}-${z}`} castShadow rotation={[0, 0, Math.PI / 2]} position={[x, 0.35, z]}><cylinderGeometry args={[0.3, 0.3, 0.18, 14]} /><meshStandardMaterial color="#141918" roughness={0.9} /></mesh>))}
            {[-0.45, 0.45].map((z) => <mesh key={z} position={[-1.42, 0.8, z]}><boxGeometry args={[0.08, 0.16, 0.16]} /><meshStandardMaterial color="#e0bb70" emissive="#5c3f19" emissiveIntensity={0.18} /></mesh>)}
          </> : <>
            <mesh castShadow position={[0, 0.62, 0]}><boxGeometry args={[3.1, 0.58, 1.4]} /><meshStandardMaterial color={body} roughness={0.68} metalness={0.24} /></mesh>
            <mesh castShadow position={[-0.72, 1.22, 0]}><boxGeometry args={[1.25, 0.86, 1.33]} /><meshStandardMaterial color={selected ? '#d9f0a8' : '#74817a'} roughness={0.5} metalness={0.18} /></mesh>
            <mesh position={[-0.72, 1.42, 0.675]}><boxGeometry args={[0.7, 0.4, 0.025]} /><meshStandardMaterial color="#a0b5b1" metalness={0.18} roughness={0.28} /></mesh>
            <mesh castShadow position={[0.72, 1.06, 0]}><boxGeometry args={[1.55, 0.72, 1.32]} /><meshStandardMaterial color="#626d67" roughness={0.72} metalness={0.19} /></mesh>
            {[-0.98, 1.0].flatMap((x) => [-0.63, 0.63].map((z) => <mesh key={`${x}-${z}`} castShadow rotation={[0, 0, Math.PI / 2]} position={[x, 0.35, z]}><cylinderGeometry args={[0.29, 0.29, 0.18, 14]} /><meshStandardMaterial color="#141918" roughness={0.9} /></mesh>))}
            {[-0.43, 0.43].map((z) => <mesh key={z} position={[-1.44, 0.68, z]}><boxGeometry args={[0.08, 0.14, 0.16]} /><meshStandardMaterial color="#e0bb70" emissive="#5c3f19" emissiveIntensity={0.18} /></mesh>)}
          </>}
        </>
      ) : null}

      {asset.kind === 'container' ? (
        <>
          <mesh castShadow receiveShadow position={[0, 1.05, 0]}><boxGeometry args={[5.5, 2.1, 2.8]} /><meshStandardMaterial color={selected ? '#9bbc58' : '#59675f'} roughness={0.72} metalness={0.18} /></mesh>
          {Array.from({ length: 9 }, (_, index) => <mesh key={index} position={[-2.45 + index * 0.61, 1.05, 1.42]}><boxGeometry args={[0.035, 1.85, 0.025]} /><meshStandardMaterial color="#858d83" metalness={0.32} /></mesh>)}
        </>
      ) : null}

      {asset.kind === 'pump' ? (
        <>
          <mesh castShadow position={[0, 0.65, 0]}><boxGeometry args={[3.2, 1.3, 2.6]} /><meshStandardMaterial color={body} metalness={0.28} roughness={0.55} /></mesh>
          <mesh castShadow position={[0, 1.62, 0]}><cylinderGeometry args={[0.78, 0.78, 0.68, 16]} /><meshStandardMaterial color={selected ? '#b5df65' : '#71817b'} metalness={0.43} roughness={0.48} /></mesh>
          <mesh position={[1.58, 0.88, 0]}><cylinderGeometry args={[0.11, 0.11, 0.72, 10]} /><meshStandardMaterial color="#bd9149" metalness={0.48} /></mesh>
        </>
      ) : null}

      {asset.kind === 'sensor' ? (
        <>
          <mesh castShadow position={[0, 0.78, 0]}><cylinderGeometry args={[0.22, 0.28, 1.56, 10]} /><meshStandardMaterial color="#74837d" metalness={0.52} roughness={0.46} /></mesh>
          <mesh position={[0, 1.68, 0]}><sphereGeometry args={[0.42, 16, 12]} /><meshStandardMaterial color={selected ? '#c5f26d' : asset.status === 'offline' ? '#dc6254' : '#94c77d'} emissive={asset.status === 'offline' ? '#64231d' : '#203c1c'} emissiveIntensity={0.68} /></mesh>
          <mesh position={[0, 0.17, 0]}><cylinderGeometry args={[0.62, 0.74, 0.18, 12]} /><meshStandardMaterial color="#475451" metalness={0.26} /></mesh>
        </>
      ) : null}

      {asset.kind === 'generator' ? (
        <>
          <mesh castShadow position={[0, 0.85, 0]}><boxGeometry args={[4.8, 1.7, 2.7]} /><meshStandardMaterial color={body} roughness={0.72} metalness={0.2} /></mesh>
          <mesh position={[0.3, 1.08, 1.39]}><boxGeometry args={[2.4, 0.9, 0.06]} /><meshStandardMaterial color="#242b2b" roughness={0.64} /></mesh>
          <mesh castShadow position={[-1.5, 2.05, -0.5]}><cylinderGeometry args={[0.18, 0.18, 1.1, 10]} /><meshStandardMaterial color="#78827b" metalness={0.5} /></mesh>
        </>
      ) : null}

      {asset.kind === 'lighting' && <group><mesh castShadow position={[0, 3.8, 0]}><cylinderGeometry args={[0.14, 0.24, 7.6, 8]} /><meshStandardMaterial color="#87938c" metalness={0.55} roughness={0.48} /></mesh><mesh castShadow position={[0, 7.55, 0]}><boxGeometry args={[1.3, 0.28, 0.42]} /><meshStandardMaterial color="#dce6bf" emissive="#6f8154" emissiveIntensity={0.3} /></mesh></group>}

      {asset.kind === 'checkpoint' && <group><mesh castShadow position={[0, 0.85, 0]}><boxGeometry args={[2.8, 1.7, 1.8]} /><meshStandardMaterial color="#444e50" roughness={0.78} /></mesh><mesh castShadow position={[1.8, 1.3, 0]} rotation={[0, 0, -0.23]}><boxGeometry args={[4.2, 0.16, 0.16]} /><meshStandardMaterial color="#e6e7df" metalness={0.18} /></mesh><mesh position={[1.8, 1.3, 0.1]} rotation={[0, 0, -0.23]}><boxGeometry args={[0.68, 0.17, 0.18]} /><meshStandardMaterial color="#de6658" /></mesh></group>}

      {selected && <mesh position={[0, boundHeight / 2, 0]} renderOrder={1}><boxGeometry args={[boundWidth + 0.24, boundHeight + 0.24, boundDepth + 0.24]} /><meshBasicMaterial wireframe color="#d5f39b" transparent opacity={0.65} depthWrite={false} /></mesh>}
      {(selected || hovered) && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]}><torusGeometry args={[ringRadius, selected ? 0.075 : 0.055, 6, 72]} /><meshStandardMaterial color={selected ? '#c5f26d' : statusColor(asset.status)} emissive={selected ? '#668b24' : statusColor(asset.status)} emissiveIntensity={0.45} /></mesh>}
      {hovered && <Html position={[0, Math.max(height + 2, 2.5), 0]} center distanceFactor={18} style={{ pointerEvents: 'none' }}><div className="whitespace-nowrap rounded-md border border-white/10 bg-[#10161c]/95 px-2.5 py-1.5 text-xs text-white shadow-xl"><span className="font-semibold">{asset.name}</span><span className="ml-2 text-white/75">{asset.id} · {asset.status}</span></div></Html>}
      {showLabel && <ModelLabel position={[0, height + 1.05, 0]}>{asset.id}</ModelLabel>}
    </group>
  )
}

function SiteZones({ zones, selectedZoneId, onSelectZone, showLabels }: Pick<SiteSceneProps, 'zones' | 'selectedZoneId' | 'onSelectZone'> & { showLabels: boolean }) {
  return (
    <group>
      {zones.map((zone) => {
        const x = zone.center[0], z = zone.center[1], w = zone.footprint[0], d = zone.footprint[1]
        const corners: [number, number, number][] = [
          [x - w / 2, 0.025, z + d / 2],
          [x + w / 2, 0.025, z - d / 2],
          [x + w / 2, 0.025, z + d / 2],
          [x - w / 2, 0.025, z - d / 2],
        ]
        return <group key={zone.id} onClick={(event) => { event.stopPropagation(); onSelectZone(zone.id) }}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.018, z]}><planeGeometry args={[w, d]} /><meshBasicMaterial color={zone.color} transparent opacity={selectedZoneId === zone.id ? 0.14 : 0.045} depthWrite={false} /></mesh>
          <Line points={corners} color={zone.color} lineWidth={selectedZoneId === zone.id ? 1.6 : 0.7} transparent opacity={selectedZoneId === zone.id ? 0.95 : 0.56} />
          {showLabels && <CanvasLabel position={[x, 0.075, z + d / 2 - 0.6]} rotation={[-Math.PI / 2, 0, 0]} color="#c1cbc0">{zone.name.toUpperCase()}</CanvasLabel>}
        </group>
      })}
    </group>
  )
}

function RoadNetwork() {
  const markers = Array.from({ length: 27 }, (_, index) => index - 13)
  return (
    <group>
      <mesh receiveShadow position={[0, 0, 3.5]}><boxGeometry args={[59, 0.08, 3.1]} /><meshStandardMaterial color="#242b2b" roughness={0.96} /></mesh>
      <mesh receiveShadow position={[-1, 0.005, 0]}><boxGeometry args={[3.4, 0.08, 37]} /><meshStandardMaterial color="#252c2c" roughness={0.96} /></mesh>
      <mesh receiveShadow position={[0, 0.006, -12]}><boxGeometry args={[52, 0.08, 2.4]} /><meshStandardMaterial color="#202727" roughness={0.98} /></mesh>
      {markers.map((index) => <mesh key={index} position={[index * 2.15, 0.052, 3.5]}><boxGeometry args={[1.15, 0.025, 0.055]} /><meshBasicMaterial color="#b4bcac" transparent opacity={0.45} /></mesh>)}
      <mesh position={[0, 0.052, -12]}><boxGeometry args={[46, 0.02, 0.055]} /><meshBasicMaterial color="#88908a" transparent opacity={0.42} /></mesh>
      <mesh position={[0, 0.012, -19.7]}><boxGeometry args={[61, 0.05, 0.09]} /><meshStandardMaterial color="#7e6d48" /></mesh>
      <mesh position={[0, 0.012, 19.7]}><boxGeometry args={[61, 0.05, 0.09]} /><meshStandardMaterial color="#7e6d48" /></mesh>
      <mesh receiveShadow position={[1.15, 0.025, 1]}><boxGeometry args={[0.66, 0.035, 31]} /><meshStandardMaterial color="#343d3b" roughness={0.96} /></mesh>
      {Array.from({ length: 8 }, (_, index) => <mesh key={`crosswalk-${index}`} position={[-2.18 + index * 0.34, 0.055, 15.2]}><boxGeometry args={[0.2, 0.025, 0.76]} /><meshBasicMaterial color="#b9c0b5" transparent opacity={0.65} /></mesh>)}
      {[7, 10.5, 14, 17.5, 21].map((x) => <group key={x}>
        <mesh position={[x, 0.055, 5.2]}><boxGeometry args={[0.055, 0.025, 3]} /><meshBasicMaterial color="#c6bd99" transparent opacity={0.54} /></mesh>
        <mesh position={[x, 0.055, 11.6]}><boxGeometry args={[0.055, 0.025, 2.1]} /><meshBasicMaterial color="#c6bd99" transparent opacity={0.54} /></mesh>
      </group>)}
      <Line points={YARD_TRUCK_ROUTE.map(([x, z]) => [x, 0.063, z])} color="#8da6a0" lineWidth={1} transparent opacity={0.72} />
    </group>
  )
}

function SceneContents({ assets, selectedId, selectedZoneId, zones, layers, quality, onSelect, onSelectZone }: Pick<SiteSceneProps, 'assets' | 'selectedId' | 'selectedZoneId' | 'zones' | 'layers' | 'onSelect' | 'onSelectZone'> & { quality: SceneQuality }) {
  const handleAssetClick = (event: ThreeEvent<MouseEvent>, assetId: string) => {
    event.stopPropagation()
    onSelect(assetId)
  }

  const visibleKind = (kind: SiteAsset['kind']) => {
    if (kind === 'warehouse' || kind === 'process-hall') return layers.buildings
    if (kind === 'vehicle') return layers.mobile
    return layers.infrastructure
  }

  return (
    <>
      <color attach="background" args={['#101515']} />
      <fog attach="fog" args={['#101515', 56, 105]} />
      <ambientLight intensity={0.82} />
      <hemisphereLight args={['#d8dfd5', '#242a28', 1.1]} />
      <directionalLight position={[17, 31, 13]} intensity={2.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-37} shadow-camera-right={37} shadow-camera-top={27} shadow-camera-bottom={-27} shadow-bias={-0.00012} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
        <planeGeometry args={[76, 58]} />
        <meshStandardMaterial color="#1b2221" roughness={0.98} />
      </mesh>
      <Grid position={[0, -0.11, 0]} args={[76, 58]} cellSize={2} cellThickness={0.4} cellColor="#27302e" sectionSize={10} sectionThickness={0.8} sectionColor="#323c39" fadeDistance={72} fadeStrength={1.2} infiniteGrid={false} />
      {layers.roads && <RoadNetwork />}
      {layers.zones && <SiteZones zones={zones} selectedZoneId={selectedZoneId} onSelectZone={onSelectZone} showLabels={layers.labels} />}
      <SiteFence />
      {layers.infrastructure && <StoragePallets />}

      {assets.map((asset) => visibleKind(asset.kind) && <AssetGroup
        key={asset.id}
        asset={asset}
        selected={asset.id === selectedId}
        showLabel={layers.labels}
        onSelect={handleAssetClick}
      />)}

      {quality !== 'low' && <ContactShadows position={[0, -0.12, 0]} opacity={0.22} scale={70} blur={2.2} far={8} resolution={quality === 'high' ? 512 : 256} color="#000000" />}
    </>
  )
}

export const SiteScene = memo(function SiteScene({ assets, selectedId, selectedZoneId, zones, layers, resetKey, focusRequest, view, quality, onSelect, onSelectZone }: SiteSceneProps) {
  const handlePointerMissed = useCallback(() => onSelect(''), [onSelect])

  return (
      <Canvas
      fallback={<div className="grid h-full place-items-center bg-ops-bg p-6 text-center"><div><strong className="block text-sm text-ops-text">3D view unavailable</strong><span className="mt-1 block max-w-xs text-xs leading-5 text-ops-muted">This browser or device could not start WebGL. Try a hardware-accelerated browser.</span></div></div>}
      shadows={quality === 'low' ? false : 'basic'}
      dpr={quality === 'low' ? [0.75, 1] : quality === 'high' ? [1, 1.5] : CANVAS_DPR}
      camera={CANVAS_CAMERA}
      gl={CANVAS_GL}
      onPointerMissed={handlePointerMissed}
      aria-label="Interactive three-dimensional operations site. Drag to rotate, right click or two-finger drag to pan, and scroll to zoom."
    >
      <Suspense fallback={null}>
        <SceneContents assets={assets} selectedId={selectedId} selectedZoneId={selectedZoneId} zones={zones} layers={layers} quality={quality} onSelect={onSelect} onSelectZone={onSelectZone} />
        <CameraRig resetKey={resetKey} focusRequest={focusRequest} view={view} />
      </Suspense>
    </Canvas>
  )
})
