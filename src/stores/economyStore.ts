import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { EconomicData, Business, MarketConditions, TradeGood, WealthLevel, ZoneType, EducationLevel } from '../types/economy'
import { ECONOMY_CONFIG } from '../utils/gameConstants'

interface EconomyStore extends EconomicData {
  // Business data
  businesses: Business[]
  marketConditions: MarketConditions
  
  // Economic indicators
  inflationRate: number
  gdpGrowth: number
  employmentGrowth: number
  
  // Actions
  initializeEconomy: () => void
  updateEconomy: (deltaTime: number) => void
  
  // Financial operations
  addFunds: (amount: number, source: string) => void
  subtractFunds: (amount: number, purpose: string) => boolean
  takeLoan: (amount: number) => boolean
  repayLoan: (amount: number) => boolean
  
  // Tax system
  setTaxRate: (zoneType: ZoneType, rate: number) => void
  calculateTaxRevenue: () => number
  
  // Trade system
  updateTradeGoods: () => void
  importGood: (goodId: string, quantity: number) => boolean
  exportGood: (goodId: string, quantity: number) => boolean
  setTariff: (goodId: string, rate: number) => void
  
  // Business operations
  createBusiness: (buildingId: string, businessType: string) => Business
  updateBusiness: (businessId: string, updates: Partial<Business>) => void
  closeBusiness: (businessId: string) => void
  
  // Market analysis
  calculateSupplyDemand: () => void
  updateMarketConditions: () => void
  getZoneDemand: (zoneType: ZoneType, wealthLevel: WealthLevel) => number
  calculateLandValue: (x: number, z: number) => number
  
  // Economic reports
  generateEconomicReport: () => {
    totalRevenue: number
    totalExpenses: number
    netIncome: number
    taxEfficiency: number
    tradeBalance: number
    economicGrowth: number
  }
}

