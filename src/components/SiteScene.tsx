import { memo, Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Grid, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { LayerState, SiteAsset } from '../types/operations'

const DEFAULT_CAMERA = new THREE.Vector3(35, 30, 38)
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)
const CANVAS_CAMERA = { position: [DEFAULT_CAMERA.x, DEFAULT_CAMERA.y, DEFAULT_CAMERA.z] as [number, number, number], fov: 38, near: 0.1, far: 150 }
const CANVAS_DPR: [number, number] = [1, 1.5]
const CANVAS_GL = { antialias: true, powerPreference: 'high-performance' as const }

interface SiteSceneProps {
  assets: SiteAsset[]
  selectedId: string | null
  layers: LayerState
  resetKey: number
  focusRequest: { assetId: string; key: number; position: [number, number]; distance: number } | null
  onSelect: (assetId: string) => void
}

function CameraRig({ resetKey, focusRequest }: Pick<SiteSceneProps, 'resetKey' | 'focusRequest'>) {
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
  }, [camera, resetKey])

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
    canvas.width = 1024
    canvas.height = 256
    const context = canvas.getContext('2d')
    if (!context) return null
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.font = '600 92px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineJoin = 'round'
    context.lineWidth = 10
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

function AssetGroup({ asset, selected, showLabel, onSelect }: {
  asset: SiteAsset
  selected: boolean
  showLabel: boolean
  onSelect: (event: ThreeEvent<MouseEvent>, assetId: string) => void
}) {
  const body = selected ? '#687b49' : '#394447'
  const clickable = (event: ThreeEvent<MouseEvent>) => onSelect(event, asset.id)
  const footprint = asset.footprint
  const height = asset.height ?? 1.2
  const ringRadius = footprint ? Math.max(...footprint) * 0.57 : asset.kind === 'vehicle' ? 1.65 : 1.35

  return (
    <group position={[asset.position[0], 0, asset.position[1]]} name={asset.id} onClick={clickable} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      {asset.kind === 'warehouse' || asset.kind === 'process-hall' ? (
        <>
          <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
            <boxGeometry args={[footprint?.[0] ?? 8, height, footprint?.[1] ?? 6]} />
            <meshStandardMaterial color={body} roughness={0.88} metalness={0.08} />
          </mesh>
          <mesh castShadow position={[0, height + 0.12, 0]}>
            <boxGeometry args={[(footprint?.[0] ?? 8) + 0.38, 0.26, (footprint?.[1] ?? 6) + 0.38]} />
            <meshStandardMaterial color={selected ? '#9aaa7b' : '#667170'} roughness={0.72} metalness={0.16} />
          </mesh>
          <mesh position={[0, height * 0.34, (footprint?.[1] ?? 6) / 2 + 0.03]}>
            <boxGeometry args={[1.5, height * 0.48, 0.08]} />
            <meshStandardMaterial color="#242b2c" roughness={0.65} />
          </mesh>
          {Array.from({ length: 4 }, (_, index) => (
            <mesh key={index} position={[-(footprint?.[0] ?? 8) / 2 + 1.5 + index * 2.2, 0.5, (footprint?.[1] ?? 6) / 2 + 0.06]}>
              <boxGeometry args={[1.2, 0.9, 0.08]} />
              <meshStandardMaterial color="#22292a" roughness={0.7} />
            </mesh>
          ))}
          {asset.kind === 'process-hall' && <mesh position={[0, height + 1.1, -1.5]} castShadow><cylinderGeometry args={[0.48, 0.48, 1.8, 12]} /><meshStandardMaterial color="#77817d" metalness={0.4} roughness={0.55} /></mesh>}
        </>
      ) : null}

      {asset.kind === 'vehicle' ? (
        <>
          <mesh castShadow position={[0, 0.72, 0]}>
            <boxGeometry args={[2.9, 0.72, 1.38]} />
            <meshStandardMaterial color={body} roughness={0.67} metalness={0.22} />
          </mesh>
          <mesh castShadow position={[-0.54, 1.32, 0]}>
            <boxGeometry args={[1.18, 0.62, 1.24]} />
            <meshStandardMaterial color={selected ? '#d9f0a8' : '#71807a'} roughness={0.56} metalness={0.16} />
          </mesh>
          {[-1.0, 1.0].flatMap((x) => [-0.52, 0.52].map((z) => (
            <mesh key={`${x}-${z}`} castShadow rotation={[0, 0, Math.PI / 2]} position={[x, 0.38, z]}>
              <cylinderGeometry args={[0.28, 0.28, 0.18, 14]} />
              <meshStandardMaterial color="#141918" roughness={0.9} />
            </mesh>
          )))}
          {asset.id === 'VHC-12' && <group position={[1.8, 0, 0]}><mesh position={[0.16, 1.05, 0]}><boxGeometry args={[0.09, 2.0, 0.09]} /><meshStandardMaterial color="#d2a34b" metalness={0.42} /></mesh><mesh position={[0.56, 1.0, 0]}><boxGeometry args={[0.8, 0.08, 0.09]} /><meshStandardMaterial color="#d2a34b" metalness={0.42} /></mesh></group>}
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

      {selected && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]}><torusGeometry args={[ringRadius, 0.055, 6, 72]} /><meshStandardMaterial color="#c5f26d" emissive="#668b24" emissiveIntensity={0.5} /></mesh>}
      {showLabel && <ModelLabel position={[0, height + 1.05, 0]}>{asset.id}</ModelLabel>}
    </group>
  )
}

