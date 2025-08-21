import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'
import { useTerrainStore } from '../../stores/terrainStore'

interface Vehicle {
  id: string
  position: THREE.Vector3
  destination: THREE.Vector3
  path: THREE.Vector3[]
  currentPathIndex: number
  speed: number
  type: 'car' | 'bus' | 'truck' | 'emergency'
  color: string
}

export function TrafficSystem() {
  const groupRef = useRef<THREE.Group>(null)
  const vehiclesRef = useRef<Vehicle[]>([])
  
  const { roads, buildings, gameTime, showDebug } = useGameStore()
  const { getTerrainCell } = useTerrainStore()

  // Generate vehicles based on buildings and roads
  const vehicles = useMemo(() => {
    if (roads.length === 0 || buildings.length === 0) {
      return []
    }

    const newVehicles: Vehicle[] = []
    const maxVehicles = Math.min(20, Math.floor(buildings.length * 0.5))
    
    for (let i = 0; i < maxVehicles; i++) {
      // Pick random start and end points from road network
      const startRoadIndex = Math.floor(Math.random() * roads.length)
      const endRoadIndex = Math.floor(Math.random() * roads.length)
      
      const startRoad = roads[startRoadIndex]
      const endRoad = roads[endRoadIndex]
      
      if (startRoad.length === 0 || endRoad.length === 0) continue
      
      const startPoint = startRoad[Math.floor(Math.random() * startRoad.length)]
      const endPoint = endRoad[Math.floor(Math.random() * endRoad.length)]
      
      // Simple path: just direct line for now (would use A* in full implementation)
      const path = [startPoint.clone(), endPoint.clone()]
      
      const vehicleTypes = ['car', 'car', 'car', 'bus', 'truck'] // Cars more common
      const type = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)] as any
      
      const colors = {
        car: ['#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'],
        bus: ['#ffaa00', '#00aaff'],
        truck: ['#444444', '#666666'],
        emergency: ['#ff0000']
      }
      
      const vehicle: Vehicle = {
        id: `vehicle_${i}`,
        position: startPoint.clone(),
        destination: endPoint.clone(),
        path,
        currentPathIndex: 0,
        speed: type === 'car' ? 8 : type === 'bus' ? 6 : type === 'truck' ? 4 : 12,
        type,
        color: colors[type][Math.floor(Math.random() * colors[type].length)]
      }
      
      newVehicles.push(vehicle)
    }
    
    vehiclesRef.current = newVehicles
    return newVehicles
  }, [roads.length, buildings.length])

  // Update vehicle positions
  useFrame((state, delta) => {
    if (!groupRef.current || vehiclesRef.current.length === 0) return
    
    vehiclesRef.current.forEach((vehicle, index) => {
      if (vehicle.currentPathIndex >= vehicle.path.length - 1) {
        // Vehicle reached destination - respawn or find new destination
        if (roads.length > 0) {
          const randomRoad = roads[Math.floor(Math.random() * roads.length)]
          if (randomRoad.length > 0) {
            const newDestination = randomRoad[Math.floor(Math.random() * randomRoad.length)]
            vehicle.destination.copy(newDestination)
            vehicle.path = [vehicle.position.clone(), newDestination.clone()]
            vehicle.currentPathIndex = 0
          }
        }
        return
      }
      
      const target = vehicle.path[vehicle.currentPathIndex + 1]
      if (!target) return
      
      const direction = new THREE.Vector3().subVectors(target, vehicle.position)
      const distance = direction.length()
      
      if (distance < 0.5) {
        // Reached current path point, move to next
        vehicle.currentPathIndex++
      } else {
        // Move towards target
        direction.normalize()
        const moveDistance = vehicle.speed * delta
        vehicle.position.add(direction.multiplyScalar(moveDistance))
        
        // Keep vehicles on ground level
        const terrainCell = getTerrainCell(vehicle.position.x, vehicle.position.z)
        vehicle.position.y = terrainCell ? terrainCell.elevation * 0.5 + 0.5 : 0.5
      }
      
      // Update mesh position if it exists
      const vehicleMesh = groupRef.current?.children[index] as THREE.Group
      if (vehicleMesh) {
        vehicleMesh.position.copy(vehicle.position)
        
        // Rotate to face movement direction
        if (distance > 0.1) {
          const angle = Math.atan2(direction.x, direction.z)
          vehicleMesh.rotation.y = angle
        }
      }
    })
  })

  if (roads.length === 0) {
    return null
  }

  console.log(`🚗 Traffic system: ${vehicles.length} vehicles active`)

  return (
    <group ref={groupRef}>
      {/* Render vehicles */}
      {vehicles.map((vehicle, index) => (
        <group 
          key={vehicle.id}
          position={[vehicle.position.x, vehicle.position.y, vehicle.position.z]}
        >
          {/* Vehicle body */}
          <mesh castShadow>
            <boxGeometry 
              args={
                vehicle.type === 'car' ? [1.8, 0.8, 4] :
                vehicle.type === 'bus' ? [2.5, 2, 8] :
                vehicle.type === 'truck' ? [2.2, 2.5, 6] :
                [1.8, 0.8, 4] // emergency
              } 
            />
            <meshLambertMaterial color={vehicle.color} />
          </mesh>
          
          {/* Vehicle windows */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry 
              args={
                vehicle.type === 'car' ? [1.6, 0.4, 3.5] :
                vehicle.type === 'bus' ? [2.3, 1.5, 7.5] :
                vehicle.type === 'truck' ? [2, 1.8, 2] : // Truck cab only
                [1.6, 0.4, 3.5] // emergency
              } 
            />
            <meshLambertMaterial color="#87CEEB" transparent opacity={0.7} />
          </mesh>
          
          {/* Emergency lights */}
          {vehicle.type === 'emergency' && (
            <mesh position={[0, 1.2, 0]}>
              <boxGeometry args={[0.8, 0.2, 0.8]} />
              <meshBasicMaterial 
                color={Math.sin(gameTime * 10) > 0 ? '#ff0000' : '#0000ff'} 
              />
            </mesh>
          )}
          
          {/* Vehicle wheels */}
          {[-1.5, 1.5].map(x => 
            [-1.5, 1.5].map(z => (
              <mesh key={`${x}-${z}`} position={[x, -0.5, z]}>
                <cylinderGeometry args={[0.3, 0.3, 0.2, 8]} />
                <meshLambertMaterial color="#222222" />
              </mesh>
            ))
          )}
        </group>
      ))}

      {/* Traffic lights at intersections */}
      {roads.length > 2 && (
        <group>
          {/* Simple traffic light example */}
          <mesh position={[10, 3, 10]}>
            <boxGeometry args={[0.3, 2, 0.3]} />
            <meshLambertMaterial color="#444444" />
          </mesh>
          <mesh position={[10, 4, 10]}>
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshBasicMaterial 
              color={Math.floor(gameTime / 3) % 3 === 0 ? '#ff0000' : '#444444'} 
            />
          </mesh>
          <mesh position={[10, 3.6, 10]}>
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshBasicMaterial 
              color={Math.floor(gameTime / 3) % 3 === 1 ? '#ffff00' : '#444444'} 
            />
          </mesh>
          <mesh position={[10, 3.2, 10]}>
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshBasicMaterial 
              color={Math.floor(gameTime / 3) % 3 === 2 ? '#00ff00' : '#444444'} 
            />
          </mesh>
        </group>
      )}

      {/* Debug vehicle paths */}
      {showDebug && vehicles.map(vehicle => 
        vehicle.path.map((point, index) => (
          <mesh 
            key={`${vehicle.id}-path-${index}`}
            position={[point.x, point.y + 0.1, point.z]}
          >
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
        ))
      )}
    </group>
  )
}
