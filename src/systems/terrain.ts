import * as THREE from 'three'
import { Building } from '../types/buildings'
import { Agent } from '../types/agents'
import { MathUtils } from '../utils/mathUtils'
import { TERRAIN_CONFIG } from '../utils/gameConstants'

export interface TerrainCell {
  x: number
  z: number
  elevation: number
  baseValue: number
  currentValue: number
  pollution: number
  noise: number
  traffic: number
  waterDistance: number
  scenicValue: number
  soilQuality: number
  developmentCost: number
  isWater: boolean
  isProtected: boolean
  zoneRestrictions: string[]
  lastUpdated: number
}

export interface EnvironmentalFactor {
  type: 'pollution' | 'noise' | 'traffic' | 'scenic' | 'water'
  source: THREE.Vector3
  intensity: number
  radius: number
  falloffType: 'linear' | 'exponential' | 'logarithmic'
}

export interface TerrainAnalysis {
  averageValue: number
  maxValue: number
  minValue: number
  developmentSuitability: Record<string, number>
  environmentalHealth: number
  pollution: number
  averageElevation: number
  waterCoverage: number
}

export class TerrainSystem {
  private terrainCells: Map<string, TerrainCell>
  private environmentalFactors: EnvironmentalFactor[]
  private waterBodies: THREE.Vector3[][]
  private protectedAreas: Array<{ center: THREE.Vector3, radius: number, type: string }>
  
  private worldSize: number
  private cellSize: number
  private gridWidth: number
  private gridHeight: number
  
  // Performance optimization
  private updateQueue: Set<string>
  private lastGlobalUpdate: number
  private pollutionSpreadCache: Map<string, number>
  private noiseCache: Map<string, number>

  constructor(worldSize: number, cellSize: number = 2) {
    this.worldSize = worldSize
    this.cellSize = cellSize
    this.gridWidth = Math.ceil(worldSize / cellSize)
    this.gridHeight = Math.ceil(worldSize / cellSize)
    
    this.terrainCells = new Map()
    this.environmentalFactors = []
    this.waterBodies = []
    this.protectedAreas = []
    this.updateQueue = new Set()
    this.lastGlobalUpdate = 0
    this.pollutionSpreadCache = new Map()
    this.noiseCache = new Map()
    
    this.initializeTerrain()
    console.log(`🌍 Terrain system initialized: ${this.gridWidth}x${this.gridHeight} cells`)
  }

  private initializeTerrain(): void {
    const halfSize = this.worldSize / 2
    
    // Generate realistic terrain with multiple octaves of noise
    for (let x = 0; x < this.gridWidth; x++) {
      for (let z = 0; z < this.gridHeight; z++) {
        const worldX = -halfSize + (x + 0.5) * this.cellSize
        const worldZ = -halfSize + (z + 0.5) * this.cellSize
        
        const elevation = this.generateElevation(worldX, worldZ)
        const soilQuality = this.generateSoilQuality(worldX, worldZ, elevation)
        
        const cell: TerrainCell = {
          x: worldX,
          z: worldZ,
          elevation,
          baseValue: 0.5, // Will be calculated based on factors
          currentValue: 0.5,
          pollution: 0,
          noise: 0,
          traffic: 0,
          waterDistance: Infinity,
          scenicValue: 0,
          soilQuality,
          developmentCost: this.calculateBaseDevelopmentCost(elevation, soilQuality),
          isWater: false,
          isProtected: false,
          zoneRestrictions: [],
          lastUpdated: 0
        }
        
        const key = this.getCellKey(worldX, worldZ)
        this.terrainCells.set(key, cell)
      }
    }
    
    // Generate water bodies
    this.generateWaterBodies()
    
    // Generate protected areas
    this.generateProtectedAreas()
    
    // Calculate initial terrain values
    this.updateAllTerrainValues()
    
    console.log(`✅ Generated ${this.terrainCells.size} terrain cells with ${this.waterBodies.length} water bodies`)
  }

