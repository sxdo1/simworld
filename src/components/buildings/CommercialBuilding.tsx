import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Building } from '../../types/buildings'
import { useGameStore } from '../../stores/gameStore'
import { useEconomyStore } from '../../stores/economyStore'

interface CommercialBuildingProps {
  building: Building
  isSelected: boolean
  showDebug: boolean
}

export function CommercialBuilding({ building, isSelected, showDebug }: CommercialBuildingProps) {
  const meshRef = useRef<THREE.Group>(null)
  const { selectBuilding, gameTime } = useGameStore()
  const { businesses } = useEconomyStore()
  
  // Load textures
  const woodTexture = useTexture('/textures/wood.jpg')
  const asphaltTexture = useTexture('/textures/asphalt.png')
  
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping
  asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping

  // Find associated business
  const business = useMemo(() => {
    return businesses.find(b => b.buildingId === building.id)
  }, [businesses, building.id])

  // Building dimensions based on wealth level and level
  const dimensions = useMemo(() => {
    const baseSize = {
      low: { width: 4, height: 3, depth: 6 },
      medium: { width: 6, height: 5, depth: 8 },
      high: { width: 8, height: 8, depth: 10 }
    }
    
    const base = baseSize[building.wealthLevel]
    const levelMultiplier = 1 + (building.level - 1) * 0.4
    
    return {
      width: base.width * levelMultiplier,
      height: base.height * levelMultiplier,
      depth: base.depth * levelMultiplier
    }
  }, [building.wealthLevel, building.level])

  // Building style based on business type
  const buildingStyle = useMemo(() => {
    if (!business) {
      return {
        color: '#B8860B',
        roofType: 'flat',
        signColor: '#FF4500'
      }
    }

    const styles = {
      retail_store: { color: '#4682B4', roofType: 'flat', signColor: '#FF0000' },
      restaurant: { color: '#CD853F', roofType: 'pitched', signColor: '#FFD700' },
      service_shop: { color: '#708090', roofType: 'flat', signColor: '#00CED1' },
      entertainment: { color: '#9370DB', roofType: 'flat', signColor: '#FF69B4' },
      default: { color: '#B8860B', roofType: 'flat', signColor: '#FF4500' }
    }
    
    return styles[business.type as keyof typeof styles] || styles.default
  }, [business])

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation()
    selectBuilding(building.id)
  }

  // Animation for construction and business activity
  useFrame((state, delta) => {
    if (!meshRef.current) return
    
    if (building.status === 'constructing') {
      const targetScale = building.constructionProgress
      meshRef.current.scale.setScalar(targetScale)
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.01
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

  // Business hours check
  const isBusinessOpen = useMemo(() => {
    const currentHour = Math.floor(gameTime / 60) % 24
    return currentHour >= 9 && currentHour <= 21
  }, [gameTime])

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
          color={buildingStyle.color}
          map={woodTexture}
          transparent={building.status === 'constructing'}
          opacity={building.status === 'constructing' ? 0.7 : 1}
        />
      </mesh>

      {/* Storefront windows */}
      <mesh 
        position={[0, -dimensions.height/2 + 1, dimensions.depth/2 + 0.01]}
        castShadow
      >
        <boxGeometry args={[dimensions.width * 0.8, 1.5, 0.05]} />
        <meshLambertMaterial 
          color="#87CEEB"
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Store entrance */}
      <mesh 
        position={[0, -dimensions.height/2 + 0.9, dimensions.depth/2 + 0.02]}
        castShadow
      >
        <boxGeometry args={[1.2, 1.8, 0.1]} />
        <meshLambertMaterial 
          color={isBusinessOpen ? "#228B22" : "#8B0000"}
        />
      </mesh>

      {/* Business sign */}
      {building.status === 'operational' && (
        <mesh 
          position={[0, dimensions.height/2 - 0.5, dimensions.depth/2 + 0.1]}
          castShadow
        >
          <boxGeometry args={[dimensions.width * 0.6, 0.8, 0.1]} />
          <meshLambertMaterial color={buildingStyle.signColor} />
        </mesh>
      )}

      {/* Roof based on type */}
      {building.status === 'operational' && (
        <>
          {buildingStyle.roofType === 'pitched' ? (
            <mesh 
              position={[0, dimensions.height/2 + 0.5, 0]}
              castShadow
            >
              <coneGeometry args={[dimensions.width * 0.8, 1.5, 4]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
          ) : (
            <mesh 
              position={[0, dimensions.height/2 + 0.1, 0]}
              castShadow
            >
              <boxGeometry args={[dimensions.width + 0.2, 0.2, dimensions.depth + 0.2]} />
              <meshLambertMaterial color="#696969" />
            </mesh>
          )}
        </>
      )}

      {/* Parking area for larger stores */}
      {building.wealthLevel !== 'low' && building.status === 'operational' && (
        <mesh position={[0, -0.05, -dimensions.depth - 2]}>
          <boxGeometry args={[dimensions.width + 2, 0.1, 4]} />
          <meshLambertMaterial 
            color="#2F2F2F"
            map={asphaltTexture}
          />
        </mesh>
      )}

      {/* Parking spaces */}
      {building.wealthLevel !== 'low' && building.status === 'operational' && (
        <group>
          {Array.from({ length: Math.min(6, Math.floor(dimensions.width)) }, (_, i) => (
            <mesh
              key={`parking-${i}`}
              position={[
                -dimensions.width/2 + (i + 0.5) * (dimensions.width / Math.min(6, Math.floor(dimensions.width))),
                0.01,
                -dimensions.depth - 2
              ]}
            >
              <boxGeometry args={[1.8, 0.02, 3.5]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          ))}
        </group>
      )}

      {/* Loading dock for larger commercial buildings */}
      {building.wealthLevel === 'high' && building.status === 'operational' && (
        <mesh 
          position={[-dimensions.width/2 - 0.5, 0, 0]}
          castShadow
        >
          <boxGeometry args={[1, 2, 3]} />
          <meshLambertMaterial color="#A0A0A0" />
        </mesh>
      )}

      {/* Business activity indicators */}
      {business && building.status === 'operational' && (
        <group>
          {/* Customer traffic indicator */}
          {business.footTraffic > 0.3 && isBusinessOpen && (
            <group position={[0, 1, dimensions.depth/2 + 1]}>
              {Array.from({ length: Math.min(5, Math.floor(business.footTraffic * 10)) }, (_, i) => (
                <mesh
                  key={i}
                  position={[
                    Math.sin(gameTime * 2 + i) * 1.5,
                    0.5,
                    Math.cos(gameTime * 2 + i) * 1.5
                  ]}
                >
                  <boxGeometry args={[0.3, 1, 0.3]} />
                  <meshLambertMaterial color="#FFB6C1" />
                </mesh>
              ))}
            </group>
          )}

          {/* Profit indicator */}
          {showDebug && (
            <mesh position={[0, dimensions.height + 1, 0]}>
              <sphereGeometry args={[0.2, 8, 6]} />
              <meshBasicMaterial 
                color={business.profit > 0 ? '#00ff00' : business.profit < -500 ? '#ff0000' : '#ffff00'}
              />
            </mesh>
          )}
        </group>
      )}

      {/* Store inventory/goods indicators */}
      {building.status === 'operational' && business && (
        <group position={[dimensions.width/2 + 1, 1, 0]}>
          <mesh>
            <boxGeometry args={[0.5, 1, 0.5]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshLambertMaterial color="#FFD700" />
          </mesh>
        </group>
      )}

      {/* Delivery trucks for busy businesses */}
      {business && business.footTraffic > 0.6 && isBusinessOpen && Math.sin(gameTime) > 0.5 && (
        <group position={[-dimensions.width/2 - 3, 0.5, dimensions.depth/2]}>
          {/* Delivery truck */}
          <mesh>
            <boxGeometry args={[2, 1, 4]} />
            <meshLambertMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0.8, -1]}>
            <boxGeometry args={[1.8, 1.5, 1.5]} />
            <meshLambertMaterial color="#4169E1" />
          </mesh>
          {/* Wheels */}
          {[-0.8, 0.8].map(x => 
            [-1.5, 1.5].map(z => (
              <mesh key={`${x}-${z}`} position={[x, -0.6, z]}>
                <cylinderGeometry args={[0.3, 0.3, 0.2, 8]} />
                <meshLambertMaterial color="#000000" />
              </mesh>
            ))
          )}
        </group>
      )}

      {/* Awnings for restaurants */}
      {business?.type === 'restaurant' && building.status === 'operational' && (
        <mesh 
          position={[0, dimensions.height/2 - 1, dimensions.depth/2 + 0.8]}
          rotation={[Math.PI / 6, 0, 0]}
          castShadow
        >
          <boxGeometry args={[dimensions.width * 0.9, 0.05, 1.5]} />
          <meshLambertMaterial 
            color={isBusinessOpen ? "#FF6347" : "#8B4513"}
          />
        </mesh>
      )}

      {/* Outdoor seating for restaurants */}
      {business?.type === 'restaurant' && building.wealthLevel !== 'low' && building.status === 'operational' && (
        <group position={[0, 0, dimensions.depth/2 + 2]}>
          {Array.from({ length: 4 }, (_, i) => (
            <group
              key={i}
              position={[
                (i % 2) * 2 - 1,
                0,
                Math.floor(i / 2) * 2
              ]}
            >
              {/* Table */}
              <mesh position={[0, 0.4, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 0.05, 8]} />
                <meshLambertMaterial color="#8B4513" />
              </mesh>
              {/* Chairs */}
              {[0, Math.PI/2, Math.PI, 3*Math.PI/2].map((angle, j) => (
                <mesh
                  key={j}
                  position={[Math.cos(angle) * 0.6, 0.2, Math.sin(angle) * 0.6]}
                >
                  <boxGeometry args={[0.2, 0.4, 0.2]} />
                  <meshLambertMaterial color="#654321" />
                </mesh>
              ))}
            </group>
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

      {/* Construction effects */}
      {building.status === 'constructing' && (
        <group>
          {Array.from({ length: 3 }, (_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * dimensions.width,
                Math.random() * dimensions.height,
                (Math.random() - 0.5) * dimensions.depth
              ]}
            >
              <sphereGeometry args={[0.1, 4, 3]} />
              <meshBasicMaterial 
                color="#DEB887"
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
