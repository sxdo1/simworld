import { EconomicData, Business, TradeGood, MarketConditions } from '../types/economy'
import { Building } from '../types/buildings'
import { Agent } from '../types/agents'

export interface EconomicReport {
  gdp: number
  unemployment: number
  inflation: number
  tradeBalance: number
  governmentRevenue: number
  governmentExpenses: number
  cityRating: string
}

export interface MarketAnalysis {
  demand: Record<string, number>
  supply: Record<string, number>
  prices: Record<string, number>
  trends: Record<string, 'rising' | 'falling' | 'stable'>
}

export class EconomicEngine {
  private economicData: EconomicData
  private businesses: Business[]
  private tradeGoods: Map<string, TradeGood>
  private marketHistory: Array<{ timestamp: number, data: MarketAnalysis }>
  private inflationRate: number
  private interestRate: number

  constructor(initialData: EconomicData) {
    this.economicData = { ...initialData }
    this.businesses = []
    this.tradeGoods = new Map()
    this.marketHistory = []
    this.inflationRate = 0.02
    this.interestRate = 0.05
    
    this.initializeTradeGoods()
  }

  private initializeTradeGoods(): void {
    const baseGoods = [
      { id: 'food', name: 'Food Products', type: 'food', basePrice: 100 },
      { id: 'materials', name: 'Raw Materials', type: 'raw_materials', basePrice: 200 },
      { id: 'manufactured', name: 'Manufactured Goods', type: 'manufactured_goods', basePrice: 300 },
      { id: 'luxury', name: 'Luxury Items', type: 'luxury_items', basePrice: 500 },
      { id: 'energy', name: 'Energy', type: 'energy', basePrice: 150 },
      { id: 'technology', name: 'Technology', type: 'technology', basePrice: 400 }
    ]

    baseGoods.forEach(good => {
      this.tradeGoods.set(good.id, {
        ...good,
        currentPrice: good.basePrice,
        demand: 100,
        supply: 100,
        quality: 1.0,
        imported: true
      } as TradeGood)
    })
  }

  public updateEconomy(deltaTime: number, buildings: Building[], agents: Agent[]): EconomicReport {
    // Update market conditions
    this.updateMarketConditions(buildings, agents)
    
    // Update businesses
    this.updateBusinesses(buildings, agents, deltaTime)
    
    // Update trade goods
    this.updateTradeGoods(deltaTime)
    
    // Update taxes
    this.updateTaxation(buildings)
    
    // Update economic indicators
    this.updateEconomicIndicators(deltaTime)
    
    // Process loans and interest
    this.updateLoansAndInterest(deltaTime)
    
    // Update city rating
    this.updateCityRating()

    return this.generateEconomicReport(buildings, agents)
  }

  private updateMarketConditions(buildings: Building[], agents: Agent[]): void {
    const residents = agents.filter(a => a.type === 'citizen')
    const population = residents.length

    // Calculate employment rate
    const employedCitizens = residents.filter(a => a.status.employment === 'employed').length
    const unemploymentRate = population > 0 ? (population - employedCitizens) / population : 0

    // Update demand based on population and employment
    const zones = ['residential', 'commercial', 'industrial', 'office'] as const
    const wealthLevels = ['low', 'medium', 'high'] as const

    zones.forEach(zone => {
      wealthLevels.forEach(wealth => {
        // Base demand calculation
        let demand = population * 0.01
        
        // Adjust for employment
        demand *= (1 - unemploymentRate * 0.5)
        
        // Adjust for wealth distribution
        const wealthFactor = wealth === 'low' ? 0.6 : wealth === 'medium' ? 1.0 : 1.8
        demand *= wealthFactor
        
        // Zone-specific adjustments
        switch (zone) {
          case 'residential':
            demand *= 1.2 // Higher residential demand
            break
          case 'commercial':
            demand *= 0.8 + (employedCitizens / Math.max(1, population)) * 0.4
            break
          case 'industrial':
            demand *= 0.6 // Lower but steady industrial demand
            break
          case 'office':
            demand *= 0.7 + (this.economicData.cityLevel - 1) * 0.1
            break
        }

        this.economicData.marketConditions.demandByZone[zone][wealth] = Math.max(0, demand)
      })
    })

    // Calculate supply based on existing buildings
    zones.forEach(zone => {
      wealthLevels.forEach(wealth => {
        const relevantBuildings = buildings.filter(b => 
          b.zoneType === zone && 
          b.wealthLevel === wealth && 
          b.status === 'operational'
        )
        
        const supply = relevantBuildings.reduce((total, building) => 
          total + (building.capacity || 0), 0
        )
        
        this.economicData.marketConditions.supplyByZone[zone][wealth] = supply
      })
    })
  }

