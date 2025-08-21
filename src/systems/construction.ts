import * as THREE from 'three'
import { Building, BuildingBlueprint, ConstructionSite } from '../types/buildings'
import { BUILDING_CONFIG, ECONOMY_CONFIG } from '../utils/gameConstants'

export interface ConstructionProject {
  id: string
  buildingId: string
  blueprint: BuildingBlueprint
  position: THREE.Vector3
  rotation: number
  startDate: number
  estimatedCompletion: number
  actualProgress: number
  scheduledProgress: number
  workers: number
  maxWorkers: number
  dailyCost: number
  totalCostPaid: number
  totalCostEstimated: number
  materials: ConstructionMaterial[]
  phases: ConstructionPhase[]
  currentPhase: number
  isDelayed: boolean
  delayReason?: string
  weatherImpact: number
  qualityRating: number
  inspectionsPassed: number
  safetyIncidents: number
}

export interface ConstructionMaterial {
  type: string
  required: number
  delivered: number
  cost: number
  supplier: string
  deliveryDate?: number
  quality: number
}

export interface ConstructionPhase {
  name: string
  description: string
  duration: number
  startProgress: number
  endProgress: number
  requiredMaterials: string[]
  requiredWorkers: number
  isCompleted: boolean
  actualDuration?: number
  qualityCheck: boolean
}

export interface ConstructionWorker {
  id: string
  name: string
  skillLevel: number
  specialization: string
  efficiency: number
  salary: number
  assignedProjectId?: string
  availability: boolean
}

export interface ConstructionReport {
  activeProjects: number
  completedProjects: number
  totalInvestment: number
  averageCompletionTime: number
  averageQuality: number
  delayedProjects: number
  workerUtilization: number
  materialEfficiency: number
}

export class ConstructionSystem {
  private projects: Map<string, ConstructionProject>
  private workers: ConstructionWorker[]
  private materialPrices: Map<string, number>
  private completedProjects: ConstructionProject[]
  private constructionQueue: string[]
  
  // Economic factors
  private laborCostMultiplier: number
  private materialCostMultiplier: number
  private weatherConditions: number
  private economicConditions: number

  constructor() {
    this.projects = new Map()
    this.workers = []
    this.materialPrices = new Map()
    this.completedProjects = []
    this.constructionQueue = []
    
    this.laborCostMultiplier = 1.0
    this.materialCostMultiplier = 1.0
    this.weatherConditions = 1.0 // 1.0 = optimal, 0.5 = poor weather
    this.economicConditions = 1.0
    
    this.initializeSystem()
    console.log('🏗️ Construction system initialized')
  }

  private initializeSystem(): void {
    // Initialize material prices
    const materials = [
      { type: 'concrete', basePrice: 150 },
      { type: 'steel', basePrice: 800 },
      { type: 'lumber', basePrice: 400 },
      { type: 'brick', basePrice: 300 },
      { type: 'glass', basePrice: 200 },
      { type: 'electrical', basePrice: 1000 },
      { type: 'plumbing', basePrice: 600 },
      { type: 'roofing', basePrice: 250 },
      { type: 'insulation', basePrice: 180 },
      { type: 'flooring', basePrice: 350 }
    ]
    
    materials.forEach(material => {
      this.materialPrices.set(material.type, material.basePrice)
    })
    
    // Initialize some workers
    this.generateInitialWorkers()
  }

  private generateInitialWorkers(): void {
    const specializations = [
      'general', 'electrical', 'plumbing', 'masonry', 'carpentry', 
      'roofing', 'hvac', 'landscaping', 'heavy_machinery'
    ]
    
    const workerCount = 20 + Math.floor(Math.random() * 10)
    
    for (let i = 0; i < workerCount; i++) {
      const specialization = specializations[Math.floor(Math.random() * specializations.length)]
      const skillLevel = 1 + Math.random() * 9 // 1-10 skill level
      
      const worker: ConstructionWorker = {
        id: `worker_${Date.now()}_${i}`,
        name: `Worker ${i + 1}`,
        skillLevel,
        specialization,
        efficiency: 0.6 + (skillLevel / 10) * 0.4, // 0.6 to 1.0
        salary: 25000 + skillLevel * 5000 + Math.random() * 5000,
        availability: true
      }
      
      this.workers.push(worker)
    }
    
    console.log(`👷 Generated ${this.workers.length} construction workers`)
  }

