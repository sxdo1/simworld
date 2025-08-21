import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Building } from '../../types/buildings'
import { useGameStore } from '../../stores/gameStore'
import { useEconomyStore } from '../../stores/economyStore'

interface OfficeBuildingProps {
  building: Building
  isSelected: boolean
  showDebug: boolean
}

export function OfficeBuilding({ building, isSelected, showDebug }: OfficeBuildingProps) {
  const meshRef = useRef<THREE.Group>(null)
  const { selectBuilding, gameTime } = useGameStore()
  const { businesses } = useEconomyStore()
  
  // Load textures
  const asphaltTexture = useTexture('/textures/asphalt.png')
  asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping

  // Find associated business
  const business = useMemo(() => {
    return businesses.find(b => b.buildingId === building.id)
  }, [businesses, building.id])

  // Building dimensions based on wealth level and level
  const dimensions = useMemo(() => {
    const baseSize = {
      low: { width: 6, height: 8, depth: 6 },
      medium: { width: 8, height: 12, depth: 8 },
      high: { width: 12, height: 20, depth: 10 }
    }
    
    const base = baseSize[building.wealthLevel]
    const levelMultiplier = 1 + (building.level - 1) * 0.5
    
    return {
      width: base.width * levelMultiplier,
      height: base.height * levelMultiplier,
      depth: base.depth * levelMultiplier
    }
  }, [building.wealthLevel, building.level])

  // Office building style based on wealth level
  const buildingStyle = useMemo(() => {
    const styles = {
      low: { 
        color: '#708090', 
        windowColor: '#87CEEB',
        hasHelipad: false,
        floors: Math.floor(dimensions.height / 3),
        windowsPerFloor: 3
      },
      medium: { 
        color: '#4682B4', 
        windowColor: '#B0E0E6',
        hasHelipad: false,
        floors: Math.floor(dimensions.height / 3.5),
        windowsPerFloor: 4
      },
      high: { 
        color: '#191970', 
        windowColor: '#E0F6FF',
        hasHelipad: true,
        floors: Math.floor(dimensions.height / 4),
        windowsPerFloor: 6
      }
    }
    
    return styles[building.wealthLevel]
  }, [building.wealthLevel, dimensions.height])

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation()
    selectBuilding(building.id)
  }

  // Animation for construction and office activity
  useFrame((state, delta) => {
    if (!meshRef.current) return
    
    if (building.status === 'constructing') {
      const targetScale = building.constructionProgress
      meshRef.current.scale.setScalar(targetScale)
    } else {
      meshRef.current.scale.setScalar(1)
    }
    
    // Selection highlight
    if (isSelected) {
      meshRef.current.position.y = 0.1 + Math.sin(state.clock.elapsedTime * 4) * 0.05
    } else {
      meshRef.current.position.y = 0
    }
  })

  // Business hours check
  const isBusinessOpen = useMemo(() => {
    const currentHour = Math.floor(gameTime / 60) % 24
    return currentHour >= 8 && currentHour <= 18
  }, [gameTime])

  // Window lighting based on time and occupancy
  const windowLighting = useMemo(() => {
    const currentHour = Math.floor(gameTime / 60) % 24
    const occupancyRate = business ? business.employees / business.maxEmployees : 0.7
    
    // More windows lit during business hours
    const baseLitRate = isBusinessOpen ? 0.8 : 0.2
    const occupancyAdjusted = baseLitRate * (0.5 + occupancyRate * 0.5)
    
    // Evening hours have some lights on
    if (currentHour >= 18 && currentHour <= 22) {
      return Math.min(0.4, occupancyAdjusted)
    }
    
    return occupancyAdjusted
  }, [gameTime, business, isBusinessOpen])

  return (
    <group 
      ref={meshRef}
      position={[building.position.x, 0, building.position.z]}
      rotation={[0, building.rotation, 0]}
      onClick={handleClick}
    >
      {/* Main office tower */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshLambertMaterial 
          color={buildingStyle.color}
          transparent={building.status === 'constructing'}
          opacity={building.status === 'constructing' ? 0.7 : 1}
        />
      </mesh>

      {/* Windows grid */}
      {building.status === 'operational' && (
        <group>
          {Array.from({ length: buildingStyle.floors }, (_, floor) => {
            const floorY = -dimensions.height/2 + (floor + 0.5) * (dimensions.height / buildingStyle.floors)
            
            return Array.from({ length: buildingStyle.windowsPerFloor }, (_, col) => {
              const windowX = -dimensions.width/2 + (col + 0.5) * (dimensions.width / buildingStyle.windowsPerFloor)
              const isLit = Math.random() < windowLighting
              
              return [
                // Front windows
                <mesh
                  key={`window-front-${floor}-${col}`}
                  position={[windowX, floorY, dimensions.depth/2 + 0.01]}
                  castShadow
                >
                  <boxGeometry args={[0.8, 1.2, 0.05]} />
                  <meshLambertMaterial 
                    color={buildingStyle.windowColor}
                    transparent
                    opacity={0.8}
                    emissive={isLit ? new THREE.Color(0xffffaa) : new THREE.Color(0x000000)}
                    emissiveIntensity={isLit ? 0.3 : 0}
                  />
                </mesh>,
                // Back windows
                <mesh
                  key={`window-back-${floor}-${col}`}
                  position={[windowX, floorY, -dimensions.depth/2 - 0.01]}
                  castShadow
                >
                  <boxGeometry args={[0.8, 1.2, 0.05]} />
                  <meshLambertMaterial 
                    color={buildingStyle.windowColor}
                    transparent
                    opacity={0.8}
                    emissive={isLit ? new THREE.Color(0xffffaa) : new THREE.Color(0x000000)}
                    emissiveIntensity={isLit ? 0.3 : 0}
                  />
                </mesh>
              ]
            }).flat()
          })}
        </group>
      )}

      {/* Side windows */}
      {building.status === 'operational' && (
        <group>
          {Array.from({ length: buildingStyle.floors }, (_, floor) => {
            const floorY = -dimensions.height/2 + (floor + 0.5) * (dimensions.height / buildingStyle.floors)
            const sideWindowsPerFloor = Math.max(2, Math.floor(dimensions.depth / 3))
            
            return Array.from({ length: sideWindowsPerFloor }, (_, col) => {
              const windowZ = -dimensions.depth/2 + (col + 0.5) * (dimensions.depth / sideWindowsPerFloor)
              const isLit = Math.random() < windowLighting
              
              return [
                // Left side windows
                <mesh
                  key={`window-left-${floor}-${col}`}
                  position={[-dimensions.width/2 - 0.01, floorY, windowZ]}
                  rotation={[0, Math.PI/2, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.8, 1.2, 0.05]} />
                  <meshLambertMaterial 
                    color={buildingStyle.windowColor}
                    transparent
                    opacity={0.8}
                    emissive={isLit ? new THREE.Color(0xffffaa) : new THREE.Color(0x000000)}
                    emissiveIntensity={isLit ? 0.3 : 0}
                  />
                </mesh>,
                // Right side windows
                <mesh
                  key={`window-right-${floor}-${col}`}
                  position={[dimensions.width/2 + 0.01, floorY, windowZ]}
                  rotation={[0, Math.PI/2, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.8, 1.2, 0.05]} />
                  <meshLambertMaterial 
                    color={buildingStyle.windowColor}
                    transparent
                    opacity={0.8}
                    emissive={isLit ? new THREE.Color(0xffffaa) : new THREE.Color(0x000000)}
                    emissiveIntensity={isLit ? 0.3 : 0}
                  />
                </mesh>
              ]
            }).flat()
          })}
        </group>
      )}

      {/* Entrance lobby */}
      {building.status === 'operational' && (
        <mesh 
          position={[0, -dimensions.height/2 + 1.5, dimensions.depth/2 + 0.1]}
          castShadow
        >
          <boxGeometry args={[dimensions.width * 0.6, 3, 0.2]} />
          <meshLambertMaterial 
            color={buildingStyle.windowColor}
            transparent
            opacity={0.9}
            emissive={isBusinessOpen ? new THREE.Color(0xffffaa) : new THREE.Color(0x000000)}
            emissiveIntensity={isBusinessOpen ? 0.2 : 0}
          />
        </mesh>
      )}

      {/* Company logo/sign */}
      {building.status === 'operational' && business && (
        <mesh 
          position={[0, dimensions.height/2 - 1, dimensions.depth/2 + 0.05]}
          castShadow
        >
          <boxGeometry args={[dimensions.width * 0.4, 1.5, 0.1]} />
          <meshLambertMaterial 
            color="#000080"
            emissive={new THREE.Color(0x0000ff)}
            emissiveIntensity={0.3}
          />
        </mesh>
      )}

      {/* Rooftop elements */}
      {building.status === 'operational' && (
        <group position={[0, dimensions.height/2, 0]}>
          {/* HVAC units */}
          <mesh position={[dimensions.width/4, 0.5, 0]} castShadow>
            <boxGeometry args={[2, 1, 2]} />
            <meshLambertMaterial color="#A0A0A0" />
          </mesh>
          <mesh position={[-dimensions.width/4, 0.5, dimensions.depth/4]} castShadow>
            <boxGeometry args={[1.5, 0.8, 1.5]} />
            <meshLambertMaterial color="#808080" />
          </mesh>

          {/* Satellite dishes */}
          {building.wealthLevel !== 'low' && (
            <group position={[0, 1, -dimensions.depth/3]}>
              <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.1, 1, 8]} />
                <meshLambertMaterial color="#C0C0C0" />
              </mesh>
              <mesh position={[0, 1, 0]} castShadow>
                <cylinderGeometry args={[0.8, 0.8, 0.1, 16]} />
                <meshLambertMaterial color="#FFFFFF" />
              </mesh>
            </group>
          )}

          {/* Communication towers */}
          {building.wealthLevel === 'high' && (
            <group position={[dimensions.width/3, 2, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.2, 4, 0.2]} />
                <meshLambertMaterial color="#FF0000" />
              </mesh>
              {/* Blinking light */}
              <mesh position={[0, 2.2, 0]}>
                <sphereGeometry args={[0.1, 8, 6]} />
                <meshBasicMaterial 
                  color={Math.sin(gameTime * 3) > 0 ? '#ff0000' : '#440000'}
                />
              </mesh>
            </group>
          )}

          {/* Helipad for high-end buildings */}
          {buildingStyle.hasHelipad && (
            <group position={[0, 0.1, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[3, 3, 0.1, 16]} />
                <meshLambertMaterial color="#FFD700" />
              </mesh>
              <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[2.5, 2.5, 0.02, 16]} />
                <meshBasicMaterial color="#000000" />
              </mesh>
              <mesh position={[0, 0.06, 0]}>
                <ringGeometry args={[1.5, 1.8, 16]} />
                <meshBasicMaterial color="#FFFFFF" side={THREE.DoubleSide} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* Parking garage for medium/high buildings */}
      {building.wealthLevel !== 'low' && building.status === 'operational' && (
        <mesh position={[0, -1, -dimensions.depth - 2]} castShadow receiveShadow>
          <boxGeometry args={[dimensions.width, 2, 6]} />
          <meshLambertMaterial color="#696969" />
        </mesh>
      )}

      {/* Corporate vehicles */}
      {business && business.employees > 20 && isBusinessOpen && Math.sin(gameTime * 0.3) > 0.3 && (
        <group position={[-dimensions.width/2 - 3, 0.5, dimensions.depth/2 + 2]}>
          {/* Executive car */}
          <mesh>
            <boxGeometry args={[2, 0.8, 4.5]} />
            <meshLambertMaterial color="#000000" />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1.8, 0.6, 4]} />
            <meshLambertMaterial color="#1a1a1a" transparent opacity={0.8} />
          </mesh>
          {/* Car wheels */}
          {[-0.8, 0.8].map(x => 
            [-1.8, 1.8].map(z => (
              <mesh key={`exec-${x}-${z}`} position={[x, -0.5, z]}>
                <cylinderGeometry args={[0.3, 0.3, 0.2, 8]} />
                <meshLambertMaterial color="#000000" />
              </mesh>
            ))
          )}
        </group>
      )}

      {/* Employee activity indicators */}
      {business && building.status === 'operational' && showDebug && (
        <group position={[0, dimensions.height + 1, 0]}>
          {/* Employee count indicator */}
          <mesh>
            <cylinderGeometry args={[0.5, 0.5, business.employees / business.maxEmployees * 3, 8]} />
            <meshBasicMaterial color="#4169E1" />
          </mesh>
          
          {/* Productivity indicator */}
          <mesh position={[1, 0, 0]}>
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshBasicMaterial 
              color={
                business.efficiency > 0.8 ? '#00ff00' :
                business.efficiency > 0.6 ? '#ffff00' :
                '#ff0000'
              }
            />
          </mesh>
        </group>
      )}

      {/* Building security/reception area */}
      {building.wealthLevel !== 'low' && building.status === 'operational' && (
        <mesh 
          position={[0, -dimensions.height/2 + 0.3, dimensions.depth/2 + 1]}
          castShadow
        >
          <boxGeometry args={[4, 0.6, 2]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
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

      {/* Construction effects */}
      {building.status === 'constructing' && (
        <group>
          {/* Construction elevator */}
          <mesh 
            position={[dimensions.width/2 + 1, dimensions.height * building.constructionProgress / 2, 0]}
            castShadow
          >
            <boxGeometry args={[0.5, dimensions.height * building.constructionProgress, 0.5]} />
            <meshLambertMaterial color="#FFD700" />
          </mesh>
          
          {/* Construction crane */}
          <mesh 
            position={[dimensions.width/2 + 3, dimensions.height * 0.8, 0]}
            castShadow
          >
            <boxGeometry args={[0.3, dimensions.height * 1.6, 0.3]} />
            <meshLambertMaterial color="#FFD700" />
          </mesh>
        </group>
      )}
    </group>
  )
}
