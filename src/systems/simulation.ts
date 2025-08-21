import * as THREE from 'three'
import { PathfindingSystem } from './pathfinding'
import { EconomicEngine } from './economics'
import { TerrainSystem } from './terrain'
import { ConstructionSystem } from './construction'
import { Building } from '../types/buildings'
import { Agent } from '../types/agents'
import { EconomicData } from '../types/economy'
import { GAME_CONFIG } from '../utils/gameConstants'

export interface SimulationConfig {
  worldSize: number
  pathfindingCellSize: number
  economicUpdateInterval: number
  agentUpdateInterval: number
  constructionUpdateInterval: number
  enableMultithreading: boolean
}

export interface SimulationState {
  isRunning: boolean
  isPaused: boolean
  gameSpeed: number
  totalGameTime: number
  lastUpdateTime: number
  frameCount: number
  averageFPS: number
  performanceMetrics: {
    pathfindingTime: number
    economicsTime: number
    agentUpdateTime: number
    terrainUpdateTime: number
    constructionTime: number
  }
}

export class CitySimulation {
  private pathfindingSystem: PathfindingSystem
  private economicEngine: EconomicEngine
  private terrainSystem: TerrainSystem
  private constructionSystem: ConstructionSystem
  
  private config: SimulationConfig
  private state: SimulationState
  private updateIntervals: Map<string, number>
  
  // Simulation data
  private buildings: Building[]
  private agents: Agent[]
  private roads: THREE.Vector3[][]
  
  // Performance tracking
  private performanceHistory: Array<{ timestamp: number, metrics: any }>
  private maxHistoryLength = 100

  constructor(config: SimulationConfig, initialEconomicData: EconomicData) {
    this.config = config
    this.buildings = []
    this.agents = []
    this.roads = []
    this.updateIntervals = new Map()
    this.performanceHistory = []
    
    this.state = {
      isRunning: false,
      isPaused: false,
      gameSpeed: 1.0,
      totalGameTime: 0,
      lastUpdateTime: 0,
      frameCount: 0,
      averageFPS: 60,
      performanceMetrics: {
        pathfindingTime: 0,
        economicsTime: 0,
        agentUpdateTime: 0,
        terrainUpdateTime: 0,
        constructionTime: 0
      }
    }
    
    this.initializeSystems(initialEconomicData)
    console.log('🎮 City simulation initialized')
  }

  private initializeSystems(initialEconomicData: EconomicData): void {
    // Initialize subsystems
    this.pathfindingSystem = new PathfindingSystem(
      this.config.worldSize, 
      this.config.pathfindingCellSize
    )
    
    this.economicEngine = new EconomicEngine(initialEconomicData)
    
    this.terrainSystem = new TerrainSystem(this.config.worldSize)
    
    this.constructionSystem = new ConstructionSystem()

    // Set update intervals
    this.updateIntervals.set('economics', this.config.economicUpdateInterval)
    this.updateIntervals.set('agents', this.config.agentUpdateInterval)
    this.updateIntervals.set('construction', this.config.constructionUpdateInterval)
    this.updateIntervals.set('pathfinding', 1.0) // Update pathfinding every second
    this.updateIntervals.set('terrain', 5.0) // Update terrain every 5 seconds
  }

  public start(): void {
    if (this.state.isRunning) return
    
    this.state.isRunning = true
    this.state.isPaused = false
    this.state.lastUpdateTime = performance.now()
    
    console.log('▶️ City simulation started')
  }

  public pause(): void {
    this.state.isPaused = true
    console.log('⏸️ City simulation paused')
  }

  public resume(): void {
    this.state.isPaused = false
    this.state.lastUpdateTime = performance.now()
    console.log('▶️ City simulation resumed')
  }

  public stop(): void {
    this.state.isRunning = false
    this.state.isPaused = false
    console.log('⏹️ City simulation stopped')
  }

  public setGameSpeed(speed: number): void {
    this.state.gameSpeed = Math.max(0, Math.min(10, speed))
    console.log(`⏱️ Game speed set to ${this.state.gameSpeed}x`)
  }

  public update(currentTime: number): void {
    if (!this.state.isRunning || this.state.isPaused) return

    const deltaTime = (currentTime - this.state.lastUpdateTime) / 1000
    const scaledDeltaTime = deltaTime * this.state.gameSpeed
    
    this.state.totalGameTime += scaledDeltaTime
    this.state.frameCount++
    
    // Update FPS calculation
    if (this.state.frameCount % 60 === 0) {
      this.state.averageFPS = 1000 / ((currentTime - (this.state.lastUpdateTime - 59 * deltaTime)) / 60)
    }

    // Perform simulation updates with performance tracking
    this.updateSubsystems(scaledDeltaTime)
    
    this.state.lastUpdateTime = currentTime
    
    // Record performance metrics periodically
    if (this.state.frameCount % 300 === 0) { // Every 5 seconds at 60 FPS
      this.recordPerformanceMetrics()
    }
  }

