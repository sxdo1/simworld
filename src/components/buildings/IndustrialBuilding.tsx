import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Building } from '../../types/buildings'
import { useGameStore } from '../../stores/gameStore'
import { useEconomyStore } from '../../stores/economyStore'

interface IndustrialBuildingProps {
  building: Building
  isSelected: boolean
  showDebug: boolean
}

export function IndustrialBuilding({ building, isSelected, showDebug }: IndustrialBuildingProps) {
  const meshRef = useRef<THREE.Group>(null)
  const smokeRef = useRef<THREE.Group>(null)
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
      low: { width: 8, height: 4, depth: 12 },
      medium: { width: 12, height: 6, depth: 16 },
      high: { width: 16, height: 10, depth: 20 }
    }
    
    const base = baseSize[building.wealthLevel]
    const levelMultiplier = 1 + (building.level - 1) * 0.3
    
    return {
      width: base.width * levelMultiplier,
      height: base.height * levelMultiplier,
      depth: base.depth * levelMultiplier
    }
  }, [building.wealthLevel, building.level])

  // Industrial facility configuration
  const facilityConfig = useMemo(() => {
    if (!business) {
      return {
        type: 'manufacturing',
        smokeStacks: 2,
        buildingColor: '#696969',
        roofColor: '#2F2F2F',
        hasWarehouse: true
      }
    }

    const configs = {
      manufacturing: { smokeStacks: 3, buildingColor: '#696969', roofColor: '#2F2F2F', hasWarehouse: true },
      warehouse: { smokeStacks: 0, buildingColor: '#8FBC8F', roofColor: '#556B2F', hasWarehouse: true },
      processing_plant: { smokeStacks: 4, buildingColor: '#CD853F', roofColor: '#A0522D', hasWarehouse: false },
      logistics: { smokeStacks: 1, buildingColor: '#4682B4', roofColor: '#191970', hasWarehouse: true }
    }
    
    return configs[business.type as keyof typeof configs] || configs.manufacturing
  }, [business])

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation()
    selectBuilding(building.id)
  }

  // Animation for construction and industrial activity
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

    // Animate smoke
    if (smokeRef.current && building.status === 'operational') {
      smokeRef.current.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh) {
          child.position.y += Math.sin(state.clock.elapsedTime * 2 + index) * 0.01
          child.scale.setScalar(1 + Math.sin(state.clock.elapsedTime + index) * 0.1)
        }
      })
    }
  })

  // Production activity indicator
  const isProducing = useMemo(() => {
    if (!business) return false
    const currentHour = Math.floor(gameTime / 60) % 24
    return business.isOperational && currentHour >= 6 && currentHour <= 22
  }, [business, gameTime])

  return (
    <group 
      ref={meshRef}
      position={[building.position.x, 0, building.position.z]}
      rotation={[0, building.rotation, 0]}
      onClick={handleClick}
    >
      {/* Main industrial building */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshLambertMaterial 
          color={facilityConfig.buildingColor}
          transparent={building.status === 'constructing'}
          opacity={building.status === 'constructing' ? 0.7 : 1}
        />
      </mesh>

      {/* Industrial roof */}
      {building.status === 'operational' && (
        <mesh 
          position={[0, dimensions.height/2 + 0.1, 0]}
          castShadow
        >
          <boxGeometry args={[dimensions.width + 0.5, 0.3, dimensions.depth + 0.5]} />
          <meshLambertMaterial color={facilityConfig.roofColor} />
        </mesh>
      )}

      {/* Warehouse section */}
      {facilityConfig.hasWarehouse && building.status === 'operational' && (
        <mesh 
          position={[dimensions.width/2 + 3, dimensions.height * 0.6, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[6, dimensions.height * 1.2, dimensions.depth * 0.8]} />
          <meshLambertMaterial color="#A0A0A0" />
        </mesh>
      )}

      {/* Loading docks */}
      {building.status === 'operational' && (
        <group>
          {Array.from({ length: Math.min(4, Math.floor(dimensions.width / 4)) }, (_, i) => (
            <mesh
              key={`dock-${i}`}
              position={[
                -dimensions.width/2 + (i + 0.5) * (dimensions.width / Math.min(4, Math.floor(dimensions.width / 4))),
                0.8,
                dimensions.depth/2 + 1.5
              ]}
              castShadow
            >
              <boxGeometry args={[3, 1.6, 3]} />
              <meshLambertMaterial color="#808080" />
            </mesh>
          ))}
        </group>
      )}

      {/* Smokestacks */}
      {building.status === 'operational' && (
        <group>
          {Array.from({ length: facilityConfig.smokeStacks }, (_, i) => {
            const x = -dimensions.width/3 + (i * dimensions.width / Math.max(1, facilityConfig.smokeStacks - 1)) * 0.8
            const z = -dimensions.depth/4 + (i % 2) * (dimensions.depth/2)
            
            return (
              <group key={`smokestack-${i}`} position={[x, 0, z]}>
                {/* Stack structure */}
                <mesh 
                  position={[0, dimensions.height/2 + 3, 0]}
                  castShadow
                >
                  <cylinderGeometry args={[0.4, 0.5, 6, 8]} />
                  <meshLambertMaterial color="#2F2F2F" />
                </mesh>
                
                {/* Smoke particles */}
                {isProducing && (
                  <group ref={smokeRef} position={[0, dimensions.height/2 + 6.5, 0]}>
                    {Array.from({ length: 8 }, (_, j) => (
                      <mesh
                        key={j}
                        position={[
                          Math.sin(gameTime + j) * 0.5,
                          j * 0.8 + Math.sin(gameTime * 2 + j) * 0.3,
                          Math.cos(gameTime + j) * 0.5
                        ]}
                      >
                        <sphereGeometry args={[0.3 + j * 0.1, 8, 6]} />
                        <meshBasicMaterial 
                          color="#D3D3D3"
                          transparent
                          opacity={Math.max(0.1, 0.8 - j * 0.1)}
                        />
                      </mesh>
                    ))}
                  </group>
                )}
              </group>
            )
          })}
        </group>
      )}

      {/* Industrial equipment and machinery */}
      {building.status === 'operational' && (
        <group>
          {/* Conveyor systems */}
          <mesh 
            position={[0, 0.3, dimensions.depth/2 + 0.5]}
            castShadow
          >
            <boxGeometry args={[dimensions.width * 0.8, 0.3, 1]} />
            <meshLambertMaterial color="#4A4A4A" />
          </mesh>

          {/* Industrial tanks */}
          {building.wealthLevel !== 'low' && (
            <group position={[-dimensions.width/2 - 2, 0, -dimensions.depth/3]}>
              <mesh position={[0, 2.5, 0]} castShadow>
                <cylinderGeometry args={[1.5, 1.5, 5, 12]} />
                <meshLambertMaterial color="#C0C0C0" />
              </mesh>
              <mesh position={[3, 2, 2]} castShadow>
                <cylinderGeometry args={[1.2, 1.2, 4, 12]} />
                <meshLambertMaterial color="#B8860B" />
              </mesh>
            </group>
          )}

          {/* Power transformers */}
          <mesh 
            position={[dimensions.width/2 + 1, 1, -dimensions.depth/2 - 1]}
            castShadow
          >
            <boxGeometry args={[2, 2, 1]} />
            <meshLambertMaterial color="#228B22" />
          </mesh>
        </group>
      )}

      {/* Parking and truck areas */}
      {building.status === 'operational' && (
        <mesh position={[0, -0.05, -dimensions.depth - 4]}>
          <boxGeometry args={[dimensions.width + 4, 0.1, 8]} />
          <meshLambertMaterial 
            color="#2F2F2F"
            map={asphaltTexture}
          />
        </mesh>
      )}

      {/* Industrial vehicles */}
      {business && business.isOperational && Math.sin(gameTime * 0.5) > 0 && (
        <group position={[-dimensions.width/2 - 4, 1, dimensions.depth/2 + 2]}>
          {/* Industrial truck */}
          <mesh>
            <boxGeometry args={[2.5, 2, 6]} />
            <meshLambertMaterial color="#FF4500" />
          </mesh>
          <mesh position={[0, 1.5, -2]}>
            <boxGeometry args={[2.3, 2, 2]} />
            <meshLambertMaterial color="#4169E1" />
          </mesh>
          {/* Truck wheels */}
          {[-1, 1].map(x => 
            [-2, 0, 2].map(z => (
              <mesh key={`${x}-${z}`} position={[x, -1.2, z]}>
                <cylinderGeometry args={[0.4, 0.4, 0.3, 8]} />
                <meshLambertMaterial color="#000000" />
              </mesh>
            ))
          )}
        </group>
      )}

      {/* Forklift for warehouses */}
      {business?.type === 'warehouse' && building.status === 'operational' && Math.cos(gameTime * 0.7) > 0.5 && (
        <group position={[dimensions.width/3, 0.5, 0]}>
          <mesh>
            <boxGeometry args={[1, 0.5, 2]} />
            <meshLambertMaterial color="#FFD700" />
          </mesh>
          <mesh position={[0, 1, 0.8]}>
            <boxGeometry args={[0.1, 2, 0.1]} />
            <meshLambertMaterial color="#C0C0C0" />
          </mesh>
          {/* Forklift wheels */}
          {[-0.4, 0.4].map(x => 
            [-0.8, 0.8].map(z => (
              <mesh key={`fork-${x}-${z}`} position={[x, -0.35, z]}>
                <cylinderGeometry args={[0.15, 0.15, 0.1, 8]} />
                <meshLambertMaterial color="#000000" />
              </mesh>
            ))
          )}
        </group>
      )}

      {/* Production efficiency indicator */}
      {business && showDebug && (
        <group position={[0, dimensions.height + 2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, business.efficiency * 2, 8]} />
            <meshBasicMaterial 
              color={
                business.efficiency > 0.8 ? '#00ff00' :
                business.efficiency > 0.6 ? '#ffff00' :
                business.efficiency > 0.4 ? '#ff8800' :
                '#ff0000'
              }
            />
          </mesh>
        </group>
      )}

      {/* Pollution indicator */}
      {building.pollution > 0.1 && (
        <group position={[0, dimensions.height + 3, 0]}>
          {Array.from({ length: Math.floor(building.pollution * 5) }, (_, i) => (
            <mesh
              key={i}
              position={[
                Math.sin(gameTime + i) * 2,
                i * 0.5,
                Math.cos(gameTime + i) * 2
              ]}
            >
              <sphereGeometry args={[0.2, 6, 4]} />
              <meshBasicMaterial 
                color="#8B4513"
                transparent
                opacity={0.6}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Security fence */}
      {building.wealthLevel !== 'low' && building.status === 'operational' && (
        <group>
          {/* Fence posts */}
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i / 8) * Math.PI * 2
            const radius = Math.max(dimensions.width, dimensions.depth) * 0.7
            
            return (
              <mesh
                key={`fence-post-${i}`}
                position={[
                  Math.cos(angle) * radius,
                  1,
                  Math.sin(angle) * radius
                ]}
              >
                <boxGeometry args={[0.1, 2, 0.1]} />
                <meshLambertMaterial color="#696969" />
              </mesh>
            )
          })}
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

      {/* Construction effects */}
      {building.status === 'constructing' && (
        <group>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * dimensions.width * 1.5,
                Math.random() * dimensions.height,
                (Math.random() - 0.5) * dimensions.depth * 1.5
              ]}
            >
              <sphereGeometry args={[0.1, 4, 3]} />
              <meshBasicMaterial 
                color="#D2691E"
                transparent
                opacity={0.6}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}
