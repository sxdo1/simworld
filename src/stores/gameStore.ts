import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import * as THREE from 'three'
import { GameState, CityStats, Achievement, GameMode, GameSpeed } from '../types/game'
import { Building } from '../types/buildings'
import { Agent } from '../types/agents'
import { GAME_CONFIG, ECONOMY_CONFIG, BUILDING_CONFIG } from '../utils/gameConstants'

interface GameStore extends GameState {
  // City data
  cityStats: CityStats
  achievements: Achievement[]
  
  // World data
  buildings: Building[]
  roads: THREE.Vector3[][]
  agents: Agent[]
  
  // UI state
  tools: Array<{
    id: string
    name: string
    icon: string
    category: string
    cost?: number
    description?: string
  }>
  
  // Actions
  initializeGame: () => void
  updateSimulation: (delta: number) => void
  
  // Tool and building actions
  selectTool: (toolId: string) => void
  selectBuilding: (buildingId: string | null) => void
  placeBuilding: (type: string, position: THREE.Vector3) => boolean
  upgradeBuilding: (buildingId: string, moduleType: string) => boolean
  demolishBuilding: (buildingId: string) => boolean
  
  // Road actions
  constructRoad: (points: THREE.Vector3[], roadType: string) => boolean
  
  // Game control actions
  setGameSpeed: (speed: GameSpeed) => void
  pauseGame: () => void
  resumeGame: () => void
  
  // Camera actions
  updateCameraPosition: (position: THREE.Vector3, target: THREE.Vector3) => void
  
  // Achievement actions
  checkAchievements: () => void
  unlockAchievement: (achievementId: string) => void
  
  // Debug actions
  toggleDebug: () => void
  addDebugBuildings: () => void
  addDebugAgents: () => void
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial game state
    mode: 'sandbox',
    speed: 'normal',
    phase: 'day',
    weather: 'clear',
    gameTime: 0,
    realTime: 0,
    dayCount: 1,
    isInitialized: false,
    isPaused: false,
    selectedTool: null,
    selectedBuilding: null,
    showDebug: false,
    cameraPosition: new THREE.Vector3(30, 25, 30),
    cameraTarget: new THREE.Vector3(0, 0, 0),

    // City statistics
    cityStats: {
      name: 'New City',
      population: 0,
      happiness: 75,
      employment: 0,
      education: 50,
      health: 80,
      safety: 85,
      environment: 90,
      traffic: 100,
      powerUsage: 0,
      waterUsage: 0,
      wasteGeneration: 0
    },

    // Achievements system
    achievements: [
      {
        id: 'first_building',
        name: 'First Steps',
        description: 'Place your first building',
        category: 'construction',
        requirement: 1,
        currentProgress: 0,
        isUnlocked: false,
        reward: { type: 'funds', value: 5000 }
      },
      {
        id: 'population_100',
        name: 'Growing Town',
        description: 'Reach 100 population',
        category: 'population',
        requirement: 100,
        currentProgress: 0,
        isUnlocked: false,
        reward: { type: 'loan_limit', value: 25000 }
      },
      {
        id: 'education_milestone',
        name: 'Educational Excellence',
        description: 'Build your first school',
        category: 'education',
        requirement: 1,
        currentProgress: 0,
        isUnlocked: false,
        reward: { type: 'unlock', value: 'university' }
      }
    ],

    // World data
    buildings: [],
    roads: [],
    agents: [],

