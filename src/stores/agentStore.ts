import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import * as THREE from 'three'
import { Agent, CitizenStatus, VehicleData, ResourceData, DailyActivity, CitizenBehavior } from '../types/agents'
import { Building } from '../types/buildings'
import { MathUtils } from '../utils/mathUtils'
import { AGENT_CONFIG } from '../utils/gameConstants'

interface AgentStore {
  // Agent data
  agents: Agent[]
  citizenBehaviors: Map<string, CitizenBehavior>
  dailySchedules: Map<string, DailyActivity[]>
  
  // Pathfinding cache
  pathCache: Map<string, THREE.Vector3[]>
  
  // Agent statistics
  totalCitizens: number
  employedCitizens: number
  educatedCitizens: number
  homelessCitizens: number
  
  // Actions
  initializeAgentSystem: () => void
  updateAgents: (deltaTime: number, buildings: Building[]) => void
  
  // Agent management
  createAgent: (type: Agent['type'], position: THREE.Vector3, config?: Partial<Agent>) => Agent
  removeAgent: (agentId: string) => void
  updateAgent: (agentId: string, updates: Partial<Agent>) => void
  
  // Citizen management
  spawnCitizenForBuilding: (building: Building) => Agent[]
  assignJob: (citizenId: string, workplaceId: string) => void
  assignHome: (citizenId: string, homeId: string) => void
  assignEducation: (citizenId: string, schoolId: string) => void
  
  // Movement and pathfinding
  setAgentDestination: (agentId: string, destination: THREE.Vector3) => void
  updateAgentPath: (agentId: string, path: THREE.Vector3[]) => void
  findPath: (start: THREE.Vector3, end: THREE.Vector3) => THREE.Vector3[]
  
  // Behavior management
  updateCitizenBehavior: (citizenId: string, behavior: Partial<CitizenBehavior>) => void
  generateDailySchedule: (citizenId: string) => DailyActivity[]
  
  // Statistics
  calculateAgentStatistics: () => void
  getAgentsByType: (type: Agent['type']) => Agent[]
  getAgentsInArea: (center: THREE.Vector3, radius: number) => Agent[]
  
  // Needs and satisfaction
  updateCitizenNeeds: (deltaTime: number) => void
  satisfyNeed: (citizenId: string, needType: string, amount: number) => void
}