  private updateSubsystems(deltaTime: number): void {
    const startTime = performance.now()
    let systemTime: number

    // Update construction system
    systemTime = performance.now()
    this.updateConstruction(deltaTime)
    this.state.performanceMetrics.constructionTime = performance.now() - systemTime

    // Update terrain system (less frequent)
    if (this.shouldUpdateSystem('terrain', deltaTime)) {
      systemTime = performance.now()
      this.updateTerrain(deltaTime)
      this.state.performanceMetrics.terrainUpdateTime = performance.now() - systemTime
    }

    // Update pathfinding system (when roads change)
    if (this.shouldUpdateSystem('pathfinding', deltaTime)) {
      systemTime = performance.now()
      this.updatePathfinding()
      this.state.performanceMetrics.pathfindingTime = performance.now() - systemTime
    }

    // Update agents
    if (this.shouldUpdateSystem('agents', deltaTime)) {
      systemTime = performance.now()
      this.updateAgents(deltaTime)
      this.state.performanceMetrics.agentUpdateTime = performance.now() - systemTime
    }

    // Update economics
    if (this.shouldUpdateSystem('economics', deltaTime)) {
      systemTime = performance.now()
      this.updateEconomics(deltaTime)
      this.state.performanceMetrics.economicsTime = performance.now() - systemTime
    }
  }

  private shouldUpdateSystem(systemName: string, deltaTime: number): boolean {
    const interval = this.updateIntervals.get(systemName) || 1.0
    const currentTime = this.state.totalGameTime
    
    // Check if enough time has passed since last update
    const lastUpdate = this.updateIntervals.get(`${systemName}_last`) || 0
    
    if (currentTime - lastUpdate >= interval) {
      this.updateIntervals.set(`${systemName}_last`, currentTime)
      return true
    }
    
    return false
  }

  private updateConstruction(deltaTime: number): void {
    const constructingBuildings = this.buildings.filter(b => b.status === 'constructing')
    
    if (constructingBuildings.length === 0) return

    constructingBuildings.forEach(building => {
      this.constructionSystem.updateConstruction(building, deltaTime)
      
      // Check if construction is complete
      if (building.constructionProgress >= 1.0) {
        building.status = 'operational'
        building.constructionProgress = 1.0
        
        console.log(`🏗️ Construction completed: ${building.name}`)
        
        // Update pathfinding if this affects navigation
        if (building.zoneType === 'residential' || 
            building.zoneType === 'commercial' || 
            building.zoneType === 'office') {
          this.schedulePathfindingUpdate()
        }
      }
    })
  }

  private updateTerrain(deltaTime: number): void {
    // Update terrain values based on development and pollution
    this.terrainSystem.updateTerrainValues(this.buildings, this.agents)
    
    // Update water levels, pollution spread, etc.
    this.terrainSystem.updateEnvironmentalFactors(deltaTime)
  }

  private updatePathfinding(): void {
    // Update obstacles based on current buildings
    const buildingObstacles = this.buildings
      .filter(b => b.status === 'operational')
      .map(b => ({
        position: b.position,
        size: { width: 2, depth: 2 } // Simplified building size
      }))
    
    this.pathfindingSystem.updateObstacles(buildingObstacles)
    this.pathfindingSystem.updateRoads(this.roads)
  }

  private updateAgents(deltaTime: number): void {
    // Update agent movement and behavior
    this.agents.forEach(agent => {
      this.updateAgentMovement(agent, deltaTime)
      this.updateAgentBehavior(agent, deltaTime)
    })
    
    // Remove agents that are no longer needed
    this.agents = this.agents.filter(agent => this.isAgentValid(agent))
    
    // Spawn new agents if needed
    this.spawnNewAgents()
  }