    // Available tools
    tools: [
      // Zoning tools
      { id: 'zone_residential', name: 'Residential Zone', icon: '🏠', category: 'zones', description: 'Zone for houses and apartments' },
      { id: 'zone_commercial', name: 'Commercial Zone', icon: '🏪', category: 'zones', description: 'Zone for shops and businesses' },
      { id: 'zone_industrial', name: 'Industrial Zone', icon: '🏭', category: 'zones', description: 'Zone for factories and industry' },
      { id: 'zone_office', name: 'Office Zone', icon: '🏢', category: 'zones', description: 'Zone for office buildings' },
      
      // Road tools
      { id: 'road_street', name: 'Street', icon: '🛣️', category: 'roads', cost: 200, description: 'Basic city street' },
      { id: 'road_avenue', name: 'Avenue', icon: '🛤️', category: 'roads', cost: 500, description: 'Major city avenue' },
      { id: 'road_highway', name: 'Highway', icon: '🚁', category: 'roads', cost: 1000, description: 'High-speed highway' },
      
      // Service buildings
      { id: 'service_fire', name: 'Fire Station', icon: '🚒', category: 'services', cost: 25000, description: 'Fire protection services' },
      { id: 'service_police', name: 'Police Station', icon: '🚔', category: 'services', cost: 30000, description: 'Law enforcement services' },
      { id: 'service_hospital', name: 'Hospital', icon: '🏥', category: 'services', cost: 100000, description: 'Healthcare services' },
      { id: 'service_school', name: 'School', icon: '🏫', category: 'services', cost: 50000, description: 'Primary education' },
      { id: 'service_university', name: 'University', icon: '🎓', category: 'services', cost: 200000, description: 'Higher education' },
      
      // Utilities
      { id: 'utility_power', name: 'Power Plant', icon: '⚡', category: 'utilities', cost: 150000, description: 'Electrical power generation' },
      { id: 'utility_water', name: 'Water Treatment', icon: '💧', category: 'utilities', cost: 80000, description: 'Water processing and supply' },
      
      // Special tools
      { id: 'tool_bulldozer', name: 'Demolish', icon: '🚚', category: 'tools', description: 'Remove buildings and roads' },
      { id: 'tool_info', name: 'Information', icon: 'ℹ️', category: 'tools', description: 'View building and area information' }
    ],

    // Initialize game systems
    initializeGame: () => {
      console.log('🎮 Initializing 3D City Simulator...')
      
      // Set up initial game state
      set({
        isInitialized: true,
        gameTime: 8 * 60, // Start at 8 AM
        realTime: Date.now()
      })

      console.log('✅ Game systems initialized successfully')
    },

    // Main simulation update loop
    updateSimulation: (delta: number) => {
      const state = get()
      if (!state.isInitialized || state.isPaused) return

      const speedMultipliers = {
        paused: 0,
        slow: 0.5,
        normal: 1,
        fast: 2,
        ultra: 4
      }

      const timeMultiplier = speedMultipliers[state.speed] * GAME_CONFIG.TIME_SCALE
      const newGameTime = state.gameTime + (delta * timeMultiplier)
      
      // Day/night cycle
      const newDayCount = Math.floor(newGameTime / (24 * 60))
      const timeOfDay = (newGameTime % (24 * 60)) / (24 * 60)
      const newPhase = timeOfDay < 0.25 || timeOfDay > 0.75 ? 'night' : 'day'

      // Update city statistics based on buildings
      const buildings = state.buildings
      let population = 0
      let employment = 0
      
      buildings.forEach(building => {
        if (building.zoneType === 'residential' && building.status === 'operational') {
          population += building.residents || 0
        }
        if ((building.zoneType === 'commercial' || building.zoneType === 'industrial' || building.zoneType === 'office') && building.status === 'operational') {
          employment += building.workers || 0
        }
      })

      // Update construction progress
      const updatedBuildings = buildings.map(building => {
        if (building.status === 'constructing') {
          const newProgress = building.constructionProgress + (delta * timeMultiplier / (building.constructionTime * 60))
          
          if (newProgress >= 1) {
            console.log(`🏗️ Building ${building.name} construction completed!`)
            return {
              ...building,
              status: 'operational' as const,
              constructionProgress: 1,
              residents: building.zoneType === 'residential' ? Math.floor(building.capacity * 0.8) : undefined,
              workers: building.zoneType !== 'residential' ? Math.floor(building.capacity * 0.7) : undefined
            }
          }
          
          return { ...building, constructionProgress: newProgress }
        }
        return building
      })

      set({
        gameTime: newGameTime,
        dayCount: newDayCount,
        phase: newPhase,
        buildings: updatedBuildings,
        cityStats: {
          ...state.cityStats,
          population,
          employment: population > 0 ? Math.round((employment / population) * 100) : 0
        }
      })

      // Check achievements periodically
      if (Math.floor(newGameTime) % 60 === 0) { // Every game hour
        get().checkAchievements()
      }
    },