  private generateElevation(x: number, z: number): number {
    // Multi-octave noise for realistic terrain
    let elevation = 0
    let amplitude = 1
    let frequency = 0.01
    
    for (let i = 0; i < 4; i++) {
      elevation += Math.sin(x * frequency) * Math.cos(z * frequency) * amplitude
      elevation += Math.sin(x * frequency * 0.7 + z * frequency * 1.3) * amplitude * 0.5
      
      amplitude *= 0.5
      frequency *= 2
    }
    
    // Add some larger terrain features
    elevation += Math.sin(x * 0.003) * Math.cos(z * 0.003) * 8
    elevation += Math.sin(x * 0.001 + z * 0.001) * 12
    
    // Ensure positive elevation with some variation
    return Math.max(0, elevation + 5 + Math.random() * 2)
  }

  private generateSoilQuality(x: number, z: number, elevation: number): number {
    // Soil quality based on elevation and location
    let quality = 0.7
    
    // Better soil at moderate elevations
    const optimalElevation = 8
    const elevationFactor = 1 - Math.abs(elevation - optimalElevation) / optimalElevation
    quality += elevationFactor * 0.2
    
    // Add some randomness and patterns
    quality += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 0.15
    quality += (Math.random() - 0.5) * 0.2
    
    return Math.max(0.1, Math.min(1, quality))
  }

  private generateWaterBodies(): void {
    // Generate a main river
    const riverPoints: THREE.Vector3[] = []
    const riverLength = 50
    let riverX = -this.worldSize / 2 + 20
    let riverZ = -this.worldSize / 2
    
    for (let i = 0; i <= riverLength; i++) {
      const t = i / riverLength
      riverX += (Math.random() - 0.5) * 4
      riverZ += this.worldSize / riverLength
      
      riverPoints.push(new THREE.Vector3(riverX, 0, riverZ))
    }
    
    this.waterBodies.push(riverPoints)
    
    // Generate several lakes
    const lakeCount = 3 + Math.floor(Math.random() * 3)
    
    for (let i = 0; i < lakeCount; i++) {
      const lakeCenter = new THREE.Vector3(
        (Math.random() - 0.5) * this.worldSize * 0.8,
        0,
        (Math.random() - 0.5) * this.worldSize * 0.8
      )
      
      const lakeRadius = 5 + Math.random() * 10
      const lakePoints: THREE.Vector3[] = []
      const segments = 16 + Math.floor(Math.random() * 8)
      
      for (let j = 0; j < segments; j++) {
        const angle = (j / segments) * Math.PI * 2
        const radius = lakeRadius * (0.8 + Math.random() * 0.4)
        const point = new THREE.Vector3(
          lakeCenter.x + Math.cos(angle) * radius,
          0,
          lakeCenter.z + Math.sin(angle) * radius
        )
        lakePoints.push(point)
      }
      
      this.waterBodies.push(lakePoints)
    }
    
    // Mark water cells and calculate distances
    this.updateWaterDistances()
  }

  private generateProtectedAreas(): void {
    // Generate some protected natural areas
    const protectedCount = 2 + Math.floor(Math.random() * 2)
    
    for (let i = 0; i < protectedCount; i++) {
      const center = new THREE.Vector3(
        (Math.random() - 0.5) * this.worldSize * 0.7,
        0,
        (Math.random() - 0.5) * this.worldSize * 0.7
      )
      
      const radius = 8 + Math.random() * 12
      const type = ['forest', 'wetland', 'historic'][Math.floor(Math.random() * 3)]
      
      this.protectedAreas.push({ center, radius, type })
    }
    
    // Mark protected cells
    this.protectedAreas.forEach(area => {
      this.terrainCells.forEach(cell => {
        const distance = Math.sqrt(
          (cell.x - area.center.x) ** 2 + (cell.z - area.center.z) ** 2
        )
        
        if (distance <= area.radius) {
          cell.isProtected = true
          cell.zoneRestrictions.push('no_industrial', 'low_density_only')
        }
      })
    })
  }

  private updateWaterDistances(): void {
    this.terrainCells.forEach(cell => {
      let minDistance = Infinity
      let isWater = false
      
      // Check distance to all water bodies
      this.waterBodies.forEach(waterBody => {
        waterBody.forEach(waterPoint => {
          const distance = Math.sqrt(
            (cell.x - waterPoint.x) ** 2 + (cell.z - waterPoint.z) ** 2
          )
          
          if (distance < minDistance) {
            minDistance = distance
          }
          
          if (distance < 2) {
            isWater = true
          }
        })
      })
      
      cell.waterDistance = minDistance
      cell.isWater = isWater
      
      if (isWater) {
        cell.zoneRestrictions.push('no_building')
      }
    })
  }