  private updateAgentMovement(agent: Agent, deltaTime: number): void {
    if (!agent.isMoving || !agent.destination) return

    // If no path or path is blocked, recalculate
    if (!agent.path || agent.path.length === 0) {
      agent.path = this.pathfindingSystem.findPath(agent.position, agent.destination)
      agent.currentPathIndex = 0
    }

    if (agent.path && agent.currentPathIndex < agent.path.length) {
      const targetPoint = agent.path[agent.currentPathIndex]
      const direction = new THREE.Vector3().subVectors(targetPoint, agent.position)
      const distance = direction.length()

      if (distance < 0.5) {
        // Reached waypoint, move to next
        agent.currentPathIndex++
        
        if (agent.currentPathIndex >= agent.path.length) {
          // Reached destination
          agent.isMoving = false
          agent.destination = undefined
          agent.path = undefined
          agent.currentPathIndex = 0
        }
      } else {
        // Move towards waypoint
        direction.normalize()
        const moveDistance = agent.speed * deltaTime
        agent.position.add(direction.multiplyScalar(moveDistance))
        agent.velocity.copy(direction.multiplyScalar(agent.speed))
        
        // Update rotation
        agent.rotation = Math.atan2(direction.x, direction.z)
      }
    }
  }

  private updateAgentBehavior(agent: Agent, deltaTime: number): void {
    if (agent.type !== 'citizen') return

    // Update needs decay
    Object.keys(agent.needs).forEach(needType => {
      const decayRate = 0.5 // Simplified decay rate
      agent.needs[needType] = Math.max(0, agent.needs[needType] - decayRate * deltaTime)
    })

    // Update happiness based on needs satisfaction
    const averageNeedSatisfaction = Object.values(agent.needs).reduce((sum, need) => sum + need, 0) / Object.keys(agent.needs).length
    agent.status.happiness = Math.max(0, Math.min(100, averageNeedSatisfaction))

    // Determine if agent needs to go somewhere
    if (!agent.isMoving && Math.random() < 0.1 * deltaTime) { // 10% chance per second
      this.assignAgentDestination(agent)
    }
  }

  private assignAgentDestination(agent: Agent): void {
    if (agent.type !== 'citizen') return

    // Find lowest need
    let lowestNeed = 'food'
    let lowestValue = agent.needs.food

    Object.entries(agent.needs).forEach(([need, value]) => {
      if (value < lowestValue) {
        lowestNeed = need
        lowestValue = value
      }
    })

    // Assign destination based on need
    let destination: THREE.Vector3 | undefined

    switch (lowestNeed) {
      case 'shelter':
        if (agent.homeId) {
          const home = this.buildings.find(b => b.id === agent.homeId)
          if (home) destination = home.position.clone()
        }
        break
      
      case 'employment':
        if (agent.workplaceId) {
          const workplace = this.buildings.find(b => b.id === agent.workplaceId)
          if (workplace) destination = workplace.position.clone()
        }
        break
      
      case 'food':
      case 'recreation':
        // Find nearest commercial building
        const commercialBuildings = this.buildings.filter(b => 
          b.zoneType === 'commercial' && b.status === 'operational'
        )
        if (commercialBuildings.length > 0) {
          const nearest = commercialBuildings.reduce((closest, building) => {
            const distToCurrent = agent.position.distanceTo(building.position)
            const distToClosest = agent.position.distanceTo(closest.position)
            return distToCurrent < distToClosest ? building : closest
          })
          destination = nearest.position.clone()
        }
        break
    }

    if (destination) {
      agent.destination = destination
      agent.isMoving = true
      agent.path = undefined // Will be recalculated in updateAgentMovement
    }
  }

  private isAgentValid(agent: Agent): boolean {
    // Remove agents that are stuck, out of bounds, or no longer needed
    const worldBounds = this.config.worldSize / 2
    
    if (Math.abs(agent.position.x) > worldBounds || 
        Math.abs(agent.position.z) > worldBounds) {
      return false
    }

    // Remove citizens without homes (simplified)
    if (agent.type === 'citizen' && !agent.homeId) {
      return false
    }

    return true
  }

  private spawnNewAgents(): void {
    // Spawn citizens for residential buildings that don't have enough residents
    this.buildings
      .filter(b => b.zoneType === 'residential' && b.status === 'operational')
      .forEach(building => {
        const existingResidents = this.agents.filter(a => 
          a.type === 'citizen' && a.homeId === building.id
        ).length
        
        const capacity = building.capacity || 0
        if (existingResidents < capacity && Math.random() < 0.01) { // 1% chance to spawn
          this.spawnCitizen(building)
        }
      })
  }

