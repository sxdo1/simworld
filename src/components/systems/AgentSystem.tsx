import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'
import { useTerrainStore } from '../../stores/terrainStore'

interface Citizen {
  id: string
  position: THREE.Vector3
  destination: THREE.Vector3 | null
  homeId: string | null
  workplaceId: string | null
  age: 'child' | 'adult' | 'elderly'
  activity: 'home' | 'work' | 'shopping' | 'recreation' | 'commuting'
  speed: number
  color: string
}

export function AgentSystem() {
  const groupRef = useRef<THREE.Group>(null)
  const citizensRef = useRef<Citizen[]>([])
  
  const { buildings, gameTime, showDebug } = useGameStore()
  const { getTerrainCell } = useTerrainStore()

  // Generate citizens based on residential buildings
  const citizens = useMemo(() => {
    const residentialBuildings = buildings.filter(b => 
      b.zoneType === 'residential' && b.status === 'operational'
    )
    
    if (residentialBuildings.length === 0) {
      return []
    }

    const newCitizens: Citizen[] = []
    
    residentialBuildings.forEach(building => {
      const residentsCount = building.residents || 0
      const citizensPerBuilding = Math.min(8, Math.max(1, Math.floor(residentsCount / 4)))
      
      for (let i = 0; i < citizensPerBuilding; i++) {
        const ages: Array<'child' | 'adult' | 'elderly'> = ['child', 'adult', 'adult', 'elderly']
        const age = ages[Math.floor(Math.random() * ages.length)]
        
        const colors = {
          child: ['#ffcc99', '#deb887', '#f4a460'],
          adult: ['#fdbcb4', '#eea47f', '#cd853f', '#8b4513'],
          elderly: ['#c0c0c0', '#dcdcdc', '#f5f5f5']
        }
        
        const citizen: Citizen = {
          id: `citizen_${building.id}_${i}`,
          position: new THREE.Vector3(
            building.position.x + (Math.random() - 0.5) * 2,
            0.5,
            building.position.z + (Math.random() - 0.5) * 2
          ),
          destination: null,
          homeId: building.id,
          workplaceId: null,
          age,
          activity: 'home',
          speed: age === 'child' ? 1.5 : age === 'elderly' ? 1 : 2,
          color: colors[age][Math.floor(Math.random() * colors[age].length)]
        }
        
        // Assign workplace for adults
        if (age === 'adult') {
          const workplaces = buildings.filter(b => 
            (b.zoneType === 'commercial' || b.zoneType === 'industrial' || b.zoneType === 'office') && 
            b.status === 'operational'
          )
          if (workplaces.length > 0) {
            citizen.workplaceId = workplaces[Math.floor(Math.random() * workplaces.length)].id
          }
        }
        
        newCitizens.push(citizen)
      }
    })
    
    citizensRef.current = newCitizens
    return newCitizens
  }, [buildings])

  // Update citizen behavior
  useFrame((state, delta) => {
    if (!groupRef.current || citizensRef.current.length === 0) return
    
    const currentHour = Math.floor(gameTime / 60) % 24
    
    citizensRef.current.forEach((citizen, index) => {
      // Determine activity based on time and citizen type
      let targetActivity: typeof citizen.activity = 'home'
      
      if (citizen.age === 'adult') {
        if (currentHour >= 8 && currentHour < 17 && citizen.workplaceId) {
          targetActivity = 'work'
        } else if (currentHour >= 18 && currentHour < 20) {
          targetActivity = Math.random() < 0.3 ? 'shopping' : 'home'
        } else if (currentHour >= 20 && currentHour < 22) {
          targetActivity = Math.random() < 0.2 ? 'recreation' : 'home'
        }
      } else if (citizen.age === 'child') {
        if (currentHour >= 8 && currentHour < 15) {
          // School time - find education buildings
          const schools = buildings.filter(b => b.type === 'service_school' && b.status === 'operational')
          if (schools.length > 0) {
            targetActivity = 'work' // Using 'work' for school
            if (!citizen.workplaceId) {
              citizen.workplaceId = schools[Math.floor(Math.random() * schools.length)].id
            }
          }
        } else if (currentHour >= 16 && currentHour < 18) {
          targetActivity = 'recreation'
        }
      }
      
      // Set destination based on activity
      if (citizen.activity !== targetActivity) {
        citizen.activity = targetActivity
        
        const home = buildings.find(b => b.id === citizen.homeId)
        const workplace = citizen.workplaceId ? buildings.find(b => b.id === citizen.workplaceId) : null
        
        switch (targetActivity) {
          case 'home':
            if (home) {
              citizen.destination = new THREE.Vector3(
                home.position.x + (Math.random() - 0.5) * 2,
                0.5,
                home.position.z + (Math.random() - 0.5) * 2
              )
            }
            break
          case 'work':
            if (workplace) {
              citizen.destination = new THREE.Vector3(
                workplace.position.x + (Math.random() - 0.5) * 2,
                0.5,
                workplace.position.z + (Math.random() - 0.5) * 2
              )
            }
            break
          case 'shopping':
            const shops = buildings.filter(b => b.zoneType === 'commercial' && b.status === 'operational')
            if (shops.length > 0) {
              const shop = shops[Math.floor(Math.random() * shops.length)]
              citizen.destination = new THREE.Vector3(
                shop.position.x + (Math.random() - 0.5) * 2,
                0.5,
                shop.position.z + (Math.random() - 0.5) * 2
              )
            }
            break
          case 'recreation':
            // Random walk for recreation
            citizen.destination = new THREE.Vector3(
              citizen.position.x + (Math.random() - 0.5) * 20,
              0.5,
              citizen.position.z + (Math.random() - 0.5) * 20
            )
            break
        }
      }
      
      // Move towards destination
      if (citizen.destination) {
        const direction = new THREE.Vector3().subVectors(citizen.destination, citizen.position)
        const distance = direction.length()
        
        if (distance < 1) {
          // Reached destination
          citizen.destination = null
          
          // Random movement near destination
          if (Math.random() < 0.1) {
            citizen.destination = new THREE.Vector3(
              citizen.position.x + (Math.random() - 0.5) * 4,
              0.5,
              citizen.position.z + (Math.random() - 0.5) * 4
            )
          }
        } else {
          // Move towards destination
          direction.normalize()
          const moveDistance = citizen.speed * delta
          citizen.position.add(direction.multiplyScalar(moveDistance))
          
          // Keep citizens on ground level
          const terrainCell = getTerrainCell(citizen.position.x, citizen.position.z)
          citizen.position.y = terrainCell ? terrainCell.elevation * 0.5 + 0.5 : 0.5
        }
      }
      
      // Update mesh position
      const citizenMesh = groupRef.current?.children[index] as THREE.Group
      if (citizenMesh) {
        citizenMesh.position.copy(citizen.position)
        
        // Simple walking animation
        citizenMesh.rotation.y = Math.sin(state.clock.elapsedTime * 5 + index) * 0.1
        citizenMesh.position.y += Math.sin(state.clock.elapsedTime * 8 + index) * 0.05
      }
    })
  })

  if (buildings.length === 0) {
    return null
  }

  console.log(`👥 Agent system: ${citizens.length} citizens active`)

  return (
    <group ref={groupRef}>
      {/* Render citizens */}
      {citizens.map((citizen, index) => (
        <group 
          key={citizen.id}
          position={[citizen.position.x, citizen.position.y, citizen.position.z]}
        >
          {/* Citizen body */}
          <mesh castShadow>
            <boxGeometry 
              args={
                citizen.age === 'child' ? [0.4, 0.8, 0.4] :
                citizen.age === 'elderly' ? [0.5, 1.4, 0.5] :
                [0.5, 1.6, 0.5] // adult
              } 
            />
            <meshLambertMaterial color={citizen.color} />
          </mesh>
          
          {/* Citizen head */}
          <mesh position={[0, citizen.age === 'child' ? 0.6 : citizen.age === 'elderly' ? 1 : 1.1, 0]}>
            <sphereGeometry 
              args={[
                citizen.age === 'child' ? 0.15 : 0.2,
                8, 6
              ]} 
            />
            <meshLambertMaterial color={citizen.color} />
          </mesh>
          
          {/* Activity indicator */}
          {showDebug && (
            <mesh position={[0, citizen.age === 'child' ? 1.5 : 2, 0]}>
              <sphereGeometry args={[0.1, 8, 6]} />
              <meshBasicMaterial 
                color={
                  citizen.activity === 'home' ? '#0000ff' :
                  citizen.activity === 'work' ? '#ffff00' :
                  citizen.activity === 'shopping' ? '#ff00ff' :
                  citizen.activity === 'recreation' ? '#00ff00' :
                  '#ffffff' // commuting
                }
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Citizen gathering spots */}
      {buildings.filter(b => b.zoneType === 'commercial').map(building => (
        <group key={`gathering-${building.id}`} position={[building.position.x, 0.1, building.position.z]}>
          {/* Simple crowd simulation around commercial buildings */}
          {Math.random() < 0.3 && (
            <mesh position={[2, 0, 2]}>
              <cylinderGeometry args={[0.5, 0.5, 0.1, 6]} />
              <meshLambertMaterial color="#999999" transparent opacity={0.3} />
            </mesh>
          )}
        </group>
      ))}

      {/* Debug citizen paths */}
      {showDebug && citizens.map(citizen => 
        citizen.destination && (
          <group key={`${citizen.id}-path`}>
            {/* Line from citizen to destination */}
            <mesh 
              position={[
                (citizen.position.x + citizen.destination.x) / 2,
                0.2,
                (citizen.position.z + citizen.destination.z) / 2
              ]}
              scale={[0.05, 0.05, citizen.position.distanceTo(citizen.destination)]}
              rotation={[0, Math.atan2(
                citizen.destination.x - citizen.position.x,
                citizen.destination.z - citizen.position.z
              ), 0]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#ff0000" transparent opacity={0.5} />
            </mesh>
            
            {/* Destination marker */}
            <mesh position={[citizen.destination.x, 0.2, citizen.destination.z]}>
              <sphereGeometry args={[0.2, 8, 6]} />
              <meshBasicMaterial color="#ff0000" />
            </mesh>
          </group>
        )
      )}
    </group>
  )
}
