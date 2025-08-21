import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Building } from '../../types/buildings'
import { useGameStore } from '../../stores/gameStore'

interface ServiceBuildingProps {
  building: Building
  isSelected: boolean
  showDebug: boolean
}

export function ServiceBuilding({ building, isSelected, showDebug }: ServiceBuildingProps) {
  const meshRef = useRef<THREE.Group>(null)
  const { selectBuilding, gameTime } = useGameStore()

  // Service building configuration based on type
  const serviceConfig = useMemo(() => {
    const configs = {
      service_fire: {
        color: '#DC143C',
        roofColor: '#B22222',
        hasVehicles: true,
        vehicleColor: '#FF0000',
        specialFeatures: ['tower', 'siren'],
        serviceIcon: '🚒'
      },
      service_police: {
        color: '#4169E1',
        roofColor: '#191970',
        hasVehicles: true,
        vehicleColor: '#0000FF',
        specialFeatures: ['antenna', 'lights'],
        serviceIcon: '🚔'
      },
      service_hospital: {
        color: '#FFFFFF',
        roofColor: '#F0F8FF',
        hasVehicles: true,
        vehicleColor: '#FFFFFF',
        specialFeatures: ['cross', 'helipad'],
        serviceIcon: '🏥'
      },
      utility_power: {
        color: '#FFD700',
        roofColor: '#DAA520',
        hasVehicles: false,
        vehicleColor: '#FFFF00',
        specialFeatures: ['smokestacks', 'transformers'],
        serviceIcon: '⚡'
      },
      utility_water: {
        color: '#4682B4',
        roofColor: '#2F4F4F',
        hasVehicles: false,
        vehicleColor: '#87CEEB',
        specialFeatures: ['tanks', 'pipes'],
        serviceIcon: '💧'
      }
    }
    
    return configs[building.type as keyof typeof configs] || configs.service_fire
  }, [building.type])

  // Building dimensions based on service type
  const dimensions = useMemo(() => {
    const baseSizes = {
      service_fire: { width: 8, height: 4, depth: 12 },
      service_police: { width: 10, height: 3, depth: 8 },
      service_hospital: { width: 16, height: 8, depth: 20 },
      utility_power: { width: 20, height: 12, depth: 20 },
      utility_water: { width: 12, height: 6, depth: 12 }
    }
    
    const base = baseSizes[building.type as keyof typeof baseSizes] || baseSizes.service_fire
    const levelMultiplier = 1 + (building.level - 1) * 0.2
    
    return {
      width: base.width * levelMultiplier,
      height: base.height * levelMultiplier,
      depth: base.depth * levelMultiplier
    }
  }, [building.type, building.level])

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation()
    selectBuilding(building.id)
  }

  // Animation for construction and service activity
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

  return (
    <group 
      ref={meshRef}
      position={[building.position.x, 0, building.position.z]}
      rotation={[0, building.rotation, 0]}
      onClick={handleClick}
    >
      {/* Main service building */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshLambertMaterial 
          color={serviceConfig.color}
          transparent={building.status === 'constructing'}
          opacity={building.status === 'constructing' ? 0.7 : 1}
        />
      </mesh>

      {/* Roof */}
      {building.status === 'operational' && (
        <mesh 
          position={[0, dimensions.height/2 + 0.2, 0]}
          castShadow
        >
          <boxGeometry args={[dimensions.width + 0.5, 0.4, dimensions.depth + 0.5]} />
          <meshLambertMaterial color={serviceConfig.roofColor} />
        </mesh>
      )}

      {/* Fire station specific features */}
      {building.type === 'service_fire' && building.status === 'operational' && (
        <group>
          {/* Fire tower */}
          <mesh 
            position={[dimensions.width/3, dimensions.height/2 + 3, 0]}
            castShadow
          >
            <boxGeometry args={[1.5, 6, 1.5]} />
            <meshLambertMaterial color="#8B0000" />
          </mesh>

          {/* Garage doors */}
          <mesh 
            position={[0, -dimensions.height/2 + 1.5, dimensions.depth/2 + 0.01]}
            castShadow
          >
            <boxGeometry args={[dimensions.width * 0.8, 3, 0.1]} />
            <meshLambertMaterial color="#FF6347" />
          </mesh>

          {/* Fire truck */}
          {serviceConfig.hasVehicles && Math.sin(gameTime * 0.5) > -0.5 && (
            <group position={[0, 1, dimensions.depth/2 + 4]}>
              <mesh>
                <boxGeometry args={[2.5, 2, 8]} />
                <meshLambertMaterial color={serviceConfig.vehicleColor} />
              </mesh>
              <mesh position={[0, 1.5, -3]}>
                <boxGeometry args={[2.3, 1.5, 2]} />
                <meshLambertMaterial color="#FF6347" />
              </mesh>
              {/* Ladder */}
              <mesh position={[0, 2.5, 0]}>
                <boxGeometry args={[0.2, 0.2, 6]} />
                <meshLambertMaterial color="#C0C0C0" />
              </mesh>
              {/* Emergency lights */}
              <mesh position={[0, 2.2, -3]}>
                <boxGeometry args={[1.5, 0.3, 0.3]} />
                <meshBasicMaterial 
                  color={Math.sin(gameTime * 8) > 0 ? '#FF0000' : '#0000FF'}
                />
              </mesh>
            </group>
          )}

          {/* Fire alarm bell */}
          <mesh 
            position={[0, dimensions.height/2 - 0.5, dimensions.depth/2 + 0.2]}
            castShadow
          >
            <sphereGeometry args={[0.3, 8, 6]} />
            <meshLambertMaterial color="#FFD700" />
          </mesh>
        </group>
      )}

      {/* Police station specific features */}
      {building.type === 'service_police' && building.status === 'operational' && (
        <group>
          {/* Communication antenna */}
          <mesh 
            position={[0, dimensions.height/2 + 2, 0]}
            castShadow
          >
            <boxGeometry args={[0.1, 4, 0.1]} />
            <meshLambertMaterial color="#C0C0C0" />
          </mesh>

          {/* Police car */}
          {serviceConfig.hasVehicles && Math.cos(gameTime * 0.3) > 0 && (
            <group position={[-dimensions.width/2 - 3, 0.5, 0]}>
              <mesh>
                <boxGeometry args={[2, 1, 4.5]} />
                <meshLambertMaterial color={serviceConfig.vehicleColor} />
              </mesh>
              <mesh position={[0, 0.6, 0]}>
                <boxGeometry args={[1.8, 0.8, 4]} />
                <meshLambertMaterial color="#87CEEB" transparent opacity={0.7} />
              </mesh>
              {/* Police lights */}
              <mesh position={[0, 1.2, 0]}>
                <boxGeometry args={[0.8, 0.2, 0.5]} />
                <meshBasicMaterial 
                  color={Math.sin(gameTime * 6) > 0 ? '#FF0000' : '#0000FF'}
                />
              </mesh>
            </group>
          )}

          {/* Flag pole */}
          <mesh 
            position={[dimensions.width/2 - 1, dimensions.height/2 + 4, -dimensions.depth/2 + 1]}
            castShadow
          >
            <boxGeometry args={[0.1, 8, 0.1]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
        </group>
      )}

      {/* Hospital specific features */}
      {building.type === 'service_hospital' && building.status === 'operational' && (
        <group>
          {/* Red cross symbol */}
          <mesh 
            position={[0, dimensions.height/2 - 1, dimensions.depth/2 + 0.1]}
            castShadow
          >
            <boxGeometry args={[3, 0.8, 0.1]} />
            <meshLambertMaterial color="#FF0000" />
          </mesh>
          <mesh 
            position={[0, dimensions.height/2 - 1, dimensions.depth/2 + 0.1]}
            castShadow
          >
            <boxGeometry args={[0.8, 3, 0.1]} />
            <meshLambertMaterial color="#FF0000" />
          </mesh>

          {/* Emergency entrance */}
          <mesh 
            position={[dimensions.width/3, -dimensions.height/2 + 1.5, dimensions.depth/2 + 0.1]}
            castShadow
          >
            <boxGeometry args={[4, 3, 0.2]} />
            <meshLambertMaterial color="#FF6347" />
          </mesh>

          {/* Ambulance */}
          {serviceConfig.hasVehicles && Math.sin(gameTime * 0.4) > 0.2 && (
            <group position={[dimensions.width/2 + 4, 1, dimensions.depth/3]}>
              <mesh>
                <boxGeometry args={[2.5, 2, 6]} />
                <meshLambertMaterial color="#FFFFFF" />
              </mesh>
              <mesh position={[0, 1.5, -2]}>
                <boxGeometry args={[2.3, 1.5, 2]} />
                <meshLambertMaterial color="#87CEEB" transparent opacity={0.7} />
              </mesh>
              {/* Red cross on ambulance */}
              <mesh position={[0, 1, 2.5]}>
                <boxGeometry args={[0.5, 0.5, 0.05]} />
                <meshLambertMaterial color="#FF0000" />
              </mesh>
              <mesh position={[0, 1, 2.5]}>
                <boxGeometry args={[0.1, 0.5, 0.05]} />
                <meshLambertMaterial color="#FF0000" />
              </mesh>
            </group>
          )}

          {/* Helipad */}
          <mesh 
            position={[0, dimensions.height/2 + 0.3, -dimensions.depth/3]}
            castShadow
          >
            <cylinderGeometry args={[3, 3, 0.1, 16]} />
            <meshLambertMaterial color="#FFD700" />
          </mesh>
          <mesh 
            position={[0, dimensions.height/2 + 0.32, -dimensions.depth/3]}
          >
            <cylinderGeometry args={[2.5, 2.5, 0.02, 16]} />
            <meshBasicMaterial color="#FF0000" />
          </mesh>
        </group>
      )}

      {/* Power plant specific features */}
      {building.type === 'utility_power' && building.status === 'operational' && (
        <group>
          {/* Smokestacks */}
          {Array.from({ length: 3 }, (_, i) => (
            <group key={`smokestack-${i}`} position={[-dimensions.width/3 + i * dimensions.width/3, 0, 0]}>
              <mesh 
                position={[0, dimensions.height/2 + 4, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.8, 1, 8, 12]} />
                <meshLambertMaterial color="#696969" />
              </mesh>
              
              {/* Smoke */}
              {Array.from({ length: 6 }, (_, j) => (
                <mesh
                  key={j}
                  position={[
                    Math.sin(gameTime + j) * 0.8,
                    dimensions.height/2 + 8.5 + j * 1.2,
                    Math.cos(gameTime + j) * 0.8
                  ]}
                >
                  <sphereGeometry args={[0.4 + j * 0.15, 8, 6]} />
                  <meshBasicMaterial 
                    color="#D3D3D3"
                    transparent
                    opacity={Math.max(0.1, 0.7 - j * 0.1)}
                  />
                </mesh>
              ))}
            </group>
          ))}

          {/* Electrical transformers */}
          <group position={[dimensions.width/2 + 2, 1.5, 0]}>
            <mesh castShadow>
              <boxGeometry args={[3, 3, 2]} />
              <meshLambertMaterial color="#228B22" />
            </mesh>
            <mesh position={[4, 0, 0]} castShadow>
              <boxGeometry args={[2.5, 2.5, 1.5]} />
              <meshLambertMaterial color="#32CD32" />
            </mesh>
          </group>

          {/* Power lines */}
          <group position={[0, dimensions.height + 2, 0]}>
            {Array.from({ length: 4 }, (_, i) => (
              <mesh
                key={i}
                position={[i * 5 - 7.5, 0, 0]}
                castShadow
              >
                <boxGeometry args={[0.2, 6, 0.2]} />
                <meshLambertMaterial color="#8B4513" />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* Water treatment specific features */}
      {building.type === 'utility_water' && building.status === 'operational' && (
        <group>
          {/* Water tanks */}
          <mesh 
            position={[-dimensions.width/3, dimensions.height/2 + 2, 0]}
            castShadow
          >
            <cylinderGeometry args={[2.5, 2.5, 4, 16]} />
            <meshLambertMaterial color="#87CEEB" />
          </mesh>
          <mesh 
            position={[dimensions.width/3, dimensions.height/2 + 1.5, 0]}
            castShadow
          >
            <cylinderGeometry args={[2, 2, 3, 16]} />
            <meshLambertMaterial color="#4682B4" />
          </mesh>

          {/* Treatment pools */}
          <mesh 
            position={[0, 0.3, dimensions.depth/2 + 3]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[4, 4, 0.6, 16]} />
            <meshLambertMaterial color="#00CED1" />
          </mesh>
          <mesh 
            position={[0, 0.8, dimensions.depth/2 + 3]}
          >
            <cylinderGeometry args={[3.8, 3.8, 0.1, 16]} />
            <meshLambertMaterial 
              color="#87CEEB"
              transparent
              opacity={0.7}
            />
          </mesh>

          {/* Pipes */}
          <group>
            {Array.from({ length: 3 }, (_, i) => (
              <mesh
                key={i}
                position={[i * 2 - 2, 1, dimensions.depth/2 + 6]}
                castShadow
              >
                <cylinderGeometry args={[0.2, 0.2, 8, 8]} />
                <meshLambertMaterial color="#C0C0C0" />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* Service efficiency indicator */}
      {showDebug && building.serviceEfficiency && (
        <group position={[0, dimensions.height + 1, 0]}>
          <mesh>
            <cylinderGeometry args={[0.5, 0.5, building.serviceEfficiency * 3, 8]} />
            <meshBasicMaterial 
              color={
                building.serviceEfficiency > 0.8 ? '#00ff00' :
                building.serviceEfficiency > 0.6 ? '#ffff00' :
                '#ff0000'
              }
            />
          </mesh>
        </group>
      )}

      {/* Service range indicator */}
      {showDebug && building.serviceRange && (
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[building.serviceRange, building.serviceRange, 0.1, 16]} />
          <meshBasicMaterial 
            color="#00ff00"
            transparent
            opacity={0.1}
          />
        </mesh>
      )}

      {/* Building modules indicators */}
      {building.modules.length > 0 && (
        <group position={[dimensions.width/2 + 1, 1, 0]}>
          {building.modules.slice(0, 3).map((module, index) => (
            <mesh
              key={module.id}
              position={[0, index * 0.8, index * 0.5]}
              castShadow
            >
              <boxGeometry args={[0.6, 0.6, 0.6]} />
              <meshLambertMaterial color="#FFD700" />
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

      {/* Construction effects */}
      {building.status === 'constructing' && (
        <group>
          {/* Construction equipment */}
          <mesh 
            position={[dimensions.width/2 + 2, 1, 0]}
            castShadow
          >
            <boxGeometry args={[1.5, 1.5, 3]} />
            <meshLambertMaterial color="#FFD700" />
          </mesh>
          
          {Array.from({ length: 5 }, (_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * dimensions.width * 1.2,
                Math.random() * dimensions.height,
                (Math.random() - 0.5) * dimensions.depth * 1.2
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