function SiteZones() {
  const zones = [
    { title: 'NORTH STORAGE', x: -13, z: -3, w: 15, d: 11, color: '#8ca4a1' },
    { title: 'PROCESSING', x: 8, z: -3, w: 14, d: 12, color: '#a3b777' },
    { title: 'LOADING APRON', x: 14, z: 8, w: 18, d: 10, color: '#c0a26a' },
    { title: 'UTILITY CORRIDOR', x: -17, z: -7, w: 12, d: 8, color: '#8799a2' },
  ]

  return (
    <group>
      {zones.map((zone) => {
        const corners: [number, number, number][] = [
          [zone.x - zone.w / 2, 0.025, zone.z + zone.d / 2],
          [zone.x + zone.w / 2, 0.025, zone.z - zone.d / 2],
          [zone.x + zone.w / 2, 0.025, zone.z + zone.d / 2],
          [zone.x - zone.w / 2, 0.025, zone.z - zone.d / 2],
        ]
        return <group key={zone.title}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[zone.x, 0.018, zone.z]}><planeGeometry args={[zone.w, zone.d]} /><meshBasicMaterial color={zone.color} transparent opacity={0.045} depthWrite={false} /></mesh>
          <Line points={corners} color={zone.color} lineWidth={0.7} transparent opacity={0.56} />
          <CanvasLabel position={[zone.x, 0.075, zone.z + zone.d / 2 - 0.6]} rotation={[-Math.PI / 2, 0, 0]} color="#c1cbc0">
            {zone.title}
          </CanvasLabel>
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
    </group>
  )
}

function Perimeter() {
  const corners: [number, number, number][] = [[-29, 0.02, -19], [29, 0.02, -19], [29, 0.02, 19], [-29, 0.02, 19], [-29, 0.02, -19]]
  return <Line points={corners} color="#586260" lineWidth={1} transparent opacity={0.75} />
}

function SceneContents({ assets, selectedId, layers, onSelect }: Pick<SiteSceneProps, 'assets' | 'selectedId' | 'layers' | 'onSelect'>) {
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
      <Perimeter />
      {layers.zones && <SiteZones />}

      {assets.map((asset) => visibleKind(asset.kind) && <AssetGroup
        key={asset.id}
        asset={asset}
        selected={asset.id === selectedId}
        showLabel={layers.labels}
        onSelect={handleAssetClick}
      />)}

      <ContactShadows position={[0, -0.12, 0]} opacity={0.28} scale={73} blur={2.5} far={10} resolution={512} color="#000000" />
    </>
  )
}

export const SiteScene = memo(function SiteScene({ assets, selectedId, layers, resetKey, focusRequest, onSelect }: SiteSceneProps) {
  const handlePointerMissed = useCallback(() => onSelect(''), [onSelect])

  return (
      <Canvas
      fallback={<div className="webgl-fallback"><strong>3D view unavailable</strong><span>This browser or device could not start WebGL. Try a hardware-accelerated browser.</span></div>}
      shadows
      dpr={CANVAS_DPR}
      camera={CANVAS_CAMERA}
      gl={CANVAS_GL}
      onPointerMissed={handlePointerMissed}
      aria-label="Interactive three-dimensional operations site. Drag to rotate, right click or two-finger drag to pan, and scroll to zoom."
    >
      <Suspense fallback={null}>
        <SceneContents assets={assets} selectedId={selectedId} layers={layers} onSelect={onSelect} />
        <CameraRig resetKey={resetKey} focusRequest={focusRequest} />
      </Suspense>
    </Canvas>
  )
})
