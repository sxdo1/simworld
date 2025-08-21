import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Building } from '../../types/buildings'
import { useGameStore } from '../../stores/gameStore'
import { useEducationStore } from '../../stores/educationStore'

interface EducationBuildingProps {
  building: Building
  isSelected: boolean
  showDebug: boolean
}

export function EducationBuilding({ building, isSelected, showDebug }: EducationBuildingProps) {
  const meshRef = useRef<THREE.Group>(null)
  const { selectBuilding, gameTime } = useGameStore()
  const { schools, students } = useEducationStore()

  // Find associated school
  const school = useMemo(() => {
    return schools.find(s => s.buildingId === building.id)
  }, [schools, building.id])

  // Education building configuration based on type
  const educationConfig = useMemo(() => {
    const configs = {
      service_school: {
        type: 'primary',
        color: '#DEB887',
        roofColor: '#CD853F',
        hasPlayground: true,
        hasLibrary: false,
        capacity: 500,
        ageRange: 'children',
        serviceIcon: '🏫'
      },
      service_university: {
        type: 'university',
        color: '#8FBC8F',
        roofColor: '#556B2F',
        hasPlayground: false,
        hasLibrary: true,
        capacity: 2000,
        ageRange: 'adults',
        serviceIcon: '🎓'
      },
      education_primary: {
        type: 'primary',
        color: '#FFB6C1',
        roofColor: '#DC143C',
        hasPlayground: true,
        hasLibrary: false,
        capacity: 300,
        ageRange: 'children',
        serviceIcon: '📚'
      },
      education_secondary: {
        type: 'secondary',
        color: '#98FB98',
        roofColor: '#228B22',
        hasPlayground: false,
        hasLibrary: true,
        capacity: 600,
        ageRange: 'teenagers',
        serviceIcon: '🎒'
      }
    }
    
    return configs[building.type as keyof typeof configs] || configs.service_school
  }, [building.type])

  // Building dimensions based on education type
  const dimensions = useMemo(() => {
    const baseSizes = {
      primary: { width: 12, height: 4, depth: 8 },
      secondary: { width: 16, height: 6, depth: 12 },
      university: { width: 24, height: 8, depth: 20 }
    }
    
    const base = baseSizes[educationConfig.type as keyof typeof baseSizes]
    const levelMultiplier = 1 + (building.level - 1) * 0.3
    
    return {
      width: base.width * levelMultiplier,
      height: base.height * levelMultiplier,
      depth: base.depth * levelMultiplier
    }
  }, [educationConfig.type, building.level])

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation()
    selectBuilding(building.id)
  }

  // Animation for construction and school activity
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

  // School hours check
  const isSchoolOpen = useMemo(() => {
    const currentHour = Math.floor(gameTime / 60) % 24
    return educationConfig.type === 'university' 
      ? currentHour >= 8 && currentHour <= 20 
      : currentHour >= 8 && currentHour <= 15
  }, [gameTime, educationConfig.type])

  // Student enrollment for this school
  const enrolledStudents = useMemo(() => {
    if (!school) return 0
    return students.filter(s => s.schoolId === school.id).length
  }, [students, school])

  return (
    <group 
      ref={meshRef}
      position={[building.position.x, 0, building.position.z]}
      rotation={[0, building.rotation, 0]}
      onClick={handleClick}
    >
      {/* Main education building */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshLambertMaterial 
          color={educationConfig.color}
          transparent={building.status === 'constructing'}
          opacity={building.status === 'constructing' ? 0.7 : 1}
        />
      </mesh>

      {/* Roof */}
      {building.status === 'operational' && (
        <mesh 
          position={[0, dimensions.height/2 + 0.3, 0]}
          castShadow
        >
          <boxGeometry args={[dimensions.width + 0.5, 0.6, dimensions.depth + 0.5]} />
          <meshLambertMaterial color={educationConfig.roofColor} />
        </mesh>
      )}

      {/* Classroom windows */}
      {building.status === 'operational' && (
        <group>
          {Array.from({ length: Math.floor(dimensions.width / 3) }, (_, i) => {
            const floors = Math.max(1, Math.floor(dimensions.height / 3))
            
            return Array.from({ length: floors }, (_, floor) => {
              const windowX = -dimensions.width/2 + (i + 0.5) * 3
              const windowY = -dimensions.height/2 + (floor + 0.5) * (dimensions.height / floors)
              const isLit = isSchoolOpen && Math.random() < 0.7
              
              return [
                // Front windows
                <mesh
                  key={`window-front-${floor}-${i}`}
                  position={[windowX, windowY, dimensions.depth/2 + 0.01]}
                  castShadow
                >
                  <boxGeometry args={[1.5, 1.8, 0.05]} />
                  <meshLambertMaterial 
                    color="#87CEEB"
                    transparent
                    opacity={0.8}
                    emissive={isLit ? new THREE.Color(0xffffaa) : new THREE.Color(0x000000)}
                    emissiveIntensity={isLit ? 0.2 : 0}
                  />
                </mesh>,
                // Back windows
                <mesh
                  key={`window-back-${floor}-${i}`}
                  position={[windowX, windowY, -dimensions.depth/2 - 0.01]}
                  castShadow
                >
                  <boxGeometry args={[1.5, 1.8, 0.05]} />
                  <meshLambertMaterial 
                    color="#87CEEB"
                    transparent
                    opacity={0.8}
                    emissive={isLit ? new THREE.Color(0xffffaa) : new THREE.Color(0x000000)}
                    emissiveIntensity={isLit ? 0.2 : 0}
                  />
                </mesh>
              ]
            }).flat()
          })}
        </group>
      )}

      {/* Main entrance */}
      {building.status === 'operational' && (
        <mesh 
          position={[0, -dimensions.height/2 + 1.5, dimensions.depth/2 + 0.1]}
          castShadow
        >
          <boxGeometry args={[3, 3, 0.2]} />
          <meshLambertMaterial 
            color="#8B4513"
            emissive={isSchoolOpen ? new THREE.Color(0xffffaa) : new THREE.Color(0x000000)}
            emissiveIntensity={isSchoolOpen ? 0.1 : 0}
          />
        </mesh>
      )}

      {/* School sign */}
      {building.status === 'operational' && (
        <mesh 
          position={[0, dimensions.height/2 - 0.8, dimensions.depth/2 + 0.05]}
          castShadow
        >
          <boxGeometry args={[dimensions.width * 0.6, 1.2, 0.1]} />
          <meshLambertMaterial color="#FFFFFF" />
        </mesh>
      )}

      {/* Playground for primary schools */}
      {educationConfig.hasPlayground && building.status === 'operational' && (
        <group position={[dimensions.width/2 + 6, 0, 0]}>
          {/* Playground surface */}
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <cylinderGeometry args={[8, 8, 0.1, 16]} />
            <meshLambertMaterial color="#DEB887" />
          </mesh>

          {/* Playground equipment */}
          {/* Swing set */}
          <group position={[-4, 0, -4]}>
            <mesh position={[0, 1.5, 0]} castShadow>
              <boxGeometry args={[3, 0.2, 0.2]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
            <mesh position={[-1, 0.8, 0]} castShadow>
              <boxGeometry args={[0.1, 1.6, 0.1]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
            <mesh position={[1, 0.8, 0]} castShadow>
              <boxGeometry args={[0.1, 1.6, 0.1]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
            {/* Swing seats */}
            <mesh position={[-0.8, 0.5, 0]} castShadow>
              <boxGeometry args={[0.4, 0.05, 0.3]} />
              <meshLambertMaterial color="#FF0000" />
            </mesh>
            <mesh position={[0.8, 0.5, 0]} castShadow>
              <boxGeometry args={[0.4, 0.05, 0.3]} />
              <meshLambertMaterial color="#0000FF" />
            </mesh>
          </group>

          {/* Slide */}
          <group position={[4, 0, -2]}>
            <mesh position={[0, 1, 0]} castShadow>
              <boxGeometry args={[2, 2, 1]} />
              <meshLambertMaterial color="#FFD700" />
            </mesh>
            <mesh position={[0, 0.5, 2]} rotation={[Math.PI/6, 0, 0]} castShadow>
              <boxGeometry args={[1, 0.1, 3]} />
              <meshLambertMaterial color="#FF6347" />
            </mesh>
          </group>

          {/* Seesaw */}
          <group position={[0, 0, 4]}>
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[0.2, 0.6, 0.2]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
            <mesh position={[0, 0.6, 0]} castShadow>
              <boxGeometry args={[4, 0.1, 0.3]} />
              <meshLambertMaterial color="#32CD32" />
            </mesh>
          </group>
        </group>
      )}

      {/* University-specific features */}
      {educationConfig.type === 'university' && building.status === 'operational' && (
        <group>
          {/* Clock tower */}
          <mesh 
            position={[0, dimensions.height/2 + 4, -dimensions.depth/3]}
            castShadow
          >
            <boxGeometry args={[1.5, 8, 1.5]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh 
            position={[0, dimensions.height/2 + 7, -dimensions.depth/3]}
            castShadow
          >
            <cylinderGeometry args={[1, 1, 2, 8]} />
            <meshLambertMaterial color="#FFD700" />
          </mesh>

          {/* Library wing */}
          <mesh 
            position={[dimensions.width/2 + 4, dimensions.height/2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[8, dimensions.height, dimensions.depth * 0.8]} />
            <meshLambertMaterial color="#F5DEB3" />
          </mesh>

          {/* Campus quad */}
          <mesh 
            position={[0, 0.05, dimensions.depth + 8]}
            receiveShadow
          >
            <boxGeometry args={[dimensions.width + 10, 0.1, 16]} />
            <meshLambertMaterial color="#228B22" />
          </mesh>

          {/* Statues/monuments */}
          <mesh 
            position={[0, 2, dimensions.depth + 8]}
            castShadow
          >
            <cylinderGeometry args={[0.8, 0.8, 4, 12]} />
            <meshLambertMaterial color="#A0A0A0" />
          </mesh>
          <mesh 
            position={[0, 4.5, dimensions.depth + 8]}
            castShadow
          >
            <boxGeometry args={[1.5, 1.5, 0.8]} />
            <meshLambertMaterial color="#696969" />
          </mesh>
        </group>
      )}

      {/* School bus pickup area */}
      {educationConfig.ageRange === 'children' && building.status === 'operational' && (
        <group position={[-dimensions.width/2 - 6, 0, dimensions.depth/2 + 3]}>
          {/* Bus stop sign */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[0.1, 3, 0.1]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow>
            <boxGeometry args={[1, 0.8, 0.1]} />
            <meshLambertMaterial color="#FFD700" />
          </mesh>

          {/* School bus (sometimes) */}
          {isSchoolOpen && Math.sin(gameTime * 0.2) > 0.7 && (
            <group position={[0, 1, 3]}>
              <mesh>
                <boxGeometry args={[2.5, 2, 8]} />
                <meshLambertMaterial color="#FFD700" />
              </mesh>
              <mesh position={[0, 1.5, -3]}>
                <boxGeometry args={[2.3, 1.5, 2]} />
                <meshLambertMaterial color="#87CEEB" transparent opacity={0.7} />
              </mesh>
              {/* Bus wheels */}
              {[-1, 1].map(x => 
                [-2.5, 0, 2.5].map(z => (
                  <mesh key={`bus-${x}-${z}`} position={[x, -1.2, z]}>
                    <cylinderGeometry args={[0.4, 0.4, 0.3, 8]} />
                    <meshLambertMaterial color="#000000" />
                  </mesh>
                ))
              )}
              {/* School bus markings */}
              <mesh position={[0, 0, 3.8]}>
                <boxGeometry args={[2, 0.5, 0.05]} />
                <meshLambertMaterial color="#000000" />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* Student activity indicators */}
      {isSchoolOpen && enrolledStudents > 0 && (
        <group position={[0, 1, dimensions.depth/2 + 2]}>
          {Array.from({ length: Math.min(8, Math.floor(enrolledStudents / 20)) }, (_, i) => (
            <mesh
              key={i}
              position={[
                Math.sin(gameTime + i) * 3,
                0.5,
                Math.cos(gameTime + i) * 3
              ]}
            >
              <boxGeometry args={[0.3, 1, 0.3]} />
              <meshLambertMaterial 
                color={educationConfig.ageRange === 'children' ? '#FFB6C1' : 
                      educationConfig.ageRange === 'teenagers' ? '#98FB98' : '#87CEEB'} 
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Sports facilities for secondary schools and universities */}
      {(educationConfig.type === 'secondary' || educationConfig.type === 'university') && building.status === 'operational' && (
        <group position={[0, 0, -dimensions.depth - 8]}>
          {/* Sports field */}
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <boxGeometry args={[20, 0.1, 12]} />
            <meshLambertMaterial color="#32CD32" />
          </mesh>
          
          {/* Goal posts */}
          <mesh position={[-9, 2, 0]} castShadow>
            <boxGeometry args={[0.2, 4, 6]} />
            <meshLambertMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[9, 2, 0]} castShadow>
            <boxGeometry args={[0.2, 4, 6]} />
            <meshLambertMaterial color="#FFFFFF" />
          </mesh>
        </group>
      )}

      {/* Parking lot */}
      {educationConfig.type === 'university' && building.status === 'operational' && (
        <group position={[dimensions.width/2 + 10, 0, 0]}>
          <mesh position={[0, -0.05, 0]} receiveShadow>
            <boxGeometry args={[12, 0.1, 16]} />
            <meshLambertMaterial color="#2F2F2F" />
          </mesh>
          
          {/* Parking spaces */}
          {Array.from({ length: 20 }, (_, i) => (
            <mesh
              key={i}
              position={[
                (i % 4) * 3 - 4.5,
                0.01,
                Math.floor(i / 4) * 3 - 6
              ]}
            >
              <boxGeometry args={[2.5, 0.02, 2.8]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          ))}
        </group>
      )}

      {/* Education quality indicator */}
      {school && showDebug && (
        <group position={[0, dimensions.height + 2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.4, 0.4, school.quality * 3, 8]} />
            <meshBasicMaterial 
              color={
                school.quality > 0.8 ? '#00ff00' :
                school.quality > 0.6 ? '#ffff00' :
                '#ff0000'
              }
            />
          </mesh>
        </group>
      )}

      {/* Student enrollment indicator */}
      {showDebug && enrolledStudents > 0 && (
        <group position={[0, dimensions.height + 3, 0]}>
          <mesh>
            <sphereGeometry args={[0.2 + enrolledStudents / 100, 8, 6]} />
            <meshBasicMaterial color="#4169E1" transparent opacity={0.7} />
          </mesh>
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
          {Array.from({ length: 6 }, (_, i) => (
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
