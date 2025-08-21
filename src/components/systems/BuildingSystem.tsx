import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'
import { ResidentialBuilding } from '../buildings/ResidentialBuilding'
import { CommercialBuilding } from '../buildings/CommercialBuilding'
import { IndustrialBuilding } from '../buildings/IndustrialBuilding'
import { OfficeBuilding } from '../buildings/OfficeBuilding'
import { ServiceBuilding } from '../buildings/ServiceBuilding'
import { EducationBuilding } from '../buildings/EducationBuilding'

export function BuildingSystem() {
  const groupRef = useRef<THREE.Group>(null)
  
  const { buildings, selectedBuilding, showDebug } = useGameStore()

  // Group buildings by type for efficient rendering
  const buildingsByType = useMemo(() => {
    const groups: Record<string, typeof buildings> = {}
    
    buildings.forEach(building => {
      const type = building.zoneType || building.type
      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push(building)
    })
    
    return groups
  }, [buildings])

  // Construction progress animation
  useFrame((state, delta) => {
    if (!groupRef.current) return
    
    // Animate construction sites
    buildings.forEach((building, index) => {
      if (building.status === 'constructing') {
        const buildingMesh = groupRef.current?.children[index] as THREE.Group
        if (buildingMesh) {
          // Scale building based on construction progress
          const scale = building.constructionProgress
          buildingMesh.scale.setScalar(scale)
          
          // Add some construction "dust" animation
          buildingMesh.rotation.y += Math.sin(state.clock.elapsedTime * 2) * 0.001
        }
      }
    })
  })

  console.log(`🏗️ Building system: ${buildings.length} buildings, ${Object.keys(buildingsByType).length} types`)

  return (
    <group ref={groupRef}>
      {/* Render buildings by type */}
      {buildings.map((building, index) => {
        const isSelected = selectedBuilding === building.id
        const commonProps = {
          key: building.id,
          building,
          isSelected,
          showDebug
        }

        // Route to appropriate building component based on type
        if (building.zoneType === 'residential') {
          return <ResidentialBuilding {...commonProps} />
        } else if (building.zoneType === 'commercial') {
          return <CommercialBuilding {...commonProps} />
        } else if (building.zoneType === 'industrial') {
          return <IndustrialBuilding {...commonProps} />
        } else if (building.zoneType === 'office') {
          return <OfficeBuilding {...commonProps} />
        } else if (building.type.startsWith('service_')) {
          return <ServiceBuilding {...commonProps} />
        } else if (building.type.startsWith('education_') || building.type === 'service_school' || building.type === 'service_university') {
          return <EducationBuilding {...commonProps} />
        } else {
          // Default/fallback building representation
          return (
            <mesh
              key={building.id}
              position={[building.position.x, 1, building.position.z]}
              onClick={() => console.log('Building clicked:', building.id)}
            >
              <boxGeometry args={[2, 2, 2]} />
              <meshLambertMaterial 
                color={isSelected ? '#00ff00' : '#cccccc'}
                wireframe={building.status === 'constructing'}
              />
            </mesh>
          )
        }
      })}

      {/* Building placement preview (when tool is selected) */}
      {/* This would show a ghost building at mouse position */}
      
      {/* Construction site effects */}
      {buildings.filter(b => b.status === 'constructing').map(building => (
        <group key={`construction-${building.id}`} position={[building.position.x, 0, building.position.z]}>
          {/* Construction crane (simplified) */}
          {building.constructionProgress < 0.8 && (
            <group>
              <mesh position={[2, 8, 2]}>
                <boxGeometry args={[0.2, 16, 0.2]} />
                <meshLambertMaterial color="#ffaa00" />
              </mesh>
              <mesh position={[0, 8, 2]} rotation={[0, 0, -Math.PI / 12]}>
                <boxGeometry args={[4, 0.3, 0.3]} />
                <meshLambertMaterial color="#ffaa00" />
              </mesh>
            </group>
          )}
          
          {/* Construction materials */}
          {building.constructionProgress < 0.5 && (
            <group>
              <mesh position={[-2, 0.5, -2]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshLambertMaterial color="#8B4513" />
              </mesh>
              <mesh position={[2.5, 0.3, -1]}>
                <cylinderGeometry args={[0.5, 0.5, 0.6, 8]} />
                <meshLambertMaterial color="#666666" />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* Debug information */}
      {showDebug && buildings.map(building => (
        <group key={`debug-${building.id}`} position={[building.position.x, 5, building.position.z]}>
          {/* Building ID text (would use Text component in real implementation) */}
          <mesh>
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshBasicMaterial color="#ff00ff" />
          </mesh>
          
          {/* Status indicators */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshBasicMaterial 
              color={
                building.status === 'operational' ? '#00ff00' :
                building.status === 'constructing' ? '#ffff00' :
                building.status === 'abandoned' ? '#ff0000' : '#888888'
              }
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