export const useEconomyStore = create<EconomyStore>()(
  subscribeWithSelector((set, get) => ({
    // Core financial data
    funds: ECONOMY_CONFIG.STARTING_FUNDS,
    income: 0,
    expenses: 0,
    netIncome: 0,
    
    // Tax rates
    residentialTaxRate: ECONOMY_CONFIG.DEFAULT_TAX_RATES.residential,
    commercialTaxRate: ECONOMY_CONFIG.DEFAULT_TAX_RATES.commercial,
    industrialTaxRate: ECONOMY_CONFIG.DEFAULT_TAX_RATES.industrial,
    officeTaxRate: ECONOMY_CONFIG.DEFAULT_TAX_RATES.office,
    totalTaxRevenue: 0,
    
    // Loan system
    totalLoans: 0,
    loanLimit: ECONOMY_CONFIG.STARTING_LOAN_LIMIT,
    interestRate: ECONOMY_CONFIG.BASE_INTEREST_RATE,
    creditRating: 100, // Perfect credit at start
    
    // City progression
    cityLevel: 1,
    experience: 0,
    nextLevelRequirement: 1000,
    
    // Trade system - Initialize with common goods
    imports: {
      food: {
        id: 'food',
        name: 'Food Products',
        type: 'food',
        basePrice: 100,
        currentPrice: 100,
        demand: 0,
        supply: 0,
        quality: 1,
        imported: true
      },
      rawMaterials: {
        id: 'rawMaterials',
        name: 'Raw Materials',
        type: 'raw_materials',
        basePrice: 200,
        currentPrice: 200,
        demand: 0,
        supply: 0,
        quality: 1,
        imported: true
      },
      luxuryGoods: {
        id: 'luxuryGoods',
        name: 'Luxury Goods',
        type: 'luxury_items',
        basePrice: 500,
        currentPrice: 500,
        demand: 0,
        supply: 0,
        quality: 1,
        imported: true
      }
    },
    
    exports: {},
    tariffs: {},
    tradeBalance: 0,
    
    // Market data
    landValues: new Map(),
    constructionCosts: {
      residential: 50000,
      commercial: 75000,
      industrial: 100000,
      office: 80000
    },
    laborCosts: {
      unskilled: 25000,
      skilled: 40000,
      professional: 60000
    },
    
    // Demographics
    wealthDistribution: {
      low: 60,
      medium: 30,
      high: 10
    },
    
    businessCount: {
      commercial: 0,
      industrial: 0,
      office: 0
    },
    
    unemploymentRate: 5,
    averageIncome: {
      low: 25000,
      medium: 45000,
      high: 80000
    },
    
    // Extended economy data
    businesses: [],
    marketConditions: {
      demandByZone: {
        residential: { low: 0.8, medium: 0.6, high: 0.3 },
        commercial: { low: 0.7, medium: 0.8, high: 0.9 },
        industrial: { low: 0.6, medium: 0.7, high: 0.5 },
        office: { low: 0.3, medium: 0.6, high: 0.8 }
      },
      supplyByZone: {
        residential: { low: 0.9, medium: 0.7, high: 0.4 },
        commercial: { low: 0.8, medium: 0.6, high: 0.5 },
        industrial: { low: 0.7, medium: 0.6, high: 0.4 },
        office: { low: 0.4, medium: 0.5, high: 0.6 }
      },
      developmentPressure: {},
      gentrificationRisk: {},
      landSpeculation: {}
    },
    
    inflationRate: 0.02,
    gdpGrowth: 0.03,
    employmentGrowth: 0.01,

    initializeEconomy: () => {
      console.log('💰 Initializing economy system...')
      
      // Set initial land values
      const landValues = new Map<string, number>()
      
      // Create a basic land value gradient from city center
      for (let x = -50; x <= 50; x += 5) {
        for (let z = -50; z <= 50; z += 5) {
          const distance = Math.sqrt(x * x + z * z)
          const baseValue = Math.max(10000, 50000 - distance * 500)
          landValues.set(`${x},${z}`, baseValue)
        }
      }
      
      set({
        landValues,
        income: 0,
        expenses: 1000, // Basic city maintenance
      })
      
      console.log('✅ Economy system initialized')
    },

    updateEconomy: (deltaTime: number) => {
      const state = get()
      
      // Update every game hour (3600 game seconds)
      const gameHour = Math.floor(Date.now() / 1000) // Simplified timing
      
      // Calculate tax revenue
      const taxRevenue = get().calculateTaxRevenue()
      
      // Calculate expenses (building maintenance, services, etc.)
      const expenses = state.businesses.length * 500 + 2000 // Base expenses
      
      // Update loan interest
      const loanInterest = state.totalLoans * (state.interestRate / 12) // Monthly interest
      
      const netIncome = taxRevenue - expenses - loanInterest
      
      set({
        income: taxRevenue,
        expenses: expenses + loanInterest,
        netIncome,
        totalTaxRevenue: taxRevenue,
        funds: Math.max(0, state.funds + netIncome * deltaTime / 3600) // Convert to hourly
      })
      
      // Update trade goods
      get().updateTradeGoods()
      
      // Update market conditions
      get().updateMarketConditions()
    },

    addFunds: (amount: number, source: string) => {
      const currentFunds = get().funds
      console.log(`💰 +$${amount.toLocaleString()} from ${source}`)
      set({ funds: currentFunds + amount })
    },

    subtractFunds: (amount: number, purpose: string) => {
      const state = get()
      if (state.funds < amount) {
        console.log(`❌ Insufficient funds for ${purpose}. Need $${amount.toLocaleString()}, have $${state.funds.toLocaleString()}`)
        return false
      }
      
      console.log(`💸 -$${amount.toLocaleString()} for ${purpose}`)
      set({ funds: state.funds - amount })
      return true
    },

    takeLoan: (amount: number) => {
      const state = get()
      const availableCredit = state.loanLimit - state.totalLoans
      
      if (amount > availableCredit) {
        console.log(`❌ Loan amount exceeds available credit. Requested: $${amount.toLocaleString()}, Available: $${availableCredit.toLocaleString()}`)
        return false
      }
      
      console.log(`🏛️ Taking loan of $${amount.toLocaleString()}`)
      
      set({
        funds: state.funds + amount,
        totalLoans: state.totalLoans + amount,
        creditRating: Math.max(50, state.creditRating - 5) // Lower credit rating
      })
      
      return true
    },

    repayLoan: (amount: number) => {
      const state = get()
      const repayAmount = Math.min(amount, state.totalLoans)
      
      if (state.funds < repayAmount) {
        console.log(`❌ Insufficient funds to repay loan`)
        return false
      }
      
      console.log(`💰 Repaying loan: $${repayAmount.toLocaleString()}`)
      
      set({
        funds: state.funds - repayAmount,
        totalLoans: state.totalLoans - repayAmount,
        creditRating: Math.min(100, state.creditRating + 2) // Improve credit rating
      })
      
      return true
    },

    setTaxRate: (zoneType: ZoneType, rate: number) => {
      const clampedRate = Math.max(0, Math.min(50, rate)) // 0-50% tax rate
      console.log(`📊 Setting ${zoneType} tax rate to ${clampedRate}%`)
      
      switch (zoneType) {
        case 'residential':
          set({ residentialTaxRate: clampedRate })
          break
        case 'commercial':
          set({ commercialTaxRate: clampedRate })
          break
        case 'industrial':
          set({ industrialTaxRate: clampedRate })
          break
        case 'office':
          set({ officeTaxRate: clampedRate })
          break
      }
    },

    calculateTaxRevenue: () => {
      const state = get()
      let totalRevenue = 0
      
      // Calculate revenue from each business
      state.businesses.forEach(business => {
        let taxRate = 0
        switch (business.type) {
          case 'residential':
            taxRate = state.residentialTaxRate
            break
          case 'commercial':
            taxRate = state.commercialTaxRate
            break
          case 'industrial':
            taxRate = state.industrialTaxRate
            break
          case 'office':
            taxRate = state.officeTaxRate
            break
        }
        
        if (business.isOperational) {
          const taxableIncome = Math.max(0, business.revenue - business.operatingCosts)
          totalRevenue += taxableIncome * (taxRate / 100)
        }
      })
      
      return totalRevenue
    },

    updateTradeGoods: () => {
      const state = get()
      const updatedImports = { ...state.imports }
      
      // Update trade good prices based on supply/demand
      Object.keys(updatedImports).forEach(goodId => {
        const good = updatedImports[goodId]
        const supplyDemandRatio = good.supply / Math.max(1, good.demand)
        
        // Adjust price based on supply/demand
        const priceMultiplier = Math.max(0.5, Math.min(2.0, 2 - supplyDemandRatio))
        good.currentPrice = Math.round(good.basePrice * priceMultiplier)
      })
      
      set({ imports: updatedImports })
    },

    importGood: (goodId: string, quantity: number) => {
      const state = get()
      const good = state.imports[goodId]
      
      if (!good) {
        console.log(`❌ Trade good ${goodId} not found`)
        return false
      }
      
      const cost = good.currentPrice * quantity
      const tariff = state.tariffs[goodId] || 0
      const totalCost = cost * (1 + tariff / 100)
      
      if (!get().subtractFunds(totalCost, `Import ${good.name}`)) {
        return false
      }
      
      console.log(`📦 Imported ${quantity} units of ${good.name} for $${totalCost.toLocaleString()}`)
      
      // Update supply
      const updatedImports = { ...state.imports }
      updatedImports[goodId] = { ...good, supply: good.supply + quantity }
      set({ imports: updatedImports })
      
      return true
    },

    exportGood: (goodId: string, quantity: number) => {
      const state = get()
      const good = state.exports[goodId]
      
      if (!good || good.supply < quantity) {
        console.log(`❌ Cannot export ${goodId} - insufficient supply`)
        return false
      }
      
      const revenue = good.currentPrice * quantity
      get().addFunds(revenue, `Export ${good.name}`)
      
      console.log(`📦 Exported ${quantity} units of ${good.name} for $${revenue.toLocaleString()}`)
      
      // Update supply
      const updatedExports = { ...state.exports }
      updatedExports[goodId] = { ...good, supply: good.supply - quantity }
      set({ exports: updatedExports })
      
      return true
    },

    setTariff: (goodId: string, rate: number) => {
      const clampedRate = Math.max(0, Math.min(100, rate))
      console.log(`📊 Setting tariff for ${goodId} to ${clampedRate}%`)
      
      const updatedTariffs = { ...get().tariffs }
      updatedTariffs[goodId] = clampedRate
      set({ tariffs: updatedTariffs })
    },

    createBusiness: (buildingId: string, businessType: string) => {
      const businessId = `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const newBusiness: Business = {
        id: businessId,
        name: `${businessType.charAt(0).toUpperCase() + businessType.slice(1)} Business`,
        type: businessType,
        buildingId,
        accessibility: 1,
        footTraffic: 0.5,
        prestige: 0.5,
        revenue: 0,
        operatingCosts: 1000,
        profit: 0,
        rent: 2000,
        employees: 0,
        maxEmployees: 10,
        wagesPerEmployee: 30000,
        skillRequirements: ['none' as EducationLevel],
        requiredGoods: {},
        producedGoods: {},
        efficiency: 1,
        customerSatisfaction: 0.8,
        marketShare: 0.01,
        isOperational: true,
        daysSinceProfit: 0,
        bankruptcyRisk: 0.1
      }
      
      console.log(`🏢 Created new business: ${newBusiness.name}`)
      
      const businesses = [...get().businesses, newBusiness]
      set({ businesses })
      
      return newBusiness
    },

    updateBusiness: (businessId: string, updates: Partial<Business>) => {
      const state = get()
      const updatedBusinesses = state.businesses.map(business =>
        business.id === businessId ? { ...business, ...updates } : business
      )
      
      set({ businesses: updatedBusinesses })
    },

    closeBusiness: (businessId: string) => {
      const state = get()
      const business = state.businesses.find(b => b.id === businessId)
      
      if (business) {
        console.log(`🏢 Closing business: ${business.name}`)
        set({
          businesses: state.businesses.filter(b => b.id !== businessId)
        })
      }
    },

    calculateSupplyDemand: () => {
      // This would calculate supply/demand for different zone types
      // based on population, employment, and other factors
      console.log('📊 Calculating supply and demand...')
      
      const state = get()
      const marketConditions = { ...state.marketConditions }
      
      // Update demand based on population and employment
      // This is a simplified calculation
      marketConditions.demandByZone.residential.low = Math.min(1, 0.8)
      marketConditions.demandByZone.commercial.medium = Math.min(1, 0.7)
      
      set({ marketConditions })
    },

    updateMarketConditions: () => {
      get().calculateSupplyDemand()
      
      // Update development pressure, gentrification risk, etc.
      const state = get()
      const marketConditions = { ...state.marketConditions }
      
      // Calculate development pressure for different areas
      // This would be based on terrain values, existing development, etc.
      
      set({ marketConditions })
    },

    getZoneDemand: (zoneType: ZoneType, wealthLevel: WealthLevel) => {
      const state = get()
      return state.marketConditions.demandByZone[zoneType][wealthLevel]
    },

    calculateLandValue: (x: number, z: number) => {
      const state = get()
      const key = `${Math.round(x / 5) * 5},${Math.round(z / 5) * 5}`
      return state.landValues.get(key) || 10000
    },

    generateEconomicReport: () => {
      const state = get()
      
      const totalRevenue = state.income
      const totalExpenses = state.expenses
      const netIncome = state.netIncome
      const taxEfficiency = state.totalTaxRevenue > 0 ? (totalRevenue / state.totalTaxRevenue) * 100 : 0
      
      // Calculate trade balance
      let importCosts = 0
      let exportRevenue = 0
      
      Object.values(state.imports).forEach(good => {
        importCosts += good.currentPrice * good.supply
      })
      
      Object.values(state.exports).forEach(good => {
        exportRevenue += good.currentPrice * good.supply
      })
      
      const tradeBalance = exportRevenue - importCosts
      
      const economicGrowth = state.gdpGrowth * 100
      
      return {
        totalRevenue,
        totalExpenses,
        netIncome,
        taxEfficiency,
        tradeBalance,
        economicGrowth
      }
    }
  }))
)