    // Tool selection
    selectTool: (toolId: string) => {
      console.log('🔧 Selected tool:', toolId)
      set({ selectedTool: toolId, selectedBuilding: null })
    },

    selectBuilding: (buildingId: string | null) => {
      console.log('🏢 Selected building:', buildingId)
      set({ selectedBuilding: buildingId })
    },

    // Building placement
    placeBuilding: (type: string, position: THREE.Vector3) => {
      const state = get()
      
      // Find tool cost
      const tool = state.tools.find(t => t.id === type)
      const cost = tool?.cost || 10000

      // Check if we have enough funds (simplified - would use economy store in full implementation)
      const funds = ECONOMY_CONFIG.STARTING_FUNDS // Simplified
      
      if (funds < cost) {
        console.log('❌ Insufficient funds for building placement')
        return false
      }

      const newBuilding: Building = {
        id: `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: type,
        name: tool?.name || 'Building',
        position: position.clone(),
        rotation: 0,
        wealthLevel: 'medium', // Simplified - would calculate from terrain
        level: 1,
        maxLevel: 5,
        status: 'constructing',
        constructionProgress: 0,
        constructionTime: BUILDING_CONFIG.CONSTRUCTION_TIME.residential, // Simplified
        capacity: BUILDING_CONFIG.BASE_CAPACITY.residential, // Simplified
        modules: [],
        availableModules: [],
        operatingCost: 500,
        revenue: 0,
        property_value: 50000,
        hasRoadAccess: true, // Simplified - would check actual road network
        hasPowerConnection: true,
        hasWaterConnection: true,
        hasInternetConnection: true,
        pollution: 0,
        noise: 0,
        metadata: {}
      }

      // Determine zone type and specific building properties
      if (type.startsWith('zone_')) {
        newBuilding.zoneType = type.replace('zone_', '') as any
      } else if (type.startsWith('service_')) {
        newBuilding.serviceRange = 20
        newBuilding.serviceEfficiency = 1.0
      }

      console.log(`🏗️ Placing building: ${newBuilding.name} at position (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`)

      set({
        buildings: [...state.buildings, newBuilding]
      })

      return true
    },

    // Building upgrades
    upgradeBuilding: (buildingId: string, moduleType: string) => {
      const state = get()
      const building = state.buildings.find(b => b.id === buildingId)
      
      if (!building || building.status !== 'operational') {
        console.log('❌ Cannot upgrade building - not found or not operational')
        return false
      }

      const upgradeCost = 5000 // Simplified
      
      console.log(`🔧 Upgrading building ${building.name} with module: ${moduleType}`)

      const newModule = {
        id: `module_${Date.now()}`,
        type: moduleType,
        name: moduleType.replace('_', ' ').toUpperCase(),
        cost: upgradeCost,
        effect: { efficiency: 0.2 }
      }

      set({
        buildings: state.buildings.map(b => 
          b.id === buildingId 
            ? { ...b, modules: [...b.modules, newModule] }
            : b
        )
      })

      return true
    },

    // Building demolition
    demolishBuilding: (buildingId: string) => {
      const state = get()
      const building = state.buildings.find(b => b.id === buildingId)
      
      if (!building) return false

      console.log(`🚚 Demolishing building: ${building.name}`)
      
      set({
        buildings: state.buildings.filter(b => b.id !== buildingId)
      })

      return true
    },

    // Road construction
    constructRoad: (points: THREE.Vector3[], roadType: string) => {
      const state = get()
      const cost = points.length * 200 // Simplified cost calculation

      console.log(`🛣️ Constructing ${roadType} with ${points.length} segments for $${cost.toLocaleString()}`)

      set({
        roads: [...state.roads, points]
      })

      return true
    },

    // Game control
    setGameSpeed: (speed: GameSpeed) => {
      console.log(`⏱️ Game speed set to: ${speed}`)
      set({ speed, isPaused: speed === 'paused' })
    },

    pauseGame: () => {
      console.log('⏸️ Game paused')
      set({ isPaused: true })
    },

    resumeGame: () => {
      console.log('▶️ Game resumed')
      set({ isPaused: false })
    },

    // Camera updates
    updateCameraPosition: (position: THREE.Vector3, target: THREE.Vector3) => {
      set({
        cameraPosition: position.clone(),
        cameraTarget: target.clone()
      })
    },

    // Achievement system
    checkAchievements: () => {
      const state = get()
      
      state.achievements.forEach(achievement => {
        if (achievement.isUnlocked) return
        
        let currentProgress = 0
        
        switch (achievement.id) {
          case 'first_building':
            currentProgress = state.buildings.filter(b => b.status === 'operational').length
            break
          case 'population_100':
            currentProgress = state.cityStats.population
            break
          case 'education_milestone':
            currentProgress = state.buildings.filter(b => b.type === 'service_school').length
            break
        }
        
        if (currentProgress >= achievement.requirement && !achievement.isUnlocked) {
          get().unlockAchievement(achievement.id)
        } else {
          // Update progress
          set({
            achievements: state.achievements.map(a => 
              a.id === achievement.id 
                ? { ...a, currentProgress }
                : a
            )
          })
        }
      })
    },

    unlockAchievement: (achievementId: string) => {
      const state = get()
      const achievement = state.achievements.find(a => a.id === achievementId)
      
      if (!achievement || achievement.isUnlocked) return

      console.log(`🏆 Achievement unlocked: ${achievement.name}`)
      
      set({
        achievements: state.achievements.map(a => 
          a.id === achievementId 
            ? { ...a, isUnlocked: true, currentProgress: a.requirement }
            : a
        )
      })

      // Apply reward if applicable
      if (achievement.reward) {
        switch (achievement.reward.type) {
          case 'funds':
            console.log(`💰 Reward: $${achievement.reward.value} added to city funds`)
            break
          case 'loan_limit':
            console.log(`🏛️ Reward: Loan limit increased by $${achievement.reward.value}`)
            break
          case 'unlock':
            console.log(`🔓 Reward: ${achievement.reward.value} unlocked`)
            break
        }
      }
    },

    // Debug functions
    toggleDebug: () => {
      const newDebugState = !get().showDebug
      console.log(`🐛 Debug mode: ${newDebugState ? 'ON' : 'OFF'}`)
      set({ showDebug: newDebugState })
    },

    addDebugBuildings: () => {
      const state = get()
      const debugBuildings: Building[] = []
      
      // Add some sample buildings for testing
      const buildingTypes = ['zone_residential', 'zone_commercial', 'zone_industrial', 'zone_office']
      
      for (let i = 0; i < 10; i++) {
        const x = (Math.random() - 0.5) * 40
        const z = (Math.random() - 0.5) * 40
        const type = buildingTypes[Math.floor(Math.random() * buildingTypes.length)]
        
        get().placeBuilding(type, new THREE.Vector3(x, 0, z))
      }
      
      console.log('🏗️ Added debug buildings')
    },

    addDebugAgents: () => {
      console.log('👥 Debug agents would be added here')
      // Would add sample citizens, vehicles, etc. for testing
    }
  }))
)