  private updateBusinesses(buildings: Building[], agents: Agent[], deltaTime: number): void {
    this.businesses.forEach(business => {
      const building = buildings.find(b => b.id === business.buildingId)
      if (!building || building.status !== 'operational') {
        business.isOperational = false
        return
      }

      // Calculate revenue based on business type and market conditions
      const revenue = this.calculateBusinessRevenue(business, building, agents)
      
      // Calculate operating costs
      const operatingCosts = this.calculateOperatingCosts(business, building)
      
      // Update business metrics
      business.revenue = revenue * deltaTime * 24 // Daily revenue
      business.operatingCosts = operatingCosts * deltaTime * 24 // Daily costs
      business.profit = business.revenue - business.operatingCosts

      // Update efficiency based on location and market conditions
      business.efficiency = this.calculateBusinessEfficiency(business, building, agents)
      
      // Update customer satisfaction
      business.customerSatisfaction = this.calculateCustomerSatisfaction(business, building)
      
      // Track profitability
      if (business.profit > 0) {
        business.daysSinceProfit = 0
      } else {
        business.daysSinceProfit += deltaTime
      }
      
      // Calculate bankruptcy risk
      business.bankruptcyRisk = Math.min(1, business.daysSinceProfit / 30)
      
      // Update employment
      this.updateBusinessEmployment(business, building, agents)
    })
  }

  private calculateBusinessRevenue(business: Business, building: Building, agents: Agent[]): number {
    let baseRevenue = 1000 // Base daily revenue

    // Location factors
    baseRevenue *= (1 + business.accessibility * 0.3)
    baseRevenue *= (1 + business.footTraffic * 0.5)
    baseRevenue *= (1 + business.prestige * 0.2)

    // Market demand factor
    if (building.zoneType) {
      const demand = this.economicData.marketConditions.demandByZone[building.zoneType]?.[building.wealthLevel] || 1
      baseRevenue *= Math.max(0.1, Math.min(2, demand / 100))
    }

    // Customer base (nearby residents)
    const nearbyResidents = agents.filter(agent => 
      agent.type === 'citizen' && 
      agent.homeId && 
      building.position.distanceTo(agent.position) < 20
    ).length

    baseRevenue *= (1 + nearbyResidents * 0.01)

    // Business type multipliers
    const typeMultipliers = {
      retail_store: 1.0,
      restaurant: 1.3,
      service_shop: 0.8,
      entertainment: 1.5,
      manufacturing: 2.0,
      warehouse: 0.6,
      processing_plant: 1.8,
      logistics: 1.1,
      consulting: 1.4,
      tech_company: 2.2,
      financial_services: 1.6,
      corporate_office: 1.2
    }

    baseRevenue *= typeMultipliers[business.type as keyof typeof typeMultipliers] || 1.0

    return baseRevenue
  }

  private calculateOperatingCosts(business: Business, building: Building): number {
    let costs = 500 // Base operating costs

    // Rent based on building location and quality
    costs += business.rent || (building.property_value * 0.001)

    // Utility costs
    costs += building.capacity * 2

    // Wages
    costs += business.employees * business.wagesPerEmployee / 30 // Monthly wages to daily

    // Supply costs based on business type
    const supplyCosts = {
      retail_store: 0.4,
      restaurant: 0.6,
      service_shop: 0.2,
      manufacturing: 0.5,
      warehouse: 0.1,
      processing_plant: 0.7,
      office: 0.1
    }

    const supplyMultiplier = supplyCosts[business.type as keyof typeof supplyCosts] || 0.3
    costs += business.revenue * supplyMultiplier

    return costs
  }

  private calculateBusinessEfficiency(business: Business, building: Building, agents: Agent[]): number {
    let efficiency = 0.5 // Base efficiency

    // Location efficiency
    efficiency += business.accessibility * 0.2
    efficiency += business.prestige * 0.15

    // Employee skill factor
    const skillFactor = this.calculateAverageSkillLevel(business, agents)
    efficiency += skillFactor * 0.3

    // Building quality factor
    efficiency += (building.property_value / 100000) * 0.2

    // Market conditions
    if (building.zoneType) {
      const supplyDemandRatio = this.getSupplyDemandRatio(building.zoneType, building.wealthLevel)
      efficiency += Math.max(-0.2, Math.min(0.2, (1 - supplyDemandRatio) * 0.2))
    }

    return Math.max(0.1, Math.min(1.5, efficiency))
  }

