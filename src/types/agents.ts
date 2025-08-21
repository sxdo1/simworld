import * as THREE from 'three'

export type AgentType = 'citizen' | 'vehicle' | 'resource' | 'service'
export type CitizenAge = 'child' | 'adult' | 'elderly'
export type VehicleType = 'car' | 'bus' | 'truck' | 'emergency' | 'service'
export type EducationLevel = 'none' | 'primary' | 'secondary' | 'university' | 'advanced'
export type EmploymentStatus = 'unemployed' | 'employed' | 'student' | 'retired'
export type HousingStatus = 'homeless' | 'housed' | 'temporary'

export interface CitizenStatus {
  education: EducationLevel
  employment: EmploymentStatus
  housing: HousingStatus
  wealth: WealthLevel
  health: number
  happiness: number
  age: CitizenAge
}

export interface Agent {
  id: string
  type: AgentType
  
  // Physical properties
  position: THREE.Vector3
  rotation: number
  velocity: THREE.Vector3
  speed: number
  
  // Navigation
  destination?: THREE.Vector3
  path?: THREE.Vector3[]
  currentPathIndex: number
  isMoving: boolean
  
  // Status and attributes
  status: CitizenStatus
  
  // Relationships and locations
  homeId?: string
  workplaceId?: string
  schoolId?: string
  
  // Daily schedule
  schedule: DailyActivity[]
  currentActivity?: DailyActivity
  
  // Needs and behaviors
  needs: Record<string, number>
  personality: Record<string, number>
  
  // Economic data
  income: number
  expenses: number
  savings: number
  
  // Vehicle-specific data (if applicable)
  vehicleData?: VehicleData
  
  // Resource-specific data (if applicable)
  resourceData?: ResourceData
}

export interface DailyActivity {
  type: 'work' | 'education' | 'shopping' | 'recreation' | 'sleep' | 'commute'
  startTime: number
  endTime: number
  locationId?: string
  priority: number
}

export interface VehicleData {
  vehicleType: VehicleType
  capacity: number
  currentLoad: number
  fuel: number
  condition: number
  ownerId?: string
  passengers: string[]
  cargo?: ResourceData[]
}

export interface ResourceData {
  resourceType: string
  quantity: number
  quality: number
  destination?: string
  origin?: string
  value: number
}

export interface CitizenBehavior {
  // Movement patterns
  preferredTransportation: VehicleType[]
  walkingSpeed: number
  patience: number
  
  // Economic behavior
  spendingHabits: Record<string, number>
  savingsRate: number
  jobSeeking: boolean
  
  // Social behavior
  socialNeeds: number
  communityParticipation: number
  crimeTendency: number
  
  // Education behavior
  learningMotivation: number
  skillDevelopment: Record<string, number>
}

export type WealthLevel = 'low' | 'medium' | 'high'
