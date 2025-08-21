import { create } from 'zustand'
import * as THREE from 'three'
import { MathUtils } from '../utils/mathUtils'
import { TERRAIN_CONFIG } from '../utils/gameConstants'

interface TerrainCell {
  x: number
  z: number
  elevation: number
  terrainValue: number
  pollution: number
  noise: number
  waterDistance: number
  isWater: boolean
  hasRoad: boolean
  zoneType?: string
  developmentPressure: number
}

interface TerrainStore {
  // Terrain data
  terrainCells: Map<string, TerrainCell>
  waterBodies: THREE.Vector3[][]
  terrainSize: number
  cellSize: number
  isInitialized: boolean
  
  // Actions
  initializeTerrain: () => void
  updateTerrainValue: (x: number, z: number, factors: Partial<TerrainCell>) => void
  getTerrainValue: (x: number, z: number) => number
  getTerrainCell: (x: number, z: number) => TerrainCell | null
  addWaterBody: (points: THREE.Vector3[]) => void
  calculateDevelopmentPressure: () => void
  getZoningSuitability: (x: number, z: number, zoneType: string) => number
  
  // Terrain analysis
  analyzeArea: (center: THREE.Vector3, radius: number) => {
    averageValue: number
    maxValue: number
    minValue: number
    developmentSuitability: Record<string, number>
  }
}

