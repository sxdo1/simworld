import * as THREE from 'three'
import { Building, BuildingBlueprint, ZoneType, WealthLevel } from '../types/buildings'
import { TERRAIN_CONFIG, BUILDING_CONFIG } from './gameConstants'
import { MathUtils } from './mathUtils'

export class BuildingUtils {
  // Building placement validation
  static canPlaceBuilding(
    blueprint: BuildingBlueprint, 
    position: THREE.Vector3, 
    terrainValue: number,
    roadNetwork: THREE.Vector3[],
    existingBuildings: Building[]
  ): { canPlace: boolean, reason?: string } {
    
    // Check terrain value requirements
    if (terrainValue < blueprint.terrainRequirements.minValue) {
      return { canPlace: false, reason: 'Terrain value too low for this building type' }
    }

    // Check road access
    const hasRoadAccess = this.checkRoadAccess(position, roadNetwork)
    if (!hasRoadAccess) {
      return { canPlace: false, reason: 'Building must be adjacent to a road' }
    }

    // Check for overlapping buildings
    const overlapping = this.checkBuildingOverlap(position, blueprint, existingBuildings)
    if (overlapping) {
      return { canPlace: false, reason: 'Another building is already here' }
    }

    return { canPlace: true }
  }

  // Check if position has road access within acceptable distance
  static checkRoadAccess(position: THREE.Vector3, roadNetwork: THREE.Vector3[], maxDistance = 3): boolean {
    for (const roadPoint of roadNetwork) {
      if (MathUtils.distance2D(position, roadPoint) <= maxDistance) {
        return true
      }
    }
    return false
  }

  // Check if building would overlap with existing buildings
  static checkBuildingOverlap(position: THREE.Vector3, blueprint: BuildingBlueprint, existingBuildings: Building[]): boolean {
    const buildingBounds = {
      minX: position.x - blueprint.size.width / 2,
      maxX: position.x + blueprint.size.width / 2,
      minZ: position.z - blueprint.size.depth / 2,
      maxZ: position.z + blueprint.size.depth / 2
    }

    for (const existing of existingBuildings) {
      // Get existing building blueprint to determine size (simplified for now)
      const existingBounds = {
        minX: existing.position.x - 1,
        maxX: existing.position.x + 1,
        minZ: existing.position.z - 1,
        maxZ: existing.position.z + 1
      }

      // Check for overlap
      if (buildingBounds.minX < existingBounds.maxX &&
          buildingBounds.maxX > existingBounds.minX &&
          buildingBounds.minZ < existingBounds.maxZ &&
          buildingBounds.maxZ > existingBounds.minZ) {
        return true
      }
    }

    return false
  }

  // Calculate optimal building rotation to face nearest road
  static calculateOptimalRotation(position: THREE.Vector3, roadNetwork: THREE.Vector3[]): number {
    let nearestRoadPoint: THREE.Vector3 | null = null
    let minDistance = Infinity

    // Find nearest road point
    for (const roadPoint of roadNetwork) {
      const distance = MathUtils.distance2D(position, roadPoint)
      if (distance < minDistance) {
        minDistance = distance
        nearestRoadPoint = roadPoint
      }
    }

    if (!nearestRoadPoint) {
      return 0 // Default rotation if no roads nearby
    }

    // Calculate direction to road
    const direction = new THREE.Vector3()
      .subVectors(nearestRoadPoint, position)
      .normalize()

    return MathUtils.rotationFromDirection(direction)
  }

