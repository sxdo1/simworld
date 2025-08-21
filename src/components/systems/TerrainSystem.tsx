import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useTerrainStore } from '../../stores/terrainStore'
import { useGameStore } from '../../stores/gameStore'

export function TerrainSystem() {
  const meshRef = useRef<THREE.Mesh>(null)
  const waterRef = useRef<THREE.Group>(null)
  
  const { 
    terrainCells, 
    waterBodies, 
    isInitialized,
    terrainSize,
    cellSize 
  } = useTerrainStore()
  
  const { showDebug } = useGameStore()

  // Load textures
  const grassTexture = useTexture('/textures/grass.png')
  const sandTexture = useTexture('/textures/sand.jpg')

  // Configure texture repetition
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping
  grassTexture.repeat.set(20, 20)
  sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping
  sandTexture.repeat.set(10, 10)

  // Generate terrain geometry
  const terrainGeometry = useMemo(() => {
    if (!isInitialized || terrainCells.size === 0) {
      // Return flat plane as fallback
      return new THREE.PlaneGeometry(terrainSize, terrainSize, 50, 50)
    }

    const width = terrainSize / cellSize
    const height = terrainSize / cellSize
    const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, width - 1, height - 1)
    
    const vertices = geometry.attributes.position.array as Float32Array
    const colors = new Float32Array(vertices.length)
    
    // Apply terrain height data and colors
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i]
      const z = vertices[i + 2]
      
      // Find closest terrain cell
      const cellX = Math.round(x / cellSize) * cellSize
      const cellZ = Math.round(z / cellSize) * cellSize
      const key = `${cellX},${cellZ}`
      const cell = terrainCells.get(key)
      
      if (cell) {
        vertices[i + 1] = cell.elevation * 0.5 // Scale elevation
        
        // Color based on terrain value and type
        if (cell.isWater) {
          colors[i] = 0.2     // R
          colors[i + 1] = 0.5 // G
          colors[i + 2] = 0.8 // B
        } else {
          const intensity = 0.3 + cell.terrainValue * 0.7
          colors[i] = 0.3 * intensity     // R
          colors[i + 1] = 0.6 * intensity // G
          colors[i + 2] = 0.2 * intensity // B
        }
      } else {
        colors[i] = 0.3     // Default green
        colors[i + 1] = 0.6
        colors[i + 2] = 0.2
      }
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.rotateX(-Math.PI / 2) // Rotate to be horizontal
    geometry.computeVertexNormals()
    
    return geometry
  }, [isInitialized, terrainCells, terrainSize, cellSize])

  // Water bodies geometry
  const waterGeometries = useMemo(() => {
    return waterBodies.map((waterBody, index) => {
      if (waterBody.length < 3) return null
      
      // Create a shape from water body points
      const shape = new THREE.Shape()
      shape.moveTo(waterBody[0].x, waterBody[0].z)
      
      for (let i = 1; i < waterBody.length; i++) {
        shape.lineTo(waterBody[i].x, waterBody[i].z)
      }
      shape.lineTo(waterBody[0].x, waterBody[0].z) // Close the shape
      
      const geometry = new THREE.ShapeGeometry(shape)
      geometry.rotateX(-Math.PI / 2)
      geometry.translate(0, 0.05, 0) // Slightly above terrain
      
      return geometry
    }).filter(Boolean)
  }, [waterBodies])

  // Terrain value visualization (for debug)
  const terrainValueGeometry = useMemo(() => {
    if (!showDebug || !isInitialized) return null
    
    const points: THREE.Vector3[] = []
    const colors: number[] = []
    
    terrainCells.forEach(cell => {
      points.push(new THREE.Vector3(cell.x, cell.elevation * 0.5 + 0.5, cell.z))
      
      // Color based on terrain value
      const value = cell.terrainValue
      colors.push(1 - value, value, 0) // Red to green gradient
    })
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    
    return geometry
  }, [showDebug, isInitialized, terrainCells])

  useEffect(() => {
    console.log(`🌍 Terrain system: ${isInitialized ? 'Active' : 'Waiting'}, Cells: ${terrainCells.size}, Water bodies: ${waterBodies.length}`)
  }, [isInitialized, terrainCells.size, waterBodies.length])

  useFrame((state) => {
    // Animate water if present
    if (waterRef.current) {
      waterRef.current.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh) {
          child.position.y = 0.05 + Math.sin(state.clock.elapsedTime + index) * 0.02
        }
      })
    }
  })

  if (!isInitialized) {
    return (
      // Simple flat plane while loading
      <mesh position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshLambertMaterial color="#2d5016" />
      </mesh>
    )
  }

  return (
    <group>
      {/* Main terrain */}
      <mesh 
        ref={meshRef}
        geometry={terrainGeometry}
        receiveShadow
        position={[0, 0, 0]}
      >
        <meshLambertMaterial 
          map={grassTexture}
          vertexColors={true}
          transparent={false}
        />
      </mesh>

      {/* Water bodies */}
      <group ref={waterRef}>
        {waterGeometries.map((geometry, index) => 
          geometry && (
            <mesh key={index} geometry={geometry}>
              <meshLambertMaterial 
                color="#4a9eff"
                transparent={true}
                opacity={0.7}
                side={THREE.DoubleSide}
              />
            </mesh>
          )
        )}
      </group>

      {/* Terrain value debug visualization */}
      {terrainValueGeometry && (
        <points geometry={terrainValueGeometry}>
          <pointsMaterial 
            size={0.3}
            vertexColors={true}
            sizeAttenuation={true}
          />
        </points>
      )}

      {/* Debug terrain grid */}
      {showDebug && (
        <lineSegments>
          <edgesGeometry args={[terrainGeometry]} />
          <lineBasicMaterial color="#666666" opacity={0.3} transparent />
        </lineSegments>
      )}
    </group>
  )
}
