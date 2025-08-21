import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'
import { useEconomyStore } from '../../stores/economyStore'
import { useTerrainStore } from '../../stores/terrainStore'

export function EconomySystem() {
  const groupRef = useRef<THREE.Group>(null)
  const lastUpdateTime = useRef(0)
  
  const { buildings, gameTime } = useGameStore()
  const { 
    updateEconomy,
    businesses,
    createBusiness,
    updateBusiness,
    closeBusiness
  } = useEconomyStore()
  const { getTerrainValue } = useTerrainStore()

  // Update economy every game hour
  useFrame((state, delta) => {
    const currentTime = Math.floor(gameTime / 60) // Convert to hours
    
    if (currentTime !== lastUpdateTime.current) {
      lastUpdateTime.current = currentTime
      
      // Update main economy
      updateEconomy(delta)
      
      // Update individual businesses
      updateBusinesses()
      
      // Create new businesses for operational buildings without them
      createMissingBusinesses()
    }
  })

  const updateBusinesses = () => {
    businesses.forEach(business => {
      const building = buildings.find(b => b.id === business.buildingId)
      if (!building || building.status !== 'operational') {
        closeBusiness(business.id)
        return
      }

      // Calculate business performance based on location and other factors
      const terrainValue = getTerrainValue(building.position.x, building.position.z)
      const locationFactor = 0.5 + terrainValue * 0.5
      
      // Calculate foot traffic based on nearby buildings
      let footTraffic = 0
      buildings.forEach(nearbyBuilding => {
        if (nearbyBuilding.id === building.id) return
        const distance = building.position.distanceTo(nearbyBuilding.position)
        if (distance < 10) {
          if (nearbyBuilding.zoneType === 'residential') {
            footTraffic += (nearbyBuilding.residents || 0) * (1 - distance / 10) * 0.1
          }
        }
      })
      
      // Base revenue calculation
      let revenue = 0
      const currentHour = Math.floor(gameTime / 60) % 24
      
      switch (building.zoneType) {
        case 'commercial':
          // Commercial businesses earn based on foot traffic and time of day
          const commercialMultiplier = currentHour >= 9 && currentHour <= 21 ? 1.0 : 0.3
          revenue = (footTraffic * 100 + terrainValue * 500) * commercialMultiplier
          break
          
        case 'industrial':
          // Industrial businesses have steady production
          revenue = (building.capacity || 50) * 20 * (0.8 + terrainValue * 0.4)
          break
          
        case 'office':
          // Office buildings earn based on educated workforce and location
          const officeMultiplier = currentHour >= 8 && currentHour <= 18 ? 1.0 : 0.1
          revenue = (building.workers || 0) * 100 * locationFactor * officeMultiplier
          break
      }
      
      // Calculate expenses
      const baseExpenses = business.operatingCosts
      const wageExpenses = business.employees * business.wagesPerEmployee / 12 // Monthly
      const rentExpenses = business.rent
      const totalExpenses = baseExpenses + wageExpenses + rentExpenses
      
      // Calculate profit
      const profit = revenue - totalExpenses
      
      // Update business metrics
      updateBusiness(business.id, {
        revenue,
        profit,
        footTraffic: Math.min(1, footTraffic / 100),
        accessibility: locationFactor,
        prestige: terrainValue,
        efficiency: Math.max(0.1, Math.min(1.5, locationFactor + terrainValue * 0.5)),
        customerSatisfaction: Math.max(0.1, Math.min(1, 0.7 + terrainValue * 0.3 + footTraffic * 0.1)),
        daysSinceProfit: profit > 0 ? 0 : business.daysSinceProfit + 1/24,
        bankruptcyRisk: profit < -1000 ? Math.min(1, business.bankruptcyRisk + 0.01) : Math.max(0, business.bankruptcyRisk - 0.005)
      })
      
      // Close business if it's been unprofitable too long
      if (business.daysSinceProfit > 30 && business.bankruptcyRisk > 0.8) {
        console.log(`🏢 Business ${business.name} closed due to bankruptcy`)
        closeBusiness(business.id)
      }
    })
  }

  const createMissingBusinesses = () => {
    buildings.forEach(building => {
      if (building.status !== 'operational') return
      if (!building.zoneType || building.zoneType === 'residential') return
      
      // Check if business already exists for this building
      const existingBusiness = businesses.find(b => b.buildingId === building.id)
      if (existingBusiness) return
      
      // Create new business
      const businessTypes = {
        commercial: ['retail_store', 'restaurant', 'service_shop', 'entertainment'],
        industrial: ['manufacturing', 'warehouse', 'processing_plant', 'logistics'],
        office: ['consulting', 'tech_company', 'financial_services', 'corporate_office']
      }
      
      const types = businessTypes[building.zoneType as keyof typeof businessTypes]
      const businessType = types[Math.floor(Math.random() * types.length)]
      
      console.log(`🏢 Creating new business: ${businessType} in ${building.name}`)
      createBusiness(building.id, businessType)
    })
  }

  useEffect(() => {
    console.log(`💰 Economy system: ${businesses.length} businesses active`)
  }, [businesses.length])

  return (
    <group ref={groupRef}>
      {/* Economic indicators visualization */}
      {businesses.map((business, index) => {
        const building = buildings.find(b => b.id === business.buildingId)
        if (!building) return null
        
        return (
          <group key={business.id} position={[building.position.x, 4, building.position.z]}>
            {/* Profit indicator */}
            <mesh position={[0, 1, 0]}>
              <sphereGeometry args={[0.1, 8, 6]} />
              <meshBasicMaterial 
                color={business.profit > 0 ? '#00ff00' : business.profit < -500 ? '#ff0000' : '#ffff00'}
              />
            </mesh>
            
            {/* Business activity indicator */}
            {business.footTraffic > 0.5 && (
              <mesh position={[0, 1.5, 0]}>
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            )}
            
            {/* Bankruptcy warning */}
            {business.bankruptcyRisk > 0.6 && (
              <mesh position={[0, 2, 0]}>
                <boxGeometry args={[0.3, 0.1, 0.3]} />
                <meshBasicMaterial 
                  color="#ff0000"
                  transparent
                  opacity={0.5 + Math.sin(gameTime * 5) * 0.3}
                />
              </mesh>
            )}
          </group>
        )
      })}

      {/* Economic zones visualization */}
      {buildings.filter(b => b.zoneType && b.status === 'operational').map(building => {
        const terrainValue = getTerrainValue(building.position.x, building.position.z)
        
        return (
          <group key={`econ-zone-${building.id}`} position={[building.position.x, 0.1, building.position.z]}>
            {/* Economic value indicator */}
            <mesh>
              <cylinderGeometry args={[1 + terrainValue * 2, 1 + terrainValue * 2, 0.05, 8]} />
              <meshLambertMaterial 
                color={
                  building.zoneType === 'commercial' ? '#ffaa00' :
                  building.zoneType === 'industrial' ? '#aa4400' :
                  building.zoneType === 'office' ? '#0066aa' :
                  '#666666'
                }
                transparent
                opacity={0.2}
              />
            </mesh>
          </group>
        )
      })}

      {/* Trade route indicators */}
      {businesses.length > 2 && (
        <group>
          {/* Simple trade connections between industrial and commercial */}
          {businesses.filter(b => buildings.find(building => 
            building.id === b.buildingId && building.zoneType === 'industrial'
          )).slice(0, 2).map((producer, index) => {
            const producerBuilding = buildings.find(b => b.id === producer.buildingId)
            const consumer = businesses.find(b => buildings.find(building => 
              building.id === b.buildingId && building.zoneType === 'commercial'
            ))
            const consumerBuilding = consumer ? buildings.find(b => b.id === consumer.buildingId) : null
            
            if (!producerBuilding || !consumerBuilding) return null
            
            return (
              <mesh 
                key={`trade-${index}`}
                position={[
                  (producerBuilding.position.x + consumerBuilding.position.x) / 2,
                  2,
                  (producerBuilding.position.z + consumerBuilding.position.z) / 2
                ]}
                scale={[0.1, 0.1, producerBuilding.position.distanceTo(consumerBuilding.position)]}
                rotation={[0, Math.atan2(
                  consumerBuilding.position.x - producerBuilding.position.x,
                  consumerBuilding.position.z - producerBuilding.position.z
                ), 0]}
              >
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.6} />
              </mesh>
            )
          })}
        </group>
      )}
    </group>
  )
}