  public updateTerrainValues(buildings: Building[], agents: Agent[]): void {
    const currentTime = Date.now()
    
    // Update environmental factors
    this.updateEnvironmentalFactors(buildings, agents)
    
    // Update terrain values for queued cells or all cells if enough time passed
    if (currentTime - this.lastGlobalUpdate > 30000) { // Global update every 30 seconds
      this.updateAllTerrainValues()
      this.lastGlobalUpdate = currentTime
    } else {
      this.updateQueuedCells()
    }
    
    // Clear update queue
    this.updateQueue.clear()
  }

  private updateEnvironmentalFactors(buildings: Building[], agents: Agent[]): void {
    this.environmentalFactors = []
    
    // Add pollution sources from buildings
    buildings.forEach(building => {
      if (building.status === 'operational') {
        let pollutionIntensity = 0
        let noiseIntensity = 0
        let radius = 10
        
        switch (building.zoneType) {
          case 'industrial':
            pollutionIntensity = 0.8
            noiseIntensity = 0.6
            radius = 25
            break
          case 'commercial':
            pollutionIntensity = 0.2
            noiseIntensity = 0.4
            radius = 15
            break
          case 'office':
            pollutionIntensity = 0.1
            noiseIntensity = 0.2
            radius = 10
            break
          case 'residential':
            pollutionIntensity = 0.05
            noiseIntensity = 0.1
            radius = 8
            break
        }
        
        if (pollutionIntensity > 0) {
          this.environmentalFactors.push({
            type: 'pollution',
            source: building.position,
            intensity: pollutionIntensity * (building.level || 1),
            radius,
            falloffType: 'exponential'
          })
        }
        
        if (noiseIntensity > 0) {
          this.environmentalFactors.push({
            type: 'noise',
            source: building.position,
            intensity: noiseIntensity * (building.level || 1),
            radius: radius * 0.8,
            falloffType: 'logarithmic'
          })
        }
      }
    })
    
    // Add scenic value from water bodies and protected areas
    this.waterBodies.forEach(waterBody => {
      waterBody.forEach(point => {
        this.environmentalFactors.push({
          type: 'scenic',
          source: point,
          intensity: 0.6,
          radius: 20,
          falloffType: 'linear'
        })
      })
    })
    
    this.protectedAreas.forEach(area => {
      this.environmentalFactors.push({
        type: 'scenic',
        source: area.center,
        intensity: 0.8,
        radius: area.radius * 1.5,
        falloffType: 'linear'
      })
    })
  }

  private updateAllTerrainValues(): void {
    this.terrainCells.forEach((cell, key) => {
      this.calculateCellValue(cell)
      this.updateQueue.add(key)
    })
  }

  private updateQueuedCells(): void {
    this.updateQueue.forEach(key => {
      const cell = this.terrainCells.get(key)
      if (cell) {
        this.calculateCellValue(cell)
      }
    })
  }

