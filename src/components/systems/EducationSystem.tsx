import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'
import { useEducationStore } from '../../stores/educationStore'
import { useEconomyStore } from '../../stores/economyStore'

export function EducationSystem() {
  const groupRef = useRef<THREE.Group>(null)
  const lastUpdateTime = useRef(0)
  
  const { buildings, gameTime, showDebug } = useGameStore()
  const { 
    schools,
    students,
    updateEducationSystem,
    enrollStudents,
    graduateStudents,
    getSchoolCapacity,
    getEducationDemand
  } = useEducationStore()
  const { updateBusiness } = useEconomyStore()

  // Update education system every game hour
  useFrame((state, delta) => {
    const currentTime = Math.floor(gameTime / 60) // Convert to hours
    
    if (currentTime !== lastUpdateTime.current) {
      lastUpdateTime.current = currentTime
      updateEducationSystem(delta)
    }
  })

  // Education buildings (schools, universities)
  const educationBuildings = useMemo(() => {
    return buildings.filter(b => 
      b.type === 'service_school' || 
      b.type === 'service_university' ||
      b.type.includes('education')
    ).filter(b => b.status === 'operational')
  }, [buildings])

  // Student flow visualization
  const studentFlows = useMemo(() => {
    const flows: Array<{
      from: THREE.Vector3
      to: THREE.Vector3
      studentCount: number
      schoolType: string
    }> = []

    schools.forEach(school => {
      const schoolBuilding = buildings.find(b => b.id === school.buildingId)
      if (!schoolBuilding) return

      // Find residential buildings within service range
      const nearbyResidential = buildings.filter(b => 
        b.zoneType === 'residential' && 
        b.status === 'operational' &&
        b.position.distanceTo(schoolBuilding.position) <= (school.serviceRange || 15)
      )

      nearbyResidential.forEach(residential => {
        const studentsFromBuilding = students.filter(s => 
          s.schoolId === school.id && s.homeId === residential.id
        ).length

        if (studentsFromBuilding > 0) {
          flows.push({
            from: residential.position,
            to: schoolBuilding.position,
            studentCount: studentsFromBuilding,
            schoolType: school.educationType
          })
        }
      })
    })

    return flows
  }, [schools, students, buildings])

  useEffect(() => {
    console.log(`🎓 Education system: ${schools.length} schools, ${students.length} students`)
  }, [schools.length, students.length])

  return (
    <group ref={groupRef}>
      {/* School service area visualization */}
      {showDebug && educationBuildings.map(building => {
        const school = schools.find(s => s.buildingId === building.id)
        const serviceRange = school?.serviceRange || 15

        return (
          <group key={`education-range-${building.id}`} position={[building.position.x, 0.1, building.position.z]}>
            <mesh>
              <cylinderGeometry args={[serviceRange, serviceRange, 0.1, 16]} />
              <meshLambertMaterial 
                color="#4ade80"
                transparent
                opacity={0.1}
              />
            </mesh>
            <lineSegments>
              <ringGeometry args={[serviceRange - 0.5, serviceRange, 16]} />
              <lineBasicMaterial color="#4ade80" />
            </lineSegments>
          </group>
        )
      })}

      {/* Student flow visualization */}
      {showDebug && studentFlows.map((flow, index) => {
        const midpoint = new THREE.Vector3().addVectors(flow.from, flow.to).multiplyScalar(0.5)
        const distance = flow.from.distanceTo(flow.to)
        const angle = Math.atan2(flow.to.x - flow.from.x, flow.to.z - flow.from.z)

        return (
          <group key={`student-flow-${index}`}>
            {/* Student flow line */}
            <mesh 
              position={[midpoint.x, 1, midpoint.z]}
              rotation={[0, angle, 0]}
              scale={[0.1, 0.1, distance]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial 
                color={
                  flow.schoolType === 'primary' ? '#60a5fa' :
                  flow.schoolType === 'secondary' ? '#34d399' :
                  flow.schoolType === 'university' ? '#f59e0b' :
                  '#8b5cf6'
                }
                transparent
                opacity={0.6}
              />
            </mesh>

            {/* Student count indicator */}
            <mesh position={[midpoint.x, 2, midpoint.z]}>
              <sphereGeometry args={[Math.min(0.5, 0.1 + flow.studentCount * 0.05), 8, 6]} />
              <meshBasicMaterial 
                color="#ffffff"
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>
        )
      })}

      {/* Education statistics visualization */}
      {educationBuildings.map(building => {
        const school = schools.find(s => s.buildingId === building.id)
        if (!school) return null

        const capacity = getSchoolCapacity(school.id)
        const enrollment = students.filter(s => s.schoolId === school.id).length
        const utilizationRate = capacity > 0 ? enrollment / capacity : 0

        return (
          <group key={`education-stats-${building.id}`} position={[building.position.x, 6, building.position.z]}>
            {/* Capacity indicator */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.3, 0.3, utilizationRate * 2, 8]} />
              <meshBasicMaterial 
                color={
                  utilizationRate > 0.9 ? '#ef4444' :
                  utilizationRate > 0.7 ? '#f59e0b' :
                  '#10b981'
                }
              />
            </mesh>

            {/* Education level indicator */}
            <mesh position={[0, 2, 0]}>
              <boxGeometry args={[0.4, 0.1, 0.4]} />
              <meshBasicMaterial 
                color={
                  school.educationType === 'primary' ? '#3b82f6' :
                  school.educationType === 'secondary' ? '#10b981' :
                  school.educationType === 'university' ? '#f59e0b' :
                  '#8b5cf6'
                }
              />
            </mesh>

            {/* Quality indicator */}
            <mesh position={[1, 1, 0]}>
              <sphereGeometry args={[0.1 + school.quality * 0.2, 8, 6]} />
              <meshBasicMaterial 
                color="#fbbf24"
                transparent
                opacity={school.quality}
              />
            </mesh>
          </group>
        )
      })}

      {/* Graduation ceremony effects */}
      {students.filter(s => s.isGraduating).map(student => {
        const school = schools.find(s => s.id === student.schoolId)
        const schoolBuilding = school ? buildings.find(b => b.id === school.buildingId) : null
        
        if (!schoolBuilding) return null

        return (
          <group key={`graduation-${student.id}`} position={[schoolBuilding.position.x, 5, schoolBuilding.position.z]}>
            <mesh>
              <sphereGeometry args={[0.5, 8, 6]} />
              <meshBasicMaterial 
                color="#ffd700"
                transparent
                opacity={0.7}
              />
            </mesh>
            {/* Sparkle effect */}
            {[...Array(6)].map((_, i) => (
              <mesh 
                key={i}
                position={[
                  Math.cos(i / 6 * Math.PI * 2) * 2,
                  Math.sin(gameTime * 3 + i) * 0.5,
                  Math.sin(i / 6 * Math.PI * 2) * 2
                ]}
              >
                <sphereGeometry args={[0.1, 4, 3]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            ))}
          </group>
        )
      })}

      {/* Educational achievement indicators */}
      {schools.filter(s => s.achievements.length > 0).map(school => {
        const schoolBuilding = buildings.find(b => b.id === school.buildingId)
        if (!schoolBuilding) return null

        return (
          <group key={`achievements-${school.id}`} position={[schoolBuilding.position.x, 8, schoolBuilding.position.z]}>
            {school.achievements.slice(0, 3).map((achievement, index) => (
              <mesh 
                key={achievement.id}
                position={[index * 0.5 - 0.5, 0, 0]}
                rotation={[0, gameTime * 2, 0]}
              >
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
            ))}
          </group>
        )
      })}

      {/* Education demand visualization */}
      {showDebug && (
        <group>
          {buildings.filter(b => b.zoneType === 'residential' && b.status === 'operational').map(building => {
            const demand = getEducationDemand(building.position.x, building.position.z)
            
            if (demand.total === 0) return null

            return (
              <group key={`edu-demand-${building.id}`} position={[building.position.x, 3, building.position.z]}>
                <mesh>
                  <cylinderGeometry args={[0.5, 0.5, demand.total * 0.1, 6]} />
                  <meshBasicMaterial 
                    color="#3b82f6"
                    transparent
                    opacity={0.6}
                  />
                </mesh>
              </group>
            )
          })}
        </group>
      )}
    </group>
  )
}
