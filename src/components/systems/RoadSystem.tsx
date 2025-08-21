import { useRef, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'
import { MathUtils } from '../../utils/mathUtils'

export function RoadSystem() {
  const groupRef = useRef<THREE.Group>(null)
  
  const { roads, showDebug } = useGameStore()
  
  // Load road texture
  const asphaltTexture = useTexture('/textures/asphalt.png')
  asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping

  // Generate road geometries
  const roadGeometries = useMemo(() => {
    return roads.map((roadPoints, index) => {
      if (roadPoints.length < 2) return null
      
      const roadWidth = 2.0
      const roadHeight = 0.1
      
      // For simple roads, create individual segments
      const segments: THREE.BufferGeometry[] = []
      
      for (let i = 0; i < roadPoints.length - 1; i++) {
        const start = roadPoints[i]
        const end = roadPoints[i + 1]
        
        const direction = new THREE.Vector3().subVectors(end, start)
        const length = direction.length()
        const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
        
        // Create box geometry for road segment
        const geometry = new THREE.BoxGeometry(roadWidth, roadHeight, length)
        
        // Position and rotate the segment
        geometry.translate(center.x, roadHeight / 2, center.z)
        
        // Calculate rotation to align with direction
        const angle = Math.atan2(direction.x, direction.z)
        geometry.rotateY(angle)
        
        // Set UV coordinates for texture
        const uvAttribute = geometry.attributes.uv
        const uvArray = uvAttribute.array as Float32Array
        
        // Adjust UV mapping for proper texture tiling
        for (let j = 0; j < uvArray.length; j += 2) {
          uvArray[j] *= roadWidth / 2     // U coordinate
          uvArray[j + 1] *= length / 2    // V coordinate
        }
        
        segments.push(geometry)
      }
      
      return segments
    }).filter(Boolean)
  }, [roads])

  // Intersection markers (simplified)
  const intersectionGeometries = useMemo(() => {
    const intersections: THREE.Vector3[] = []
    
    // Find potential intersections (simplified - just check road endpoints)
    roads.forEach((road1, i) => {
      roads.forEach((road2, j) => {
        if (i >= j) return
        
        // Check if roads share endpoints (simple intersection detection)
        road1.forEach(point1 => {
          road2.forEach(point2 => {
            if (MathUtils.distance2D(point1, point2) < 1.0) {
              intersections.push(point1.clone())
            }
          })
        })
      })
    })
    
    return intersections
  }, [roads])

  if (roads.length === 0) {
    return null
  }

  console.log(`🛣️ Road system: ${roads.length} roads, ${roadGeometries.flat().length} segments`)

  return (
    <group ref={groupRef}>
      {/* Road segments */}
      {roadGeometries.map((segments, roadIndex) => 
        segments && segments.map((geometry, segmentIndex) => (
          <mesh 
            key={`road-${roadIndex}-${segmentIndex}`}
            geometry={geometry}
            receiveShadow
            castShadow
          >
            <meshLambertMaterial 
              map={asphaltTexture}
              color="#404040"
            />
          </mesh>
        ))
      )}

      {/* Road intersections */}
      {intersectionGeometries.map((intersection, index) => (
        <mesh 
          key={`intersection-${index}`}
          position={[intersection.x, 0.15, intersection.z]}
        >
          <cylinderGeometry args={[2.5, 2.5, 0.1, 8]} />
          <meshLambertMaterial 
            map={asphaltTexture}
            color="#505050"
          />
        </mesh>
      ))}

      {/* Debug road points */}
      {showDebug && roads.map((roadPoints, roadIndex) => 
        roadPoints.map((point, pointIndex) => (
          <mesh 
            key={`debug-road-${roadIndex}-${pointIndex}`}
            position={[point.x, 0.5, point.z]}
          >
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshBasicMaterial 
              color={pointIndex === 0 ? '#00ff00' : pointIndex === roadPoints.length - 1 ? '#ff0000' : '#ffff00'} 
            />
          </mesh>
        ))
      )}

      {/* Debug road directions */}
      {showDebug && roads.map((roadPoints, roadIndex) => {
        const arrows: JSX.Element[] = []
        
        for (let i = 0; i < roadPoints.length - 1; i++) {
          const start = roadPoints[i]
          const end = roadPoints[i + 1]
          const direction = new THREE.Vector3().subVectors(end, start).normalize()
          const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
          
          arrows.push(
            <mesh 
              key={`arrow-${roadIndex}-${i}`}
              position={[center.x, 1, center.z]}
              rotation={[0, Math.atan2(direction.x, direction.z), 0]}
            >
              <coneGeometry args={[0.2, 0.5, 4]} />
              <meshBasicMaterial color="#00ffff" />
            </mesh>
          )
        }
        
        return arrows
      })}
    </group>
  )
}
