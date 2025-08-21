export type TradeGoodType = 'raw_materials' | 'manufactured_goods' | 'luxury_items' | 'food' | 'energy' | 'technology'

export interface TradeGood {
  id: string
  name: string
  type: TradeGoodType
  basePrice: number
  currentPrice: number
  demand: number
  supply: number
  quality: number
  imported: boolean
}

export interface EconomicData {
  // Core finances
  funds: number
  income: number
  expenses: number
  netIncome: number
  
  // Tax system
  residentialTaxRate: number
  commercialTaxRate: number
  industrialTaxRate: number
  officeTaxRate: number
  totalTaxRevenue: number
  
  // Loan system
  totalLoans: number
  loanLimit: number
  interestRate: number
  creditRating: number
  
  // City progression
  cityLevel: number
  experience: number
  nextLevelRequirement: number
  
  // Trade system
  imports: Record<string, TradeGood>
  exports: Record<string, TradeGood>
  tariffs: Record<string, number>
  tradeBalance: number
  
  // Market conditions
  landValues: Map<string, number>
  constructionCosts: Record<string, number>
  laborCosts: Record<string, number>
  
  // Wealth distribution
  wealthDistribution: {
    low: number
    medium: number
    high: number
  }
  
  // Business data
  businessCount: Record<string, number>
  unemploymentRate: number
  averageIncome: Record<WealthLevel, number>
}

export interface Business {
  id: string
  name: string
  type: string
  buildingId: string
  
  // Location factors
  accessibility: number
  footTraffic: number
  prestige: number
  
  // Financial data
  revenue: number
  operatingCosts: number
  profit: number
  rent: number
  
  // Employment
  employees: number
  maxEmployees: number
  wagesPerEmployee: number
  skillRequirements: EducationLevel[]
  
  // Supply chain
  requiredGoods: Record<string, number>
  producedGoods: Record<string, number>
  
  // Performance metrics
  efficiency: number
  customerSatisfaction: number
  marketShare: number
  
  // Status
  isOperational: boolean
  daysSinceProfit: number
  bankruptcyRisk: number
}

export interface MarketConditions {
  demandByZone: Record<ZoneType, Record<WealthLevel, number>>
  supplyByZone: Record<ZoneType, Record<WealthLevel, number>>
  developmentPressure: Record<string, number>
  gentrificationRisk: Record<string, number>
  landSpeculation: Record<string, number>
}

export type WealthLevel = 'low' | 'medium' | 'high'
export type ZoneType = 'residential' | 'commercial' | 'industrial' | 'office'
export type EducationLevel = 'none' | 'primary' | 'secondary' | 'university' | 'advanced'