export const useAgentStore = create<AgentStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    agents: [],
    citizenBehaviors: new Map(),
    dailySchedules: new Map(),
    pathCache: new Map(),
    
    totalCitizens: 0,
    employedCitizens: 0,
    educatedCitizens: 0,
    homelessCitizens: 0,

    initializeAgentSystem: () => {
      console.log('👥 Initializing agent system...')
      
      // Clear existing data
      set({
        agents: [],
        citizenBehaviors: new Map(),
        dailySchedules: new Map(),
        pathCache: new Map(),
        totalCitizens: 0,
        employedCitizens: 0,
        educatedCitizens: 0,
        homelessCitizens: 0
      })
      
      console.log('✅ Agent system initialized')
    },

    updateAgents: (deltaTime: number, buildings: Building[]) => {
      const state = get()
      const updatedAgents: Agent[] = []
      
      state.agents.forEach(agent => {
        const updatedAgent = { ...agent }
        
        // Update agent based on type
        switch (agent.type) {
          case 'citizen':
            get().updateCitizen(updatedAgent, deltaTime, buildings)
            break
          case 'vehicle':
            get().updateVehicle(updatedAgent, deltaTime)
            break
          case 'resource':
            get().updateResource(updatedAgent, deltaTime)
            break
          case 'service':
            get().updateServiceAgent(updatedAgent, deltaTime)
            break
        }
        
        // Update movement
        if (updatedAgent.isMoving && updatedAgent.destination) {
          get().updateAgentMovement(updatedAgent, deltaTime)
        }
        
        updatedAgents.push(updatedAgent)
      })
      
      // Update citizen needs
      get().updateCitizenNeeds(deltaTime)
      
      // Recalculate statistics
      get().calculateAgentStatistics()
      
      set({ agents: updatedAgents })
    },

    createAgent: (type: Agent['type'], position: THREE.Vector3, config = {}) => {
      const agentId = `agent_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const baseAgent: Agent = {
        id: agentId,
        type,
        position: position.clone(),
        rotation: 0,
        velocity: new THREE.Vector3(),
        speed: AGENT_CONFIG.WALKING_SPEED,
        destination: undefined,
        path: undefined,
        currentPathIndex: 0,
        isMoving: false,
        status: {
          education: 'none',
          employment: 'unemployed',
          housing: 'homeless',
          wealth: 'low',
          health: 100,
          happiness: 50,
          age: 'adult'
        },
        schedule: [],
        currentActivity: undefined,
        needs: {
          food: 80,
          shelter: 50,
          employment: 30,
          education: 20,
          healthcare: 90,
          recreation: 60,
          social: 70
        },
        personality: {
          ambition: Math.random(),
          sociability: Math.random(),
          patience: Math.random(),
          environmentalism: Math.random()
        },
        income: 0,
        expenses: 0,
        savings: Math.random() * 1000,
        ...config
      }

      // Generate behavior profile for citizens
      if (type === 'citizen') {
        const behavior: CitizenBehavior = {
          preferredTransportation: ['car', 'bus'],
          walkingSpeed: 1.5 + Math.random(),
          patience: Math.random(),
          spendingHabits: {
            food: 0.3,
            entertainment: 0.2,
            shopping: 0.1,
            transport: 0.1
          },
          savingsRate: 0.1 + Math.random() * 0.2,
          jobSeeking: baseAgent.status.employment === 'unemployed',
          socialNeeds: Math.random(),
          communityParticipation: Math.random(),
          crimeTendency: Math.random() * 0.1,
          learningMotivation: Math.random(),
          skillDevelopment: {
            technical: Math.random(),
            social: Math.random(),
            creative: Math.random()
          }
        }
        
        const citizenBehaviors = new Map(get().citizenBehaviors)
        citizenBehaviors.set(agentId, behavior)
        
        // Generate daily schedule
        const schedule = get().generateDailySchedule(agentId)
        const dailySchedules = new Map(get().dailySchedules)
        dailySchedules.set(agentId, schedule)
        
        set({ citizenBehaviors, dailySchedules })
      }

      const agents = [...get().agents, baseAgent]
      set({ agents })
      
      console.log(`👤 Created ${type} agent:`, agentId)
      return baseAgent
    },

    removeAgent: (agentId: string) => {
      const state = get()
      const agents = state.agents.filter(a => a.id !== agentId)
      
      // Clean up related data
      const citizenBehaviors = new Map(state.citizenBehaviors)
      citizenBehaviors.delete(agentId)
      
      const dailySchedules = new Map(state.dailySchedules)
      dailySchedules.delete(agentId)
      
      set({ agents, citizenBehaviors, dailySchedules })
      console.log(`🗑️ Removed agent:`, agentId)
    },

    updateAgent: (agentId: string, updates: Partial<Agent>) => {
      const agents = get().agents.map(agent => 
        agent.id === agentId ? { ...agent, ...updates } : agent
      )
      set({ agents })
    },

    spawnCitizenForBuilding: (building: Building) => {
      if (building.zoneType !== 'residential' || building.status !== 'operational') {
        return []
      }

      const residentsToSpawn = Math.min(4, Math.floor((building.residents || 0) / 4))
      const spawnedCitizens: Agent[] = []
      
      for (let i = 0; i < residentsToSpawn; i++) {
        const spawnPosition = new THREE.Vector3(
          building.position.x + (Math.random() - 0.5) * 4,
          0.5,
          building.position.z + (Math.random() - 0.5) * 4
        )
        
        const ages: Array<'child' | 'adult' | 'elderly'> = ['child', 'adult', 'adult', 'elderly']
        const age = ages[Math.floor(Math.random() * ages.length)]
        
        const citizen = get().createAgent('citizen', spawnPosition, {
          homeId: building.id,
          status: {
            education: age === 'child' ? 'none' : Math.random() > 0.3 ? 'secondary' : 'none',
            employment: age === 'adult' && Math.random() > 0.2 ? 'employed' : 
                       age === 'child' ? 'student' : 
                       age === 'elderly' ? 'retired' : 'unemployed',
            housing: 'housed',
            wealth: building.wealthLevel,
            health: 80 + Math.random() * 20,
            happiness: 60 + Math.random() * 30,
            age
          },
          speed: age === 'child' ? AGENT_CONFIG.WALKING_SPEED * 0.8 :
                 age === 'elderly' ? AGENT_CONFIG.WALKING_SPEED * 0.6 :
                 AGENT_CONFIG.WALKING_SPEED
        })
        
        spawnedCitizens.push(citizen)
      }
      
      console.log(`🏠 Spawned ${spawnedCitizens.length} citizens for building ${building.id}`)
      return spawnedCitizens
    },

    assignJob: (citizenId: string, workplaceId: string) => {
      const agent = get().agents.find(a => a.id === citizenId)
      if (!agent || agent.type !== 'citizen') return
      
      get().updateAgent(citizenId, {
        workplaceId,
        status: {
          ...agent.status,
          employment: 'employed'
        }
      })
      
      console.log(`💼 Assigned job to citizen ${citizenId} at ${workplaceId}`)
    },

    assignHome: (citizenId: string, homeId: string) => {
      get().updateAgent(citizenId, {
        homeId,
        status: {
          ...get().agents.find(a => a.id === citizenId)?.status,
          housing: 'housed'
        } as CitizenStatus
      })
      
      console.log(`🏠 Assigned home to citizen ${citizenId}: ${homeId}`)
    },

    assignEducation: (citizenId: string, schoolId: string) => {
      get().updateAgent(citizenId, {
        schoolId,
        status: {
          ...get().agents.find(a => a.id === citizenId)?.status,
          employment: 'student'
        } as CitizenStatus
      })
      
      console.log(`🎓 Assigned education to citizen ${citizenId}: ${schoolId}`)
    },

    setAgentDestination: (agentId: string, destination: THREE.Vector3) => {
      const agent = get().agents.find(a => a.id === agentId)
      if (!agent) return
      
      const path = get().findPath(agent.position, destination)
      
      get().updateAgent(agentId, {
        destination: destination.clone(),
        path,
        currentPathIndex: 0,
        isMoving: true
      })
    },

    updateAgentPath: (agentId: string, path: THREE.Vector3[]) => {
      get().updateAgent(agentId, {
        path,
        currentPathIndex: 0,
        isMoving: path.length > 0
      })
    },

    findPath: (start: THREE.Vector3, end: THREE.Vector3) => {
      const cacheKey = `${Math.round(start.x)},${Math.round(start.z)}-${Math.round(end.x)},${Math.round(end.z)}`
      const cached = get().pathCache.get(cacheKey)
      
      if (cached) {
        return cached
      }
      
      // Simple pathfinding - direct line with some waypoints
      const path: THREE.Vector3[] = []
      const distance = start.distanceTo(end)
      const segments = Math.max(2, Math.floor(distance / 5))
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments
        const point = new THREE.Vector3().lerpVectors(start, end, t)
        // Add some randomness to avoid perfectly straight lines
        if (i > 0 && i < segments) {
          point.x += (Math.random() - 0.5) * 2
          point.z += (Math.random() - 0.5) * 2
        }
        point.y = 0.5 // Keep agents above ground
        path.push(point)
      }
      
      // Cache the path
      const pathCache = new Map(get().pathCache)
      pathCache.set(cacheKey, path)
      set({ pathCache })
      
      return path
    },

    updateCitizenBehavior: (citizenId: string, behavior: Partial<CitizenBehavior>) => {
      const citizenBehaviors = new Map(get().citizenBehaviors)
      const existing = citizenBehaviors.get(citizenId)
      
      if (existing) {
        citizenBehaviors.set(citizenId, { ...existing, ...behavior })
        set({ citizenBehaviors })
      }
    },

    generateDailySchedule: (citizenId: string) => {
      const agent = get().agents.find(a => a.id === citizenId)
      if (!agent) return []
      
      const schedule: DailyActivity[] = []
      
      // Sleep
      schedule.push({
        type: 'sleep',
        startTime: 22 * 60,
        endTime: 6 * 60 + 24 * 60, // Next day 6 AM
        priority: 10
      })
      
      if (agent.status.age === 'adult') {
        if (agent.status.employment === 'employed' && agent.workplaceId) {
          // Work schedule
          schedule.push({
            type: 'work',
            startTime: AGENT_CONFIG.WORK_START_TIME * 60,
            endTime: AGENT_CONFIG.WORK_END_TIME * 60,
            locationId: agent.workplaceId,
            priority: 8
          })
          
          // Commute to work
          schedule.push({
            type: 'commute',
            startTime: (AGENT_CONFIG.WORK_START_TIME - 0.5) * 60,
            endTime: AGENT_CONFIG.WORK_START_TIME * 60,
            locationId: agent.workplaceId,
            priority: 9
          })
        }
        
        // Evening activities
        schedule.push({
          type: 'recreation',
          startTime: 18 * 60,
          endTime: 20 * 60,
          priority: 3
        })
      } else if (agent.status.age === 'child' && agent.schoolId) {
        // School schedule
        schedule.push({
          type: 'education',
          startTime: AGENT_CONFIG.SCHOOL_START_TIME * 60,
          endTime: AGENT_CONFIG.SCHOOL_END_TIME * 60,
          locationId: agent.schoolId,
          priority: 8
        })
        
        // Play time
        schedule.push({
          type: 'recreation',
          startTime: 16 * 60,
          endTime: 18 * 60,
          priority: 6
        })
      }
      
      // Shopping
      if (Math.random() < 0.3) {
        schedule.push({
          type: 'shopping',
          startTime: 10 * 60 + Math.random() * 8 * 60,
          endTime: 12 * 60 + Math.random() * 4 * 60,
          priority: 4
        })
      }
      
      return schedule.sort((a, b) => a.startTime - b.startTime)
    },

    calculateAgentStatistics: () => {
      const agents = get().agents
      const citizens = agents.filter(a => a.type === 'citizen')
      
      const totalCitizens = citizens.length
      const employedCitizens = citizens.filter(c => c.status.employment === 'employed').length
      const educatedCitizens = citizens.filter(c => c.status.education !== 'none').length
      const homelessCitizens = citizens.filter(c => c.status.housing === 'homeless').length
      
      set({
        totalCitizens,
        employedCitizens,
        educatedCitizens,
        homelessCitizens
      })
    },

    getAgentsByType: (type: Agent['type']) => {
      return get().agents.filter(a => a.type === type)
    },

    getAgentsInArea: (center: THREE.Vector3, radius: number) => {
      return get().agents.filter(agent => {
        const distance = MathUtils.distance2D(agent.position, center)
        return distance <= radius
      })
    },

    updateCitizenNeeds: (deltaTime: number) => {
      const agents = get().agents
      const gameHours = deltaTime * 24 // Convert to game hours
      
      const updatedAgents = agents.map(agent => {
        if (agent.type !== 'citizen') return agent
        
        const updatedNeeds = { ...agent.needs }
        
        // Decay needs over time
        Object.keys(updatedNeeds).forEach(needType => {
          const decayRate = AGENT_CONFIG.NEED_DECAY_RATES[needType as keyof typeof AGENT_CONFIG.NEED_DECAY_RATES] || 1
          updatedNeeds[needType] = Math.max(0, updatedNeeds[needType] - decayRate * gameHours)
        })
        
        // Satisfy needs based on current activity and location
        if (agent.homeId && agent.currentActivity?.type === 'sleep') {
          updatedNeeds.shelter = Math.min(AGENT_CONFIG.MAX_NEEDS.shelter, updatedNeeds.shelter + 10 * gameHours)
        }
        
        if (agent.workplaceId && agent.currentActivity?.type === 'work') {
          updatedNeeds.employment = Math.min(AGENT_CONFIG.MAX_NEEDS.employment, updatedNeeds.employment + 5 * gameHours)
        }
        
        return {
          ...agent,
          needs: updatedNeeds
        }
      })
      
      set({ agents: updatedAgents })
    },

    satisfyNeed: (citizenId: string, needType: string, amount: number) => {
      const agent = get().agents.find(a => a.id === citizenId)
      if (!agent || agent.type !== 'citizen') return
      
      const updatedNeeds = { ...agent.needs }
      const maxNeed = AGENT_CONFIG.MAX_NEEDS[needType as keyof typeof AGENT_CONFIG.MAX_NEEDS] || 100
      updatedNeeds[needType] = Math.min(maxNeed, updatedNeeds[needType] + amount)
      
      get().updateAgent(citizenId, { needs: updatedNeeds })
    },

    // Helper methods (would be private in a class)
    updateCitizen: (citizen: Agent, deltaTime: number, buildings: Building[]) => {
      // Determine current activity based on time and schedule
      const currentTime = Date.now() % (24 * 60 * 60 * 1000) // Daily cycle
      const schedule = get().dailySchedules.get(citizen.id) || []
      
      const currentActivity = schedule.find(activity => {
        const currentMinutes = (currentTime / (60 * 1000)) % (24 * 60)
        return currentMinutes >= activity.startTime && currentMinutes <= activity.endTime
      })
      
      if (currentActivity && currentActivity !== citizen.currentActivity) {
        // Activity changed, set new destination
        let destination: THREE.Vector3 | undefined
        
        switch (currentActivity.type) {
          case 'work':
            if (citizen.workplaceId) {
              const workplace = buildings.find(b => b.id === citizen.workplaceId)
              if (workplace) {
                destination = workplace.position.clone()
              }
            }
            break
          case 'education':
            if (citizen.schoolId) {
              const school = buildings.find(b => b.id === citizen.schoolId)
              if (school) {
                destination = school.position.clone()
              }
            }
            break
          case 'sleep':
            if (citizen.homeId) {
              const home = buildings.find(b => b.id === citizen.homeId)
              if (home) {
                destination = home.position.clone()
              }
            }
            break
          case 'shopping':
            const commercialBuildings = buildings.filter(b => b.zoneType === 'commercial' && b.status === 'operational')
            if (commercialBuildings.length > 0) {
              const shop = commercialBuildings[Math.floor(Math.random() * commercialBuildings.length)]
              destination = shop.position.clone()
            }
            break
          case 'recreation':
            // Random walk for recreation
            destination = new THREE.Vector3(
              citizen.position.x + (Math.random() - 0.5) * 20,
              0.5,
              citizen.position.z + (Math.random() - 0.5) * 20
            )
            break
        }
        
        if (destination) {
          get().setAgentDestination(citizen.id, destination)
        }
        
        citizen.currentActivity = currentActivity
      }
      
      // Update happiness based on needs satisfaction
      const needsSatisfaction = Object.values(citizen.needs).reduce((sum, need) => sum + need, 0) / (Object.keys(citizen.needs).length * 100)
      citizen.status.happiness = Math.max(0, Math.min(100, needsSatisfaction * 100))
    },

    updateVehicle: (vehicle: Agent, deltaTime: number) => {
      if (!vehicle.vehicleData) return
      
      // Update fuel consumption
      if (vehicle.isMoving) {
        vehicle.vehicleData.fuel = Math.max(0, vehicle.vehicleData.fuel - deltaTime * 0.1)
      }
      
      // Handle fuel depletion
      if (vehicle.vehicleData.fuel <= 0) {
        vehicle.isMoving = false
        vehicle.destination = undefined
        vehicle.speed = 0
      }
    },

    updateResource: (resource: Agent, deltaTime: number) => {
      if (!resource.resourceData) return
      
      // Update resource quality over time
      resource.resourceData.quality = Math.max(0, resource.resourceData.quality - deltaTime * 0.01)
      
      // Handle resource expiration
      if (resource.resourceData.quality <= 0) {
        get().removeAgent(resource.id)
      }
    },

    updateServiceAgent: (serviceAgent: Agent, deltaTime: number) => {
      // Service agents (emergency vehicles, maintenance, etc.)
      // Update their specific behaviors here
      if (serviceAgent.isMoving && serviceAgent.destination) {
        const distance = serviceAgent.position.distanceTo(serviceAgent.destination)
        if (distance < 2) {
          // Arrived at service location
          serviceAgent.isMoving = false
          serviceAgent.destination = undefined
        }
      }
    },

    updateAgentMovement: (agent: Agent, deltaTime: number) => {
      if (!agent.path || agent.path.length === 0) return
      
      const currentTarget = agent.path[agent.currentPathIndex]
      if (!currentTarget) return
      
      const direction = new THREE.Vector3().subVectors(currentTarget, agent.position)
      const distance = direction.length()
      
      if (distance < 0.5) {
        // Reached current waypoint, move to next
        agent.currentPathIndex++
        
        if (agent.currentPathIndex >= agent.path.length) {
          // Reached final destination
          agent.isMoving = false
          agent.destination = undefined
          agent.path = undefined
          agent.currentPathIndex = 0
        }
      } else {
        // Move towards current waypoint
        direction.normalize()
        const moveDistance = agent.speed * deltaTime
        agent.position.add(direction.multiplyScalar(moveDistance))
        agent.velocity.copy(direction.multiplyScalar(agent.speed))
        
        // Update rotation to face movement direction
        agent.rotation = Math.atan2(direction.x, direction.z)
      }
    }
  }))
)