  private calculateCellValue(cell: TerrainCell): void {
    let value = cell.baseValue
    
    // Water proximity bonus
    if (cell.waterDistance < 50 && !cell.isWater) {
      const waterBonus = Math.max(0, (50 - cell.waterDistance) / 50) * TERRAIN_CONFIG.WATER_PROXIMITY_BONUS
      value += waterBonus
    }
    
    // Elevation factor (moderate elevation is preferred)
    const optimalElevation = 10
    const elevationDifference = Math.abs(cell.elevation - optimalElevation)
    const elevationFactor = Math.max(0, 1 - elevationDifference / optimalElevation) * TERRAIN_CONFIG.ELEVATION_FACTOR
    value += elevationFactor
    
    // Environmental factors
    let pollution = 0
    let noise = 0
    let scenic = 0
    
    this.environmentalFactors.forEach(factor => {
      const distance = Math.sqrt(
        (cell.x - factor.source.x) ** 2 + (cell.z - factor.source.z) ** 2
      )
      
      if (distance <= factor.radius) {
        const falloff = this.calculateFalloff(distance, factor.radius, factor.falloffType)
        const impact = factor.intensity * falloff
        
        switch (factor.type) {
          case 'pollution':
            pollution += impact
            break
          case 'noise':
            noise += impact
            break
          case 'scenic':
            scenic += impact
            break
        }
      }
    })
    
    // Apply environmental effects
    value -= pollution * TERRAIN_CONFIG.POLLUTION_PENALTY
    value -= noise * TERRAIN_CONFIG.NOISE_PENALTY
    value += scenic * TERRAIN_CONFIG.SCENIC_BONUS
    
    // Soil quality factor
    value += (cell.soilQuality - 0.5) * 0.2
    
    // Protected area bonus
    if (cell.isProtected) {
      value += 0.15
    }
    
    // Update cell values
    cell.pollution = pollution
    cell.noise = noise
    cell.scenicValue = scenic
    cell.currentValue = Math.max(0, Math.min(1, value))
    cell.lastUpdated = Date.now()
    
    // Update development cost based on terrain factors
    cell.developmentCost = this.calculateDevelopmentCost(cell)
  }

  private calculateFalloff(distance: number, radius: number, type: string): number {
    const normalizedDistance = distance / radius
    
    switch (type) {
      case 'linear':
        return Math.max(0, 1 - normalizedDistance)
      case 'exponential':
        return Math.exp(-normalizedDistance * 3)
      case 'logarithmic':
        return Math.max(0, 1 - Math.log(1 + normalizedDistance * 2) / Math.log(3))
      default:
        return Math.max(0, 1 - normalizedDistance)
    }
  }

  private calculateBaseDevelopmentCost(elevation: number, soilQuality: number): number {
    let cost = 1000 // Base cost per cell
    
    // Higher cost for extreme elevations
    if (elevation > 15) {
      cost *= 1 + (elevation - 15) * 0.1
    }
    
    // Higher cost for poor soil
    cost *= 2 - soilQuality
    
    return cost
  }

  private calculateDevelopmentCost(cell: TerrainCell): number {
    let cost = this.calculateBaseDevelopmentCost(cell.elevation, cell.soilQuality)
    
    // Pollution cleanup costs
    if (cell.pollution > 0.1) {
      cost *= 1 + cell.pollution
    }
    
    // Water access reduces costs slightly
    if (cell.waterDistance < 10) {
      cost *= 0.95
    }
    
    // Protected areas have additional regulatory costs
    if (cell.isProtected) {
      cost *= 1.5
    }
    
    return cost
  }

  public updateEnvironmentalFactors(deltaTime: number): void {
    // Simulate pollution spread
    this.spreadPollution(deltaTime)
    
    // Update water quality
    this.updateWaterQuality(deltaTime)
    
    // Natural recovery of terrain
    this.naturalRecovery(deltaTime)
  }

  private spreadPollution(deltaTime: number): void {
    const spreadRate = deltaTime * 0.1 // Pollution spreads slowly
    const newPollutionMap = new Map<string, number>()
    
    this.terrainCells.forEach((cell, key) => {
      if (cell.pollution > 0.05) {
        // Spread pollution to adjacent cells
        const neighbors = this.getNeighborCells(cell.x, cell.z)
        const spreadAmount = cell.pollution * spreadRate / neighbors.length
        
        neighbors.forEach(neighbor => {
          const neighborKey = this.getCellKey(neighbor.x, neighbor.z)
          const currentSpread = newPollutionMap.get(neighborKey) || 0
          newPollutionMap.set(neighborKey, currentSpread + spreadAmount)
        })
      }
    })
    
    // Apply pollution spread
    newPollutionMap.forEach((amount, key) => {
      const cell = this.terrainCells.get(key)
      if (cell && !cell.isWater) {
        cell.pollution = Math.min(1, cell.pollution + amount)
        this.updateQueue.add(key)
      }
    })
  }

