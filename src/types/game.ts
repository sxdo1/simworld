import * as THREE from 'three'

export type GameMode = 'sandbox' | 'scenario' | 'multiplayer'
export type GameSpeed = 'paused' | 'slow' | 'normal' | 'fast' | 'ultra'
export type SimulationPhase = 'day' | 'night'
export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog'

export interface GameState {
  mode: GameMode
  speed: GameSpeed
  phase: SimulationPhase
  weather: WeatherType
  gameTime: number
  realTime: number
  dayCount: number
  isInitialized: boolean
  isPaused: boolean
  selectedTool: string | null
  selectedBuilding: string | null
  showDebug: boolean
  cameraPosition: THREE.Vector3
  cameraTarget: THREE.Vector3
}

export interface CityStats {
  name: string
  population: number
  happiness: number
  employment: number
  education: number
  health: number
  safety: number
  environment: number
  traffic: number
  powerUsage: number
  waterUsage: number
  wasteGeneration: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  category: 'population' | 'construction' | 'education' | 'economy' | 'environment'
  requirement: number
  currentProgress: number
  isUnlocked: boolean
  reward?: {
    type: 'funds' | 'loan_limit' | 'unlock'
    value: number | string
  }
}
