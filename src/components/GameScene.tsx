import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, useTexture } from '@react-three/drei'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { Controls } from '../types/controls'
import { useGameStore } from '../stores/gameStore'
import { useTerrainStore } from '../stores/terrainStore'
import { useEconomyStore } from '../stores/economyStore'
import { TerrainSystem } from './systems/TerrainSystem'
import { RoadSystem } from './systems/RoadSystem'
import { BuildingSystem } from './systems/BuildingSystem'
import { TrafficSystem } from './systems/TrafficSystem'
import { AgentSystem } from './systems/AgentSystem'
import { EconomySystem } from './systems/EconomySystem'
import { EducationSystem } from './systems/EducationSystem'

export function GameScene() {
  const { camera, scene } = useThree()
  const controlsRef = useRef<any>()
  const [subscribe, getState] = useKeyboardControls<Controls>()
  
  const { 
    initializeGame, 
    updateSimulation, 
    gameTime,
    isInitialized,
    selectedTool,
    showDebug,
    placeBuilding 
  } = useGameStore()

  const { 
    initializeTerrain,
    isInitialized: terrainInitialized 
  } = useTerrainStore()

  const { 
    initializeEconomy 
  } = useEconomyStore()

  // Mouse interaction for building placement
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  // Initialize game systems
  useEffect(() => {
    if (!isInitialized) {
      console.log('🎮 Initializing game systems...')
      initializeGame()
      initializeTerrain()
      initializeEconomy()
    }
  }, [isInitialized, initializeGame, initializeTerrain, initializeEconomy])

  // Handle mouse clicks for building placement
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!selectedTool || !selectedTool.startsWith('zone_') && !selectedTool.startsWith('service_')) {
        return
      }

      // Calculate mouse position in normalized device coordinates
      const canvas = event.target as HTMLCanvasElement
      const rect = canvas.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      // Cast ray from camera
      raycaster.current.setFromCamera(mouse.current, camera)

      // Create a ground plane for intersection
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const intersection = new THREE.Vector3()
      
      if (raycaster.current.ray.intersectPlane(groundPlane, intersection)) {
        // Snap to grid
        const gridSize = 2
        const snappedX = Math.round(intersection.x / gridSize) * gridSize
        const snappedZ = Math.round(intersection.z / gridSize) * gridSize
        const buildingPosition = new THREE.Vector3(snappedX, 0, snappedZ)

        console.log(`🎯 Attempting to place ${selectedTool} at position:`, buildingPosition.toArray())
        
        const success = placeBuilding(selectedTool, buildingPosition)
        if (success) {
          console.log('✅ Building placed successfully')
        } else {
          console.log('❌ Failed to place building')
        }
      }
    }

    const canvas = scene.children.find(child => child instanceof THREE.Scene)?.parent?.parent as any
    if (canvas?.domElement) {
      canvas.domElement.addEventListener('click', handleClick)
      return () => canvas.domElement.removeEventListener('click', handleClick)
    }
  }, [selectedTool, camera, scene, placeBuilding])

  // Game loop - runs every frame
  useFrame((state, delta) => {
    if (!isInitialized || !terrainInitialized) return
    
    // Update simulation
    updateSimulation(delta)
    
    // Handle camera controls with keyboard
    const controls = getState()
    const cameraSpeed = 0.5
    
    if (controls.forward) {
      camera.position.z -= cameraSpeed
      if (controlsRef.current) controlsRef.current.target.z -= cameraSpeed
    }
    if (controls.back) {
      camera.position.z += cameraSpeed
      if (controlsRef.current) controlsRef.current.target.z += cameraSpeed
    }
    if (controls.left) {
      camera.position.x -= cameraSpeed
      if (controlsRef.current) controlsRef.current.target.x -= cameraSpeed
    }
    if (controls.right) {
      camera.position.x += cameraSpeed
      if (controlsRef.current) controlsRef.current.target.x += cameraSpeed
    }
    
    // Update orbit controls if we moved with keyboard
    if (controlsRef.current && (controls.forward || controls.back || controls.left || controls.right)) {
      controlsRef.current.update()
    }
  })

  // Debug logging for controls
  useEffect(() => {
    return subscribe(
      (state) => ({ 
        forward: state.forward, 
        back: state.back, 
        left: state.left, 
        right: state.right,
        action: state.action,
        debug: state.debug
      }),
      (controls) => {
        if (Object.values(controls).some(Boolean)) {
          console.log('🎮 Controls active:', controls)
        }
      }
    )
  }, [subscribe])

  return (
    <>
      {/* Lighting Setup */}
      <ambientLight intensity={0.6} />
      
      {/* Main directional light (sun) */}
      <directionalLight 
        position={[50, 50, 25]} 
        intensity={1.2}
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-camera-near={0.1}
        shadow-camera-far={200}
      />
      
      {/* Hemisphere light for ambient fill */}
      <hemisphereLight 
        args={['#87CEEB', '#98FB98', 0.4]} 
      />

      {/* Camera Controls */}
      <OrbitControls 
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxDistance={150}
        minDistance={8}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 6}
        target={[0, 0, 0]}
        dampingFactor={0.05}
        enableDamping={true}
      />

      {/* Grid Helper */}
      <Grid 
        args={[200, 200]} 
        position={[0, 0.01, 0]}
        cellSize={2}
        cellThickness={0.8}
        cellColor={'#6f6f6f'}
        sectionSize={10}
        sectionThickness={1.2}
        sectionColor={'#9d4b4b'}
        fadeDistance={100}
        fadeStrength={1}
      />

      {/* Core Game Systems */}
      <TerrainSystem />
      <RoadSystem />
      <BuildingSystem />
      <TrafficSystem />
      <AgentSystem />
      <EconomySystem />
      <EducationSystem />

      {/* Debug markers */}
      {showDebug && (
        <>
          {/* Origin marker */}
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[0.5, 2, 0.5]} />
            <meshBasicMaterial color="red" />
          </mesh>
          
          {/* Cardinal direction markers */}
          <mesh position={[10, 0.5, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="blue" />
          </mesh>
          <mesh position={[0, 0.5, 10]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="green" />
          </mesh>
        </>
      )}

      {/* Development info */}
      {process.env.NODE_ENV === 'development' && (
        <mesh position={[0, 15, 0]}>
          <sphereGeometry args={[0.2, 8, 6]} />
          <meshBasicMaterial color="yellow" />
        </mesh>
      )}
    </>
  )
}