export const useTerrainStore = create<TerrainStore>((set, get) => ({
  terrainCells: new Map(),
  waterBodies: [],
  terrainSize: 200, // 200x200 world
  cellSize: 2, // Each cell represents 2x2 units
  isInitialized: false,

  initializeTerrain: () => {
    console.log('🌍 Initializing terrain system...')
    
    const { terrainSize, cellSize } = get()
    const terrainCells = new Map<string, TerrainCell>()
    
    // Generate initial terrain with realistic features
    const halfSize = terrainSize / 2
    
    // Add some water bodies first
    const riverPoints: THREE.Vector3[] = []
    for (let i = 0; i < 20; i++) {
      const t = i / 19
      const x = -halfSize + (Math.sin(t * Math.PI * 2) * 15) + (t * terrainSize * 0.7)
      const z = Math.cos(t * Math.PI * 3) * 8
      riverPoints.push(new THREE.Vector3(x, 0, z))
    }
    
    const lake1: THREE.Vector3[] = []
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2
      const radius = 8 + Math.random() * 3
      const x = 25 + Math.cos(angle) * radius
      const z = 15 + Math.sin(angle) * radius
      lake1.push(new THREE.Vector3(x, 0, z))
    }
    
    const waterBodies = [riverPoints, lake1]
    
    // Generate terrain cells
    for (let x = -halfSize; x < halfSize; x += cellSize) {
      for (let z = -halfSize; z < halfSize; z += cellSize) {
        const key = `${x},${z}`
        
        // Calculate base elevation using Perlin-like noise simulation
        const elevation = get().calculateElevation(x, z)
        
        // Calculate distance to nearest water
        let waterDistance = Infinity
        let isWater = false
        
        for (const waterBody of waterBodies) {
          for (const waterPoint of waterBody) {
            const distance = MathUtils.distance2D(new THREE.Vector3(x, 0, z), waterPoint)
            if (distance < waterDistance) {
              waterDistance = distance
            }
            if (distance < 3) {
              isWater = true
            }
          }
        }
        
        // Calculate terrain value based on multiple factors
        const terrainValue = MathUtils.calculateTerrainValue(
          new THREE.Vector3(x, elevation, z),
          {
            waterDistance,
            elevation,
            pollution: 0,
            noise: 0,
            scenic: get().calculateScenicValue(x, z, elevation, waterDistance)
          }
        )
        
        const cell: TerrainCell = {
          x,
          z,
          elevation,
          terrainValue,
          pollution: 0,
          noise: 0,
          waterDistance,
          isWater,
          hasRoad: false,
          developmentPressure: 0
        }
        
        terrainCells.set(key, cell)
      }
    }
    
    console.log(`✅ Generated ${terrainCells.size} terrain cells`)
    
    set({
      terrainCells,
      waterBodies,
      isInitialized: true
    })
  },

  updateTerrainValue: (x: number, z: number, factors: Partial<TerrainCell>) => {
    const key = `${Math.round(x / get().cellSize) * get().cellSize},${Math.round(z / get().cellSize) * get().cellSize}`
    const currentCell = get().terrainCells.get(key)
    
    if (!currentCell) return
    
    const updatedCell = { ...currentCell, ...factors }
    
    // Recalculate terrain value if relevant factors changed
    if (factors.pollution !== undefined || factors.noise !== undefined) {
      updatedCell.terrainValue = MathUtils.calculateTerrainValue(
        new THREE.Vector3(x, updatedCell.elevation, z),
        {
          waterDistance: updatedCell.waterDistance,
          elevation: updatedCell.elevation,
          pollution: updatedCell.pollution,
          noise: updatedCell.noise,
          scenic: get().calculateScenicValue(x, z, updatedCell.elevation, updatedCell.waterDistance)
        }
      )
    }
    
    const newTerrainCells = new Map(get().terrainCells)
    newTerrainCells.set(key, updatedCell)
    
    set({ terrainCells: newTerrainCells })
  },

  getTerrainValue: (x: number, z: number) => {
    const cell = get().getTerrainCell(x, z)
    return cell ? cell.terrainValue : 0.1
  },

  getTerrainCell: (x: number, z: number) => {
    const { cellSize } = get()
    const key = `${Math.round(x / cellSize) * cellSize},${Math.round(z / cellSize) * cellSize}`
    return get().terrainCells.get(key) || null
  },

  addWaterBody: (points: THREE.Vector3[]) => {
    const waterBodies = [...get().waterBodies, points]
    set({ waterBodies })
    
    // Update terrain values for cells near the new water body
    const { terrainCells, cellSize } = get()
    const updatedCells = new Map(terrainCells)
    
    terrainCells.forEach((cell, key) => {
      let minDistance = cell.waterDistance
      for (const point of points) {
        const distance = MathUtils.distance2D(new THREE.Vector3(cell.x, 0, cell.z), point)
        if (distance < minDistance) {
          minDistance = distance
        }
      }
      
      if (minDistance < cell.waterDistance) {
        const updatedCell = { ...cell, waterDistance: minDistance }
        updatedCell.terrainValue = MathUtils.calculateTerrainValue(
          new THREE.Vector3(cell.x, cell.elevation, cell.z),
          {
            waterDistance: minDistance,
            elevation: cell.elevation,
            pollution: cell.pollution,
            noise: cell.noise,
            scenic: get().calculateScenicValue(cell.x, cell.z, cell.elevation, minDistance)
          }
        )
        updatedCells.set(key, updatedCell)
      }
    })
    
    set({ terrainCells: updatedCells })
  },

  calculateDevelopmentPressure: () => {
    const { terrainCells } = get()
    const updatedCells = new Map(terrainCells)
    
    // Calculate development pressure based on nearby development and demand
    terrainCells.forEach((cell, key) => {
      let pressure = 0
      
      // Base pressure from terrain value (higher value = more pressure)
      pressure += cell.terrainValue * 0.3
      
      // Pressure from road access
      if (cell.hasRoad) {
        pressure += 0.4
      }
      
      // Check nearby development within 10 units
      const cellPos = new THREE.Vector3(cell.x, 0, cell.z)
      terrainCells.forEach(nearbyCell => {
        if (nearbyCell === cell) return
        
        const distance = MathUtils.distance2D(cellPos, new THREE.Vector3(nearbyCell.x, 0, nearbyCell.z))
        if (distance < 10 && nearbyCell.zoneType) {
          pressure += 0.1 * (1 - distance / 10) // Closer = more pressure
        }
      })
      
      const updatedCell = { ...cell, developmentPressure: Math.min(1, pressure) }
      updatedCells.set(key, updatedCell)
    })
    
    set({ terrainCells: updatedCells })
  },

  getZoningSuitability: (x: number, z: number, zoneType: string) => {
    const cell = get().getTerrainCell(x, z)
    if (!cell) return 0
    
    let suitability = cell.terrainValue
    
    // Zone-specific adjustments
    switch (zoneType) {
      case 'residential':
        // Prefer areas away from industry and noise
        suitability -= cell.pollution * 0.5
        suitability -= cell.noise * 0.3
        suitability += Math.min(0.2, (20 - cell.waterDistance) / 100) // Water proximity bonus
        break
        
      case 'commercial':
        // Prefer accessible areas with good terrain value
        if (cell.hasRoad) suitability += 0.2
        suitability += cell.developmentPressure * 0.3
        break
        
      case 'industrial':
        // Less affected by pollution, prefer flat areas and transport access
        suitability += 0.1 // Base industrial bonus
        if (cell.hasRoad) suitability += 0.3
        suitability -= Math.max(0, cell.terrainValue - 0.7) * 0.5 // Don't use prime land
        break
        
      case 'office':
        // Prefer high-value areas with good access
        if (cell.terrainValue > 0.6) suitability += 0.2
        if (cell.hasRoad) suitability += 0.2
        suitability -= cell.pollution * 0.4
        break
    }
    
    return Math.max(0, Math.min(1, suitability))
  },

  analyzeArea: (center: THREE.Vector3, radius: number) => {
    const { terrainCells } = get()
    const cellsInArea: TerrainCell[] = []
    
    terrainCells.forEach(cell => {
      const distance = MathUtils.distance2D(center, new THREE.Vector3(cell.x, 0, cell.z))
      if (distance <= radius) {
        cellsInArea.push(cell)
      }
    })
    
    if (cellsInArea.length === 0) {
      return {
        averageValue: 0,
        maxValue: 0,
        minValue: 0,
        developmentSuitability: {}
      }
    }
    
    const values = cellsInArea.map(cell => cell.terrainValue)
    const averageValue = values.reduce((sum, val) => sum + val, 0) / values.length
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    
    // Calculate development suitability for each zone type
    const zoneTypes = ['residential', 'commercial', 'industrial', 'office']
    const developmentSuitability: Record<string, number> = {}
    
    for (const zoneType of zoneTypes) {
      const suitabilityValues = cellsInArea.map(cell => 
        get().getZoningSuitability(cell.x, cell.z, zoneType)
      )
      developmentSuitability[zoneType] = suitabilityValues.reduce((sum, val) => sum + val, 0) / suitabilityValues.length
    }
    
    return {
      averageValue,
      maxValue,
      minValue,
      developmentSuitability
    }
  },

  // Helper methods (would be private in a class)
  calculateElevation: (x: number, z: number) => {
    // Simplified elevation calculation using sine waves for varied terrain
    const scale1 = 0.02
    const scale2 = 0.008
    const scale3 = 0.05
    
    let elevation = 0
    elevation += Math.sin(x * scale1) * 3
    elevation += Math.sin(z * scale1) * 2
    elevation += Math.sin(x * scale2 + z * scale2) * 5
    elevation += Math.sin(x * scale3) * Math.sin(z * scale3) * 1.5
    elevation += Math.random() * 0.5 - 0.25 // Small random variation
    
    return Math.max(0, elevation + 2) // Keep elevation positive
  },

  calculateScenicValue: (x: number, z: number, elevation: number, waterDistance: number) => {
    let scenic = 0
    
    // Higher elevation provides better views
    scenic += Math.min(0.3, elevation / 20)
    
    // Water views add scenic value
    if (waterDistance < 20) {
      scenic += Math.max(0, (20 - waterDistance) / 20) * 0.4
    }
    
    // Distance from center (assume city center is at origin)
    const centerDistance = Math.sqrt(x * x + z * z)
    if (centerDistance > 30) {
      scenic += 0.1 // Rural areas more scenic
    }
    
    return Math.max(0, Math.min(1, scenic))
  }
}))