  private spawnCitizen(home: Building): void {
    const spawnPosition = new THREE.Vector3(
      home.position.x + (Math.random() - 0.5) * 4,
      0.5,
      home.position.z + (Math.random() - 0.5) * 4
    )

    const ages: Array<'child' | 'adult' | 'elderly'> = ['child', 'adult', 'adult', 'elderly']
    const age = ages[Math.floor(Math.random() * ages.length)]
    
    const citizen: Agent = {
      id: `citizen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'citizen',
      position: spawnPosition,
      rotation: 0,
      velocity: new THREE.Vector3(),
      speed: age === 'child' ? 1.2 : age === 'elderly' ? 0.8 : 1.5,
      destination: undefined,
      path: undefined,
      currentPathIndex: 0,
      isMoving: false,
      status: {
        education: age === 'child' ? 'none' : Math.random() > 0.3 ? 'secondary' : 'primary',
        employment: age === 'adult' && Math.random() > 0.2 ? 'employed' : 
                   age === 'child' ? 'student' : 
                   age === 'elderly' ? 'retired' : 'unemployed',
        housing: 'housed',
        wealth: home.wealthLevel,
        health: 80 + Math.random() * 20,
        happiness: 70 + Math.random() * 20,
        age
      },
      homeId: home.id,
      schedule: [],
      needs: {
        food: 70 + Math.random() * 20,
        shelter: 90 + Math.random() * 10,
        employment: age === 'adult' ? 60 + Math.random() * 30 : 100,
        education: age === 'child' ? 50 + Math.random() * 40 : 80,
        healthcare: 80 + Math.random() * 15,
        recreation: 60 + Math.random() * 30,
        social: 65 + Math.random() * 25
      },
      personality: {
        ambition: Math.random(),
        sociability: Math.random(),
        patience: Math.random(),
        environmentalism: Math.random()
      },
      income: 0,
      expenses: 0,
      savings: Math.random() * 1000
    }

    this.agents.push(citizen)
    console.log(`👤 Spawned citizen in ${home.name}`)
  }

  private updateEconomics(deltaTime: number): void {
    const report = this.economicEngine.updateEconomy(deltaTime, this.buildings, this.agents)
    
    // Log significant economic events
    if (report.unemployment > 20) {
      console.warn('⚠️ High unemployment detected:', report.unemployment.toFixed(1) + '%')
    }
    
    if (report.inflation > 10) {
      console.warn('⚠️ High inflation detected:', report.inflation.toFixed(1) + '%')
    }
  }

  private schedulePathfindingUpdate(): void {
    this.updateIntervals.set('pathfinding_last', this.state.totalGameTime - 1) // Force update on next frame
  }

  private recordPerformanceMetrics(): void {
    const metrics = {
      fps: this.state.averageFPS,
      totalAgents: this.agents.length,
      totalBuildings: this.buildings.length,
      pathfindingTime: this.state.performanceMetrics.pathfindingTime,
      economicsTime: this.state.performanceMetrics.economicsTime,
      agentUpdateTime: this.state.performanceMetrics.agentUpdateTime,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
    }

    this.performanceHistory.push({
      timestamp: this.state.totalGameTime,
      metrics
    })

    // Limit history size
    if (this.performanceHistory.length > this.maxHistoryLength) {
      this.performanceHistory.shift()
    }

    // Log performance warnings
    if (metrics.fps < 30) {
      console.warn('⚠️ Low FPS detected:', metrics.fps.toFixed(1))
    }
  }

  // Public API methods
  public addBuilding(building: Building): void {
    this.buildings.push(building)
    
    if (building.status === 'operational') {
      this.schedulePathfindingUpdate()
    }
  }

  public removeBuilding(buildingId: string): void {
    const index = this.buildings.findIndex(b => b.id === buildingId)
    if (index !== -1) {
      this.buildings.splice(index, 1)
      this.schedulePathfindingUpdate()
      
      // Remove agents associated with this building
      this.agents = this.agents.filter(a => 
        a.homeId !== buildingId && a.workplaceId !== buildingId && a.schoolId !== buildingId
      )
    }
  }

  public addRoad(roadPoints: THREE.Vector3[]): void {
    this.roads.push(roadPoints)
    this.schedulePathfindingUpdate()
  }

  public getSimulationState(): SimulationState {
    return { ...this.state }
  }

  public getBuildings(): Building[] {
    return [...this.buildings]
  }

  public getAgents(): Agent[] {
    return [...this.agents]
  }

  public getRoads(): THREE.Vector3[][] {
    return [...this.roads]
  }

  public getPerformanceMetrics(): Array<{ timestamp: number, metrics: any }> {
    return [...this.performanceHistory]
  }

  public getPathfindingSystem(): PathfindingSystem {
    return this.pathfindingSystem
  }

  public getEconomicEngine(): EconomicEngine {
    return this.economicEngine
  }

  public getTerrainSystem(): TerrainSystem {
    return this.terrainSystem
  }

  public dispose(): void {
    this.stop()
    this.buildings = []
    this.agents = []
    this.roads = []
    this.performanceHistory = []
    
    console.log('🗑️ City simulation disposed')
  }
}