  private updateWaterQuality(deltaTime: number): void {
    // Water bodies filter pollution from adjacent cells
    this.waterBodies.forEach(waterBody => {
      waterBody.forEach(waterPoint => {
        const nearbyCells = this.getCellsInRadius(waterPoint, 5)
        
        nearbyCells.forEach(cell => {
          if (cell.pollution > 0) {
            const filtrationRate = deltaTime * 0.05
            cell.pollution = Math.max(0, cell.pollution - filtrationRate)
            this.updateQueue.add(this.getCellKey(cell.x, cell.z))
          }
        })
      })
    })
  }

  private naturalRecovery(deltaTime: number): void {
    const recoveryRate = deltaTime * 0.02
    
    this.terrainCells.forEach((cell, key) => {
      let changed = false
      
      // Natural pollution reduction
      if (cell.pollution > 0) {
        cell.pollution = Math.max(0, cell.pollution - recoveryRate)
        changed = true
      }
      
      // Noise naturally decreases when sources are removed
      if (cell.noise > 0.01) {
        cell.noise = Math.max(0, cell.noise - recoveryRate * 2)
        changed = true
      }
      
      if (changed) {
        this.updateQueue.add(key)
      }
    })
  }

  private getNeighborCells(x: number, z: number): TerrainCell[] {
    const neighbors: TerrainCell[] = []
    const offsets = [
      { x: -this.cellSize, z: 0 },
      { x: this.cellSize, z: 0 },
      { x: 0, z: -this.cellSize },
      { x: 0, z: this.cellSize }
    ]
    
    offsets.forEach(offset => {
      const neighborKey = this.getCellKey(x + offset.x, z + offset.z)
      const neighbor = this.terrainCells.get(neighborKey)
      if (neighbor) {
        neighbors.push(neighbor)
      }
    })
    
    return neighbors
  }

  private getCellsInRadius(center: THREE.Vector3, radius: number): TerrainCell[] {
    const cells: TerrainCell[] = []
    
    this.terrainCells.forEach(cell => {
      const distance = Math.sqrt(
        (cell.x - center.x) ** 2 + (cell.z - center.z) ** 2
      )
      
      if (distance <= radius) {
        cells.push(cell)
      }
    })
    
    return cells
  }

  private getCellKey(x: number, z: number): string {
    const gridX = Math.round(x / this.cellSize) * this.cellSize
    const gridZ = Math.round(z / this.cellSize) * this.cellSize
    return `${gridX},${gridZ}`
  }

  // Public API methods
  public getTerrainValue(x: number, z: number): number {
    const key = this.getCellKey(x, z)
    const cell = this.terrainCells.get(key)
    return cell ? cell.currentValue : 0.1
  }

  public getTerrainCell(x: number, z: number): TerrainCell | null {
    const key = this.getCellKey(x, z)
    return this.terrainCells.get(key) || null
  }

  public getDevelopmentCost(x: number, z: number): number {
    const cell = this.getTerrainCell(x, z)
    return cell ? cell.developmentCost : 1000
  }

  public canDevelop(x: number, z: number, zoneType: string): boolean {
    const cell = this.getTerrainCell(x, z)
    if (!cell) return false
    
    if (cell.isWater || cell.zoneRestrictions.includes('no_building')) {
      return false
    }
    
    if (zoneType === 'industrial' && cell.zoneRestrictions.includes('no_industrial')) {
      return false
    }
    
    return true
  }

  public analyzeArea(center: THREE.Vector3, radius: number): TerrainAnalysis {
    const cellsInArea = this.getCellsInRadius(center, radius)
    
    if (cellsInArea.length === 0) {
      return {
        averageValue: 0,
        maxValue: 0,
        minValue: 0,
        developmentSuitability: {},
        environmentalHealth: 0,
        pollution: 0,
        averageElevation: 0,
        waterCoverage: 0
      }
    }
    
    const values = cellsInArea.map(cell => cell.currentValue)
    const pollution = cellsInArea.map(cell => cell.pollution)
    const elevations = cellsInArea.map(cell => cell.elevation)
    
    const averageValue = values.reduce((sum, val) => sum + val, 0) / values.length
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const averagePollution = pollution.reduce((sum, val) => sum + val, 0) / pollution.length
    const averageElevation = elevations.reduce((sum, val) => sum + val, 0) / elevations.length
    
    const waterCells = cellsInArea.filter(cell => cell.isWater).length
    const waterCoverage = waterCells / cellsInArea.length
    
    const environmentalHealth = Math.max(0, 1 - averagePollution) * 100
    
    // Calculate development suitability for each zone type
    const zoneTypes = ['residential', 'commercial', 'industrial', 'office']
    const developmentSuitability: Record<string, number> = {}
    
    zoneTypes.forEach(zoneType => {
      const suitableCell = cellsInArea.filter(cell => this.canDevelop(cell.x, cell.z, zoneType))
      const suitability = suitableCell.length > 0 
        ? suitableCell.reduce((sum, cell) => sum + this.getZoneSuitability(cell, zoneType), 0) / suitableCell.length
        : 0
      
      developmentSuitability[zoneType] = suitability
    })
    
    return {
      averageValue,
      maxValue,
      minValue,
      developmentSuitability,
      environmentalHealth,
      pollution: averagePollution,
      averageElevation,
      waterCoverage
    }
  }

