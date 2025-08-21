import * as THREE from 'three'

export type ZoneType = 'residential' | 'commercial' | 'industrial' | 'office'
export type WealthLevel = 'low' | 'medium' | 'high'
export type BuildingStatus = 'planned' | 'constructing' | 'operational' | 'abandoned' | 'demolishing'
export type ServiceType = 'fire' | 'police' | 'health' | 'education' | 'power' | 'water' | 'waste' | 'transport'

export interface BuildingModule {
  id: string
  type: string
  name: string
  cost: number
  effect: Record<string, number>
  requirements?: string[]
}

export interface Building {
  id: string
  type: string
  subType?: string
  name: string
  position: THREE.Vector3
  rotation: number
  
  // Zone information
  zoneType?: ZoneType
  wealthLevel: WealthLevel
  
  // Building progression
  level: number
  maxLevel: number
  status: BuildingStatus
  constructionProgress: number
  constructionTime: number
  
  // Capacity and occupancy
  capacity: number
  residents?: number
  workers?: number
  customers?: number
  students?: number
  
  // Modules and upgrades
  modules: BuildingModule[]
  availableModules: string[]
  
  // Economic data
  operatingCost: number
  revenue: number
  property_value: number
  
  // Service range (for service buildings)
  serviceRange?: number
  serviceEfficiency?: number
  
  // Infrastructure connections
  hasRoadAccess: boolean
  hasPowerConnection: boolean
  hasWaterConnection: boolean
  hasInternetConnection: boolean
  
  // Environmental factors
  pollution: number
  noise: number
  
  // Building-specific data
  metadata?: Record<string, any>
}

export interface BuildingBlueprint {
  id: string
  name: string
  description: string
  category: string
  subcategory?: string
  
  // Visual properties
  model: string
  texture?: string
  size: { width: number, height: number, depth: number }
  
  // Requirements
  cost: number
  constructionTime: number
  terrainRequirements: {
    minValue: number
    maxSlope: number
    waterAccess?: boolean
  }
  
  // Zoning
  zoneType?: ZoneType
  allowedWealthLevels: WealthLevel[]
  
  // Capacity
  baseCapacity: number
  capacityPerLevel: number
  
  // Service properties
  serviceType?: ServiceType
  serviceRange?: number
  
  // Unlocking requirements
  unlockRequirements?: {
    population?: number
    cityLevel?: number
    achievements?: string[]
  }
}

export interface ConstructionSite {
  id: string
  buildingId: string
  blueprint: BuildingBlueprint
  position: THREE.Vector3
  rotation: number
  progress: number
  totalCost: number
  paidCost: number
  constructionSpeed: number
  workers: number
  requiredMaterials: Record<string, number>
  availableMaterials: Record<string, number>
}