  public startConstruction(
    building: Building, 
    blueprint: BuildingBlueprint, 
    position: THREE.Vector3,
    rotation: number = 0
  ): string {
    const projectId = `construction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Calculate construction phases
    const phases = this.generateConstructionPhases(blueprint)
    
    // Calculate material requirements
    const materials = this.calculateMaterialRequirements(blueprint)
    
    // Estimate costs and timeline
    const totalCostEstimated = this.estimateTotalCost(blueprint, materials)
    const estimatedDuration = this.estimateConstructionTime(blueprint, phases)
    
    const project: ConstructionProject = {
      id: projectId,
      buildingId: building.id,
      blueprint,
      position: position.clone(),
      rotation,
      startDate: Date.now(),
      estimatedCompletion: Date.now() + estimatedDuration,
      actualProgress: 0,
      scheduledProgress: 0,
      workers: 0,
      maxWorkers: this.calculateOptimalWorkerCount(blueprint),
      dailyCost: totalCostEstimated / (estimatedDuration / (24 * 60 * 60 * 1000)),
      totalCostPaid: 0,
      totalCostEstimated,
      materials,
      phases,
      currentPhase: 0,
      isDelayed: false,
      weatherImpact: 1.0,
      qualityRating: 1.0,
      inspectionsPassed: 0,
      safetyIncidents: 0
    }
    
    this.projects.set(projectId, project)
    this.assignWorkers(projectId)
    this.orderMaterials(projectId)
    
    console.log(`🏗️ Started construction project: ${blueprint.name} (${projectId})`)
    
    return projectId
  }

  private generateConstructionPhases(blueprint: BuildingBlueprint): ConstructionPhase[] {
    const phases: ConstructionPhase[] = []
    
    // Foundation phase
    phases.push({
      name: 'Foundation',
      description: 'Site preparation and foundation work',
      duration: blueprint.constructionTime * 0.2,
      startProgress: 0,
      endProgress: 0.2,
      requiredMaterials: ['concrete', 'steel'],
      requiredWorkers: 4,
      isCompleted: false,
      qualityCheck: true
    })
    
    // Structure phase
    phases.push({
      name: 'Structure',
      description: 'Main structural construction',
      duration: blueprint.constructionTime * 0.4,
      startProgress: 0.2,
      endProgress: 0.6,
      requiredMaterials: ['steel', 'concrete', 'lumber'],
      requiredWorkers: 8,
      isCompleted: false,
      qualityCheck: true
    })
    
    // Systems phase
    phases.push({
      name: 'Systems',
      description: 'Electrical, plumbing, and HVAC installation',
      duration: blueprint.constructionTime * 0.25,
      startProgress: 0.6,
      endProgress: 0.85,
      requiredMaterials: ['electrical', 'plumbing'],
      requiredWorkers: 6,
      isCompleted: false,
      qualityCheck: true
    })
    
    // Finishing phase
    phases.push({
      name: 'Finishing',
      description: 'Interior and exterior finishing work',
      duration: blueprint.constructionTime * 0.15,
      startProgress: 0.85,
      endProgress: 1.0,
      requiredMaterials: ['flooring', 'roofing', 'glass'],
      requiredWorkers: 6,
      isCompleted: false,
      qualityCheck: true
    })
    
    return phases
  }

  private calculateMaterialRequirements(blueprint: BuildingBlueprint): ConstructionMaterial[] {
    const buildingSize = blueprint.size.width * blueprint.size.depth * blueprint.size.height
    const materials: ConstructionMaterial[] = []
    
    // Calculate material quantities based on building size and type
    const materialRequirements = {
      concrete: buildingSize * 0.8,
      steel: buildingSize * 0.3,
      lumber: buildingSize * 0.4,
      brick: buildingSize * 0.2,
      glass: buildingSize * 0.1,
      electrical: Math.max(1, Math.floor(buildingSize / 100)),
      plumbing: Math.max(1, Math.floor(buildingSize / 150)),
      roofing: blueprint.size.width * blueprint.size.depth,
      insulation: buildingSize * 0.2,
      flooring: blueprint.size.width * blueprint.size.depth * 2
    }
    
    Object.entries(materialRequirements).forEach(([type, required]) => {
      const basePrice = this.materialPrices.get(type) || 100
      const cost = basePrice * required * this.materialCostMultiplier
      
      materials.push({
        type,
        required,
        delivered: 0,
        cost,
        supplier: `${type.charAt(0).toUpperCase() + type.slice(1)} Supplier`,
        quality: 0.8 + Math.random() * 0.2
      })
    })
    
    return materials
  }

  private estimateTotalCost(blueprint: BuildingBlueprint, materials: ConstructionMaterial[]): number {
    // Base construction cost
    let totalCost = blueprint.cost
    
    // Material costs
    const materialCost = materials.reduce((sum, material) => sum + material.cost, 0)
    totalCost += materialCost
    
    // Labor costs (40% of total construction cost)
    const laborCost = totalCost * 0.4 * this.laborCostMultiplier
    totalCost += laborCost
    
    // Overhead and permits (15% of total)
    const overhead = totalCost * 0.15
    totalCost += overhead
    
    return Math.round(totalCost)
  }

  private estimateConstructionTime(blueprint: BuildingBlueprint, phases: ConstructionPhase[]): number {
    const baseDuration = phases.reduce((sum, phase) => sum + phase.duration, 0)
    
    // Adjust for weather and economic conditions
    const adjustedDuration = baseDuration / (this.weatherConditions * this.economicConditions)
    
    return adjustedDuration * 24 * 60 * 60 * 1000 // Convert to milliseconds
  }

  private calculateOptimalWorkerCount(blueprint: BuildingBlueprint): number {
    const buildingComplexity = blueprint.size.width * blueprint.size.depth * blueprint.size.height / 100
    return Math.max(2, Math.min(12, Math.floor(buildingComplexity / 2) + 2))
  }

  private assignWorkers(projectId: string): void {
    const project = this.projects.get(projectId)
    if (!project) return
    
    const currentPhase = project.phases[project.currentPhase]
    const requiredWorkers = Math.min(currentPhase.requiredWorkers, project.maxWorkers)
    
    // Find available workers with relevant skills
    const availableWorkers = this.workers.filter(worker => 
      worker.availability && 
      (worker.specialization === 'general' || 
       currentPhase.requiredMaterials.some(material => 
         worker.specialization.includes(material) || 
         material.includes(worker.specialization)
       ))
    )
    
    const assignedWorkers = availableWorkers.slice(0, requiredWorkers)
    
    assignedWorkers.forEach(worker => {
      worker.availability = false
      worker.assignedProjectId = projectId
    })
    
    project.workers = assignedWorkers.length
    
    console.log(`👷 Assigned ${assignedWorkers.length} workers to project ${projectId}`)
  }

  private orderMaterials(projectId: string): void {
    const project = this.projects.get(projectId)
    if (!project) return
    
    // Order materials for current phase
    const currentPhase = project.phases[project.currentPhase]
    
    project.materials.forEach(material => {
      if (currentPhase.requiredMaterials.includes(material.type) && material.delivered < material.required) {
        // Simulate material delivery (2-5 days)
        const deliveryTime = 2 + Math.random() * 3
        material.deliveryDate = Date.now() + deliveryTime * 24 * 60 * 60 * 1000
        
        console.log(`📦 Ordered ${material.type} for project ${projectId} (delivery in ${deliveryTime.toFixed(1)} days)`)
      }
    })
  }

  public updateConstruction(building: Building, deltaTime: number): void {
    const project = this.projects.get(building.id)
    if (!project) return
    
    // Update scheduled progress
    const currentTime = Date.now()
    const elapsedTime = currentTime - project.startDate
    const totalDuration = project.estimatedCompletion - project.startDate
    project.scheduledProgress = Math.min(1, elapsedTime / totalDuration)
    
    // Check material availability
    const currentPhase = project.phases[project.currentPhase]
    const materialsAvailable = this.checkMaterialAvailability(project, currentPhase)
    
    if (!materialsAvailable) {
      project.isDelayed = true
      project.delayReason = 'Material shortage'
      building.constructionProgress = project.actualProgress
      return
    }
    
    // Calculate actual progress based on workers and conditions
    const progressRate = this.calculateProgressRate(project)
    const progressIncrement = progressRate * deltaTime / (24 * 60 * 60) // Convert to daily progress
    
    project.actualProgress += progressIncrement
    project.actualProgress = Math.min(1, project.actualProgress)
    
    // Update building progress
    building.constructionProgress = project.actualProgress
    
    // Update daily costs
    project.totalCostPaid += project.dailyCost * deltaTime / (24 * 60 * 60)
    
    // Check phase completion
    if (project.actualProgress >= currentPhase.endProgress && !currentPhase.isCompleted) {
      this.completePhase(project, project.currentPhase)
    }
    
    // Check project completion
    if (project.actualProgress >= 1.0) {
      this.completeProject(project, building)
    }
    
    // Update quality based on worker skill and materials
    this.updateQuality(project)
    
    // Random events (weather, accidents, etc.)
    this.processRandomEvents(project, deltaTime)
  }

  private checkMaterialAvailability(project: ConstructionProject, phase: ConstructionPhase): boolean {
    return phase.requiredMaterials.every(materialType => {
      const material = project.materials.find(m => m.type === materialType)
      return material && 
             material.deliveryDate && 
             material.deliveryDate <= Date.now() &&
             material.delivered >= material.required * 0.5 // At least 50% delivered
    })
  }

  private calculateProgressRate(project: ConstructionProject): number {
    let baseRate = 1.0 / (project.blueprint.constructionTime || 30) // Daily progress rate
    
    // Worker efficiency factor
    const averageEfficiency = this.getProjectWorkerEfficiency(project.id)
    baseRate *= averageEfficiency
    
    // Weather factor
    baseRate *= this.weatherConditions
    
    // Material quality factor
    const averageMaterialQuality = project.materials.reduce((sum, m) => sum + m.quality, 0) / project.materials.length
    baseRate *= averageMaterialQuality
    
    // Economic conditions
    baseRate *= this.economicConditions
    
    return baseRate
  }

  private getProjectWorkerEfficiency(projectId: string): number {
    const projectWorkers = this.workers.filter(w => w.assignedProjectId === projectId)
    
    if (projectWorkers.length === 0) return 0.1 // Very slow without workers
    
    const totalEfficiency = projectWorkers.reduce((sum, worker) => sum + worker.efficiency, 0)
    return totalEfficiency / projectWorkers.length
  }

  private completePhase(project: ConstructionProject, phaseIndex: number): void {
    const phase = project.phases[phaseIndex]
    phase.isCompleted = true
    phase.actualDuration = Date.now() - project.startDate
    
    // Quality check
    if (phase.qualityCheck) {
      const qualityScore = this.performQualityInspection(project)
      project.qualityRating = (project.qualityRating + qualityScore) / 2
      
      if (qualityScore > 0.8) {
        project.inspectionsPassed++
      }
    }
    
    // Move to next phase
    if (phaseIndex < project.phases.length - 1) {
      project.currentPhase++
      this.assignWorkers(project.id) // Reassign workers for new phase
      this.orderMaterials(project.id) // Order materials for new phase
    }
    
    console.log(`✅ Completed phase: ${phase.name} for project ${project.id}`)
  }

  private performQualityInspection(project: ConstructionProject): number {
    const workerSkill = this.getProjectWorkerEfficiency(project.id)
    const materialQuality = project.materials.reduce((sum, m) => sum + m.quality, 0) / project.materials.length
    const timePerformance = project.actualProgress >= project.scheduledProgress ? 1.0 : 0.8
    
    return (workerSkill + materialQuality + timePerformance) / 3
  }

  private completeProject(project: ConstructionProject, building: Building): void {
    // Release workers
    this.workers.forEach(worker => {
      if (worker.assignedProjectId === project.id) {
        worker.availability = true
        worker.assignedProjectId = undefined
      }
    })
    
    // Calculate final costs
    const finalCostOverrun = project.totalCostPaid - project.totalCostEstimated
    if (finalCostOverrun > 0) {
      console.log(`⚠️ Project ${project.id} went over budget by $${finalCostOverrun.toLocaleString()}`)
    }
    
    // Update building status
    building.status = 'operational'
    building.constructionProgress = 1.0
    
    // Apply quality bonuses/penalties
    if (project.qualityRating > 0.9) {
      building.property_value *= 1.1 // 10% bonus for high quality
    } else if (project.qualityRating < 0.6) {
      building.property_value *= 0.9 // 10% penalty for poor quality
    }
    
    // Move to completed projects
    this.completedProjects.push(project)
    this.projects.delete(project.id)
    
    console.log(`🎉 Construction completed: ${project.blueprint.name} (Quality: ${(project.qualityRating * 100).toFixed(1)}%)`)
  }

  private updateQuality(project: ConstructionProject): void {
    // Quality can be affected by various factors during construction
    const workerQuality = this.getProjectWorkerEfficiency(project.id)
    const materialQuality = project.materials.reduce((sum, m) => sum + m.quality, 0) / project.materials.length
    
    // Weather impact on quality
    if (this.weatherConditions < 0.7) {
      project.qualityRating *= 0.998 // Slight degradation in poor weather
    }
    
    // Safety incidents impact quality
    if (project.safetyIncidents > 0) {
      project.qualityRating *= Math.pow(0.95, project.safetyIncidents)
    }
    
    // High skill workers improve quality over time
    if (workerQuality > 0.8) {
      project.qualityRating = Math.min(1.0, project.qualityRating * 1.001)
    }
  }

  private processRandomEvents(project: ConstructionProject, deltaTime: number): void {
    const eventChance = deltaTime * 0.001 // Very small chance per second
    
    if (Math.random() < eventChance) {
      const events = [
        'weather_delay',
        'material_delay',
        'equipment_breakdown',
        'worker_injury',
        'permit_delay',
        'design_change'
      ]
      
      const event = events[Math.floor(Math.random() * events.length)]
      this.processConstructionEvent(project, event)
    }
  }

  private processConstructionEvent(project: ConstructionProject, eventType: string): void {
    switch (eventType) {
      case 'weather_delay':
        this.weatherConditions = Math.max(0.3, this.weatherConditions - 0.2)
        project.isDelayed = true
        project.delayReason = 'Weather conditions'
        console.log(`🌧️ Weather delay affecting project ${project.id}`)
        break
        
      case 'material_delay':
        const randomMaterial = project.materials[Math.floor(Math.random() * project.materials.length)]
        if (randomMaterial.deliveryDate) {
          randomMaterial.deliveryDate += 2 * 24 * 60 * 60 * 1000 // 2 day delay
        }
        project.isDelayed = true
        project.delayReason = `${randomMaterial.type} delivery delay`
        console.log(`📦 Material delay for ${randomMaterial.type} in project ${project.id}`)
        break
        
      case 'worker_injury':
        project.safetyIncidents++
        project.workers = Math.max(1, project.workers - 1)
        project.qualityRating *= 0.95
        console.log(`🚑 Worker injury in project ${project.id}`)
        break
        
      case 'equipment_breakdown':
        // Temporary slowdown
        project.dailyCost *= 1.1
        console.log(`🔧 Equipment breakdown in project ${project.id}`)
        break
        
      default:
        project.isDelayed = true
        project.delayReason = eventType.replace('_', ' ')
    }
  }

  // Public API methods
  public getActiveProjects(): ConstructionProject[] {
    return Array.from(this.projects.values())
  }

  public getProject(projectId: string): ConstructionProject | undefined {
    return this.projects.get(projectId)
  }

  public cancelProject(projectId: string): boolean {
    const project = this.projects.get(projectId)
    if (!project) return false
    
    // Release workers
    this.workers.forEach(worker => {
      if (worker.assignedProjectId === projectId) {
        worker.availability = true
        worker.assignedProjectId = undefined
      }
    })
    
    // Calculate cancellation costs
    const cancellationPenalty = project.totalCostPaid * 0.2 // 20% penalty
    console.log(`❌ Project ${projectId} cancelled. Penalty: $${cancellationPenalty.toLocaleString()}`)
    
    this.projects.delete(projectId)
    return true
  }

  public hireWorkers(count: number, specialization: string = 'general'): number {
    let hired = 0
    
    for (let i = 0; i < count; i++) {
      const skillLevel = 1 + Math.random() * 9
      
      const worker: ConstructionWorker = {
        id: `worker_${Date.now()}_${this.workers.length}`,
        name: `Worker ${this.workers.length + 1}`,
        skillLevel,
        specialization,
        efficiency: 0.6 + (skillLevel / 10) * 0.4,
        salary: 25000 + skillLevel * 5000 + Math.random() * 5000,
        availability: true
      }
      
      this.workers.push(worker)
      hired++
    }
    
    console.log(`👷 Hired ${hired} new workers (${specialization})`)
    return hired
  }

  public fireWorker(workerId: string): boolean {
    const index = this.workers.findIndex(w => w.id === workerId)
    if (index === -1) return false
    
    const worker = this.workers[index]
    
    // If worker is assigned to a project, remove them
    if (worker.assignedProjectId) {
      const project = this.projects.get(worker.assignedProjectId)
      if (project) {
        project.workers = Math.max(0, project.workers - 1)
      }
    }
    
    this.workers.splice(index, 1)
    console.log(`❌ Fired worker: ${worker.name}`)
    return true
  }

  public updateWeatherConditions(conditions: number): void {
    this.weatherConditions = Math.max(0.1, Math.min(1.0, conditions))
  }

  public updateEconomicConditions(conditions: number): void {
    this.economicConditions = Math.max(0.1, Math.min(1.5, conditions))
  }

  public updateMaterialPrices(priceChanges: Map<string, number>): void {
    priceChanges.forEach((newPrice, material) => {
      this.materialPrices.set(material, newPrice)
    })
  }

  public generateConstructionReport(): ConstructionReport {
    const activeProjects = this.projects.size
    const completedProjects = this.completedProjects.length
    
    const totalInvestment = Array.from(this.projects.values())
      .reduce((sum, project) => sum + project.totalCostPaid, 0) +
      this.completedProjects.reduce((sum, project) => sum + project.totalCostPaid, 0)
    
    const averageCompletionTime = this.completedProjects.length > 0
      ? this.completedProjects.reduce((sum, project) => 
          sum + (project.estimatedCompletion - project.startDate), 0) / this.completedProjects.length
      : 0
    
    const averageQuality = this.completedProjects.length > 0
      ? this.completedProjects.reduce((sum, project) => sum + project.qualityRating, 0) / this.completedProjects.length
      : 0
    
    const delayedProjects = Array.from(this.projects.values()).filter(p => p.isDelayed).length
    
    const busyWorkers = this.workers.filter(w => !w.availability).length
    const workerUtilization = this.workers.length > 0 ? busyWorkers / this.workers.length : 0
    
    const materialEfficiency = 0.85 // Simplified metric
    
    return {
      activeProjects,
      completedProjects,
      totalInvestment,
      averageCompletionTime,
      averageQuality,
      delayedProjects,
      workerUtilization,
      materialEfficiency
    }
  }

  public getAvailableWorkers(): ConstructionWorker[] {
    return this.workers.filter(w => w.availability)
  }

  public getMaterialPrices(): Map<string, number> {
    return new Map(this.materialPrices)
  }

  public dispose(): void {
    this.projects.clear()
    this.workers = []
    this.materialPrices.clear()
    this.completedProjects = []
    this.constructionQueue = []
    
    console.log('🗑️ Construction system disposed')
  }
}