  private calculateCustomerSatisfaction(business: Business, building: Building): number {
    let satisfaction = 0.7 // Base satisfaction

    // Quality factors
    satisfaction += business.efficiency * 0.2
    satisfaction += (building.property_value / 50000) * 0.1

    // Service quality (simplified)
    satisfaction += (business.employees / business.maxEmployees) * 0.2

    return Math.max(0, Math.min(1, satisfaction))
  }

  private calculateAverageSkillLevel(business: Business, agents: Agent[]): number {
    const employees = agents.filter(agent => 
      agent.workplaceId === business.buildingId && 
      agent.status.employment === 'employed'
    )

    if (employees.length === 0) return 0.3 // Low skill if no employees

    const skillLevels = {
      'none': 0.2,
      'primary': 0.4,
      'secondary': 0.6,
      'university': 0.8,
      'advanced': 1.0
    }

    const averageSkill = employees.reduce((sum, employee) => 
      sum + skillLevels[employee.status.education], 0) / employees.length

    return averageSkill
  }

  private updateBusinessEmployment(business: Business, building: Building, agents: Agent[]): void {
    const currentEmployees = agents.filter(agent => 
      agent.workplaceId === business.buildingId && 
      agent.status.employment === 'employed'
    ).length

    business.employees = currentEmployees
    
    // Determine hiring needs
    const optimalEmployees = Math.floor(business.maxEmployees * business.efficiency * 0.8)
    
    if (currentEmployees < optimalEmployees && business.profit > 0) {
      // Try to hire more employees (would integrate with agent system)
      business.maxEmployees = Math.min(business.maxEmployees + 1, building.capacity || 50)
    }
  }

  private updateTradeGoods(deltaTime: number): void {
    this.tradeGoods.forEach(good => {
      // Update supply based on local production
      if (good.type === 'manufactured_goods') {
        const industrialOutput = this.businesses.filter(b => 
          b.type.includes('manufacturing') && b.isOperational
        ).reduce((sum, b) => sum + b.efficiency, 0)
        
        good.supply = Math.max(50, 80 + industrialOutput * 10)
      }
      
      // Update demand based on population and business needs
      const populationFactor = this.economicData.wealthDistribution.low * 0.5 +
                              this.economicData.wealthDistribution.medium * 1.0 +
                              this.economicData.wealthDistribution.high * 1.5
      
      good.demand = Math.max(20, populationFactor + Math.random() * 20 - 10)
      
      // Update price based on supply and demand
      const supplyDemandRatio = good.supply / Math.max(1, good.demand)
      const priceMultiplier = Math.max(0.5, Math.min(2.0, 2 - supplyDemandRatio))
      
      good.currentPrice = Math.round(good.basePrice * priceMultiplier)
    })
  }

  private updateTaxation(buildings: Building[]): void {
    let totalRevenue = 0

    // Calculate property taxes
    buildings.forEach(building => {
      if (building.status === 'operational' && building.zoneType) {
        const taxRate = this.getTaxRate(building.zoneType) / 100
        const taxableValue = building.property_value
        const monthlyTax = taxableValue * taxRate / 12
        
        totalRevenue += monthlyTax / 30 // Daily tax
      }
    })

    // Calculate business taxes
    this.businesses.forEach(business => {
      if (business.isOperational && business.profit > 0) {
        const businessTaxRate = 0.25 // 25% business tax
        totalRevenue += business.profit * businessTaxRate
      }
    })

    this.economicData.totalTaxRevenue = totalRevenue
    this.economicData.income = totalRevenue
  }

  private updateEconomicIndicators(deltaTime: number): void {
    // Update GDP (simplified)
    const gdp = this.businesses.reduce((sum, business) => 
      sum + (business.isOperational ? business.revenue : 0), 0
    ) * 365 // Annualized

    // Update inflation
    this.inflationRate += (Math.random() - 0.5) * 0.001 // Small random fluctuation
    this.inflationRate = Math.max(0, Math.min(0.1, this.inflationRate))

    // Update wealth distribution (simplified)
    const totalWealth = this.businesses.reduce((sum, b) => sum + Math.max(0, b.profit), 0)
    if (totalWealth > 0) {
      this.economicData.wealthDistribution.low = Math.max(30, 60 - totalWealth * 0.01)
      this.economicData.wealthDistribution.high = Math.min(30, 10 + totalWealth * 0.005)
      this.economicData.wealthDistribution.medium = 100 - 
        this.economicData.wealthDistribution.low - this.economicData.wealthDistribution.high
    }
  }