  // Determine appropriate wealth level based on terrain value
  static determineWealthLevel(terrainValue: number): WealthLevel {
    if (terrainValue >= TERRAIN_CONFIG.WEALTH_THRESHOLDS.high) {
      return 'high'
    } else if (terrainValue >= TERRAIN_CONFIG.WEALTH_THRESHOLDS.medium) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  // Calculate building capacity based on level and type
  static calculateCapacity(blueprint: BuildingBlueprint, level: number): number {
    return blueprint.baseCapacity + (blueprint.capacityPerLevel * (level - 1))
  }

  // Calculate construction cost including terrain factors
  static calculateConstructionCost(blueprint: BuildingBlueprint, terrainValue: number, terrainSlope: number): number {
    let cost = blueprint.cost

    // Terrain difficulty multiplier
    if (terrainSlope > 0.1) {
      cost *= 1 + terrainSlope * 2 // More expensive on slopes
    }

    // Low terrain value areas are cheaper to develop
    if (terrainValue < 0.3) {
      cost *= 0.8
    }

    return Math.round(cost)
  }

  // Generate building based on zoning and wealth level
  static generateBuildingForZone(zoneType: ZoneType, wealthLevel: WealthLevel, position: THREE.Vector3): BuildingBlueprint {
    const buildingId = `${zoneType}_${wealthLevel}`
    
    // This would normally load from a building database
    const baseBlueprint: BuildingBlueprint = {
      id: buildingId,
      name: `${wealthLevel.charAt(0).toUpperCase() + wealthLevel.slice(1)} ${zoneType.charAt(0).toUpperCase() + zoneType.slice(1)}`,
      description: `A ${wealthLevel} wealth ${zoneType} building`,
      category: zoneType,
      model: this.getModelForBuilding(zoneType, wealthLevel),
      size: this.getSizeForBuilding(zoneType, wealthLevel),
      cost: this.getCostForBuilding(zoneType, wealthLevel),
      constructionTime: BUILDING_CONFIG.CONSTRUCTION_TIME[zoneType],
      terrainRequirements: {
        minValue: TERRAIN_CONFIG.WEALTH_THRESHOLDS[wealthLevel],
        maxSlope: 0.3
      },
      zoneType,
      allowedWealthLevels: [wealthLevel],
      baseCapacity: BUILDING_CONFIG.BASE_CAPACITY[zoneType],
      capacityPerLevel: Math.floor(BUILDING_CONFIG.BASE_CAPACITY[zoneType] * 0.5)
    }

    return baseBlueprint
  }

  // Helper methods for building generation
  private static getModelForBuilding(zoneType: ZoneType, wealthLevel: WealthLevel): string {
    return `${zoneType}_${wealthLevel}_01` // Reference to 3D model
  }

  private static getSizeForBuilding(zoneType: ZoneType, wealthLevel: WealthLevel): { width: number, height: number, depth: number } {
    const baseSizes = {
      residential: { width: 2, height: 3, depth: 2 },
      commercial: { width: 3, height: 4, depth: 3 },
      industrial: { width: 4, height: 5, depth: 4 },
      office: { width: 3, height: 6, depth: 3 }
    }

    const wealthMultipliers = {
      low: 1.0,
      medium: 1.3,
      high: 1.8
    }

    const baseSize = baseSizes[zoneType]
    const multiplier = wealthMultipliers[wealthLevel]

    return {
      width: baseSize.width * multiplier,
      height: baseSize.height * multiplier,
      depth: baseSize.depth * multiplier
    }
  }

  private static getCostForBuilding(zoneType: ZoneType, wealthLevel: WealthLevel): number {
    const buildingKey = `${zoneType}_${wealthLevel}` as keyof typeof BUILDING_CONFIG.CONSTRUCTION_TIME
    return (BUILDING_CONFIG as any).BUILDING_COSTS?.[buildingKey] || 10000
  }

  // Calculate property value based on various factors
  static calculatePropertyValue(
    building: Building, 
    terrainValue: number, 
    nearbyBuildings: Building[],
    infrastructure: { hasUtilities: boolean, transitAccess: boolean }
  ): number {
    
    let baseValue = 50000 // Base property value

    // Terrain value factor
    baseValue *= (1 + terrainValue)

    // Building level factor
    baseValue *= (1 + building.level * 0.2)

    // Wealth level factor
    const wealthMultipliers = { low: 0.8, medium: 1.2, high: 2.0 }
    baseValue *= wealthMultipliers[building.wealthLevel]

    // Infrastructure bonuses
    if (infrastructure.hasUtilities) baseValue *= 1.2
    if (infrastructure.transitAccess) baseValue *= 1.15

    // Nearby building effects
    let neighborBonus = 0
    for (const nearby of nearbyBuildings) {
      const distance = MathUtils.distance2D(building.position, nearby.position)
      if (distance < 10) {
        // Similar wealth levels boost each other
        if (nearby.wealthLevel === building.wealthLevel) {
          neighborBonus += 0.05
        }
        // High wealth buildings boost nearby properties
        if (nearby.wealthLevel === 'high') {
          neighborBonus += 0.03
        }
      }
    }

    baseValue *= (1 + Math.min(neighborBonus, 0.5)) // Cap bonus at 50%

    return Math.round(baseValue)
  }
}
