import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Building } from '../../types/buildings'
import { useGameStore } from '../../stores/gameStore'

interface ResidentialBuildingProps {
  building: Building
  isSelected: boolean
  showDebug: boolean
}

export function ResidentialBuilding({ building, isSelected, showDebug }: ResidentialBuildingProps) {
  const meshRef = useRef<THREE.Group>(null)
  const { selectBuilding } = useGameStore()
  
  // Load textures
  const woodTexture = useTexture('/textures/wood.jpg')
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping

  // Building dimensions based on wealth level and level
  const dimensions = useMemo(() => {
    const baseSize = {
      low: { width: 3, height: 4, depth: 3 },
      medium: { width: 4, height: 6, depth: 4 },
      high: { width: 6, height: 8, depth: 6 }
    }
    
    const base = baseSize[building.wealthLevel]
    const levelMultiplier = 1 + (building.level - 1) * 0.3
    
    return {
      width: base.width * levelMultiplier,
      height: base.height * levelMultiplier,
      depth: base.depth * levelMultiplier
    }
  }, [building.wealthLevel, building.level])

  // Building color based on wealth level
  const buildingColor = useMemo(() => {
    const colors = {
      low: '#8B4513',     // Brown
      medium: '#CD853F',  // Peru
      high: '#F4A460'     // Sandy Brown
    }
    return colors[building.wealthLevel]
  }, [building.wealthLevel])

  // Window configuration
  const windowConfig = useMemo(() => {
    const floors = Math.max(1, Math.floor(dimensions.height / 3))
    const windowsPerFloor = Math.max(2, Math.floor(dimensions.width))
    
    return {
      floors,
      windowsPerFloor,
      windowSize: 0.3,
      windowSpacing: dimensions.width / windowsPerFloor
    }
  }, [dimensions])

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation()
    selectBuilding(building.id)
  }

  // Animation for construction
  useFrame((state, delta) => {
    if (!meshRef.current) return
    
    if (building.status === 'constructing') {
      // Construction progress animation
      const targetScale = building.constructionProgress
      meshRef.current.scale.setScalar(targetScale)
      
      // Add slight construction wobble
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 3) * 0.01
    } else {
      meshRef.current.scale.setScalar(1)
      meshRef.current.rotation.y = 0
    }
    
    // Selection highlight
    if (isSelected) {
      meshRef.current.position.y = 0.1 + Math.sin(state.clock.elapsedTime * 4) * 0.05
    } else {
      meshRef.current.position.y = 0
    }
  })

  return (
    <group 
      ref={meshRef}
      position={[building.position.x, 0, building.position.z]}
      rotation={[0, building.rotation, 0]}
      onClick={handleClick}
    >
      {/* Main building structure */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshLambertMaterial 
          color={buildingColor}
          map={woodTexture}
          transparent={building.status === 'constructing'}
          opacity={building.status === 'constructing' ? 0.7 : 1}
        />
      </mesh>

      {/* Windows */}
      {Array.from({ length: windowConfig.floors }, (_, floor) => 
        Array.from({ length: windowConfig.windowsPerFloor }, (_, windowIndex) => {
          const x = -dimensions.width/2 + (windowIndex + 0.5) * windowConfig.windowSpacing
          const y = -dimensions.height/2 + (floor + 0.5) * (dimensions.height / windowConfig.floors)
          const z = dimensions.depth/2 + 0.01
          
          // Skip windows during early construction
          if (building.status === 'constructing' && building.constructionProgress < (floor + 1) / windowConfig.floors) {
            return null
          }
          
          return (
            <mesh
              key={`window-front-${floor}-${windowIndex}`}
              position={[x, y, z]}
              castShadow
            >
              <boxGeometry args={[windowConfig.windowSize, windowConfig.windowSize, 0.05]} />
              <meshLambertMaterial 
                color="#87CEEB"
                transparent
                opacity={0.8}
              />
            </mesh>
          )
        })
      )}

      {/* Back windows */}
      {Array.from({ length: windowConfig.floors }, (_, floor) => 
        Array.from({ length: windowConfig.windowsPerFloor }, (_, windowIndex) => {
          const x = -dimensions.width/2 + (windowIndex + 0.5) * windowConfig.windowSpacing
          const y = -dimensions.height/2 + (floor + 0.5) * (dimensions.height / windowConfig.floors)
          const z = -dimensions.depth/2 - 0.01
          
          if (building.status === 'constructing' && building.constructionProgress < (floor + 1) / windowConfig.floors) {
            return null
          }
          
          return (
            <mesh
              key={`window-back-${floor}-${windowIndex}`}
              position={[x, y, z]}
              castShadow
            >
              <boxGeometry args={[windowConfig.windowSize, windowConfig.windowSize, 0.05]} />
              <meshLambertMaterial 
                color="#87CEEB"
                transparent
                opacity={0.8}
              />
            </mesh>
          )
        })
      )}

      {/* Roof */}
      {building.status === 'operational' && (
        <mesh 
          position={[0, dimensions.height/2 + 0.3, 0]}
          castShadow
        >
          <coneGeometry args={[dimensions.width * 0.7, 1, 4]} />
          <meshLambertMaterial 
            color={building.wealthLevel === 'high' ? '#8B0000' : '#654321'}
          />
        </mesh>
      )}

      {/* Door */}
      {building.status === 'operational' && (
        <mesh 
          position={[0, -dimensions.height/2 + 0.8, dimensions.depth/2 + 0.02]}
          castShadow
        >
          <boxGeometry args={[0.8, 1.6, 0.1]} />
          <meshLambertMaterial color="#654321" />
        </mesh>
      )}

      {/* Balconies for higher wealth levels */}
      {building.wealthLevel !== 'low' && building.status === 'operational' && (
        <group>
          {Array.from({ length: Math.max(1, windowConfig.floors - 1) }, (_, floor) => (
            <mesh
              key={`balcony-${floor}`}
              position={[0, -dimensions.height/2 + (floor + 1.5) * (dimensions.height / windowConfig.floors), dimensions.depth/2 + 0.5]}
              castShadow
            >
              <boxGeometry args={[dimensions.width * 0.8, 0.1, 1]} />
              <meshLambertMaterial color={buildingColor} />
            </mesh>
          ))}
        </group>
      )}

      {/* Chimneys for houses */}
      {building.wealthLevel !== 'low' && building.status === 'operational' && (
        <mesh 
          position={[dimensions.width/3, dimensions.height/2 + 0.8, dimensions.depth/3]}
          castShadow
        >
          <boxGeometry args={[0.4, 1.5, 0.4]} />
          <meshLambertMaterial color="#666666" />
        </mesh>
      )}

      {/* Garden/yard indicators */}
      {building.wealthLevel === 'high' && building.status === 'operational' && (
        <group>
          {/* Garden area */}
          <mesh position={[0, -0.05, -dimensions.depth - 1]}>
            <cylinderGeometry args={[2, 2, 0.1, 8]} />
            <meshLambertMaterial color="#228B22" />
          </mesh>
          
          {/* Trees */}
          <mesh position={[-1.5, 1, -dimensions.depth - 1]}>
            <cylinderGeometry args={[0.1, 0.1, 2, 6]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh position={[-1.5, 2.5, -dimensions.depth - 1]}>
            <sphereGeometry args={[0.8, 8, 6]} />
            <meshLambertMaterial color="#228B22" />
          </mesh>
        </group>
      )}

      {/* Resident indicators */}
      {showDebug && building.status === 'operational' && building.residents && (
        <group position={[0, dimensions.height + 1, 0]}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 8]} />
            <meshBasicMaterial color="#ffff00" />
          </mesh>
          {/* Population count visualization */}
          {Array.from({ length: Math.min(8, building.residents) }, (_, i) => (
            <mesh
              key={i}
              position={[
                Math.cos(i / 8 * Math.PI * 2) * 0.5,
                0.2 + i * 0.1,
                Math.sin(i / 8 * Math.PI * 2) * 0.5
              ]}
            >
              <sphereGeometry args={[0.05, 8, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      )}

      {/* Construction effects */}
      {building.status === 'constructing' && (
        <group>
          {/* Construction dust/particles */}
          {Array.from({ length: 5 }, (_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * dimensions.width,
                Math.random() * dimensions.height,
                (Math.random() - 0.5) * dimensions.depth
              ]}
            >
              <sphereGeometry args={[0.05, 4, 3]} />
              <meshBasicMaterial 
                color="#DEB887"
                transparent
                opacity={0.6}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[Math.max(dimensions.width, dimensions.depth) * 0.7, Math.max(dimensions.width, dimensions.depth) * 0.7, 0.1, 16]} />
          <meshBasicMaterial 
            color="#00ff00"
            transparent
            opacity={0.3}
          />
        </mesh>
      )}

      {/* Building level indicators */}
      {showDebug && building.level > 1 && (
        <group position={[dimensions.width/2 + 0.5, dimensions.height/2, 0]}>
          {Array.from({ length: building.level }, (_, i) => (
            <mesh
              key={i}
              position={[0, -i * 0.3, 0]}
            >
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshBasicMaterial color="#ffd700" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}