  private updateLoansAndInterest(deltaTime: number): void {
    if (this.economicData.totalLoans > 0) {
      const dailyInterest = (this.economicData.totalLoans * this.interestRate) / 365
      this.economicData.expenses += dailyInterest * deltaTime
      this.economicData.netIncome = this.economicData.income - this.economicData.expenses
    }
  }

  private updateCityRating(): void {
    // Simple city rating calculation
    const financialHealth = Math.max(0, Math.min(1, this.economicData.funds / 100000))
    const economicGrowth = this.businesses.filter(b => b.isOperational && b.profit > 0).length / 
                          Math.max(1, this.businesses.length)
    const debtRatio = this.economicData.totalLoans / Math.max(1, this.economicData.funds)
    
    const score = (financialHealth * 0.4 + economicGrowth * 0.4 - Math.min(1, debtRatio) * 0.2) * 100
    
    if (score >= 80) this.economicData.creditRating = 100
    else if (score >= 60) this.economicData.creditRating = 80
    else if (score >= 40) this.economicData.creditRating = 60
    else this.economicData.creditRating = 40
  }

  private generateEconomicReport(buildings: Building[], agents: Agent[]): EconomicReport {
    const population = agents.filter(a => a.type === 'citizen').length
    const employedPopulation = agents.filter(a => 
      a.type === 'citizen' && a.status.employment === 'employed'
    ).length

    const unemployment = population > 0 ? (population - employedPopulation) / population * 100 : 0
    
    const gdp = this.businesses.reduce((sum, business) => 
      sum + (business.isOperational ? business.revenue : 0), 0
    ) * 365

    const exportValue = Array.from(this.tradeGoods.values()).reduce((sum, good) => 
      sum + (!good.imported ? good.supply * good.currentPrice : 0), 0
    )
    
    const importValue = Array.from(this.tradeGoods.values()).reduce((sum, good) => 
      sum + (good.imported ? good.demand * good.currentPrice : 0), 0
    )

    const tradeBalance = exportValue - importValue

    const cityRatings = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC']
    const ratingIndex = Math.floor((this.economicData.creditRating / 100) * (cityRatings.length - 1))
    const cityRating = cityRatings[ratingIndex] || 'CCC'

    return {
      gdp,
      unemployment,
      inflation: this.inflationRate * 100,
      tradeBalance,
      governmentRevenue: this.economicData.income,
      governmentExpenses: this.economicData.expenses,
      cityRating
    }
  }

  private getTaxRate(zoneType: string): number {
    const taxRates = {
      residential: this.economicData.residentialTaxRate,
      commercial: this.economicData.commercialTaxRate,
      industrial: this.economicData.industrialTaxRate,
      office: this.economicData.officeTaxRate
    }
    
    return taxRates[zoneType as keyof typeof taxRates] || 10
  }

  private getSupplyDemandRatio(zoneType: string, wealthLevel: string): number {
    const supply = this.economicData.marketConditions.supplyByZone[zoneType as keyof typeof this.economicData.marketConditions.supplyByZone]?.[wealthLevel as keyof typeof this.economicData.marketConditions.supplyByZone.residential] || 1
    const demand = this.economicData.marketConditions.demandByZone[zoneType as keyof typeof this.economicData.marketConditions.demandByZone]?.[wealthLevel as keyof typeof this.economicData.marketConditions.demandByZone.residential] || 1
    
    return supply / Math.max(1, demand)
  }

  public getMarketAnalysis(): MarketAnalysis {
    const analysis: MarketAnalysis = {
      demand: {},
      supply: {},
      prices: {},
      trends: {}
    }

    this.tradeGoods.forEach((good, id) => {
      analysis.demand[id] = good.demand
      analysis.supply[id] = good.supply
      analysis.prices[id] = good.currentPrice

      // Determine trend based on recent price history (simplified)
      if (good.currentPrice > good.basePrice * 1.1) {
        analysis.trends[id] = 'rising'
      } else if (good.currentPrice < good.basePrice * 0.9) {
        analysis.trends[id] = 'falling'
      } else {
        analysis.trends[id] = 'stable'
      }
    })

    return analysis
  }

  public addBusiness(business: Business): void {
    this.businesses.push(business)
  }

  public removeBusiness(businessId: string): void {
    this.businesses = this.businesses.filter(b => b.id !== businessId)
  }

  public getEconomicData(): EconomicData {
    return { ...this.economicData }
  }

  public getBusinesses(): Business[] {
    return [...this.businesses]
  }

  public getTradeGoods(): Map<string, TradeGood> {
    return new Map(this.tradeGoods)
  }
}