  private getZoneSuitability(cell: TerrainCell, zoneType: string): number {
    let suitability = cell.currentValue
    
    switch (zoneType) {
      case 'residential':
        suitability -= cell.pollution * 0.5
        suitability -= cell.noise * 0.3
        suitability += Math.min(0.2, (20 - cell.waterDistance) / 100)
        break
        
      case 'commercial':
        suitability += cell.traffic * 0.2
        suitability -= cell.pollution * 0.2
        break
        
      case 'industrial':
        suitability -= Math.max(0, cell.currentValue - 0.7) * 0.5
        suitability += (cell.soilQuality > 0.5 ? 0.1 : 0)
        break
        
      case 'office':
        suitability += (cell.currentValue > 0.6 ? 0.2 : 0)
        suitability -= cell.pollution * 0.4
        break
    }
    
    return Math.max(0, Math.min(1, suitability))
  }

  public addWaterBody(points: THREE.Vector3[]): void {
    this.waterBodies.push(points)
    this.updateWaterDistances()
    this.updateAllTerrainValues()
  }

  public addProtectedArea(center: THREE.Vector3, radius: number, type: string): void {
    this.protectedAreas.push({ center, radius, type })
    
    // Update affected cells
    this.terrainCells.forEach((cell, key) => {
      const distance = Math.sqrt(
        (cell.x - center.x) ** 2 + (cell.z - center.z) ** 2
      )
      
      if (distance <= radius) {
        cell.isProtected = true
        cell.zoneRestrictions.push('no_industrial', 'low_density_only')
        this.updateQueue.add(key)
      }
    })
  }

  public getWaterBodies(): THREE.Vector3[][] {
    return [...this.waterBodies]
  }

  public getProtectedAreas(): Array<{ center: THREE.Vector3, radius: number, type: string }> {
    return [...this.protectedAreas]
  }

  public getTerrainStats(): {
    totalCells: number
    waterCells: number
    protectedCells: number
    averageValue: number
    averagePollution: number
    highValueCells: number
  } {
    const cells = Array.from(this.terrainCells.values())
    const totalCells = cells.length
    const waterCells = cells.filter(cell => cell.isWater).length
    const protectedCells = cells.filter(cell => cell.isProtected).length
    
    const averageValue = cells.reduce((sum, cell) => sum + cell.currentValue, 0) / totalCells
    const averagePollution = cells.reduce((sum, cell) => sum + cell.pollution, 0) / totalCells
    const highValueCells = cells.filter(cell => cell.currentValue > TERRAIN_CONFIG.WEALTH_THRESHOLDS.high).length
    
    return {
      totalCells,
      waterCells,
      protectedCells,
      averageValue,
      averagePollution,
      highValueCells
    }
  }

  public queueCellUpdate(x: number, z: number): void {
    const key = this.getCellKey(x, z)
    this.updateQueue.add(key)
  }

  public getTerrainHeightAt(x: number, z: number): number {
    const cell = this.getTerrainCell(x, z)
    return cell ? cell.elevation : 0
  }

  public dispose(): void {
    this.terrainCells.clear()
    this.environmentalFactors = []
    this.waterBodies = []
    this.protectedAreas = []
    this.updateQueue.clear()
    this.pollutionSpreadCache.clear()
    this.noiseCache.clear()
    
    console.log('🗑️ Terrain system disposed')
  }
}
