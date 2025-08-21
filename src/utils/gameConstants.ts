// Game timing constants
export const GAME_CONFIG = {
  // Time scale (how many game minutes per real second)
  TIME_SCALE: 60,
  
  // Simulation rates
  CITIZEN_UPDATE_RATE: 1/30, // 30 FPS for citizen updates
  TRAFFIC_UPDATE_RATE: 1/60, // 60 FPS for traffic
  ECONOMY_UPDATE_RATE: 1, // 1 Hz for economy
  CONSTRUCTION_UPDATE_RATE: 1/10, // 10 FPS for construction
  
  // Visual constants
  GRID_SIZE: 100,
  CELL_SIZE: 1,
  TERRAIN_RESOLUTION: 5,
  
  // Camera constants
  CAMERA: {
    MIN_DISTANCE: 5,
    MAX_DISTANCE: 200,
    MIN_POLAR_ANGLE: 0.1,
    MAX_POLAR_ANGLE: Math.PI / 2.2,
    PAN_SPEED: 2,
    ZOOM_SPEED: 1.5,
    ROTATE_SPEED: 1
  }
}

// Economic constants
export const ECONOMY_CONFIG = {
  STARTING_FUNDS: 100000,
  STARTING_LOAN_LIMIT: 50000,
  BASE_INTEREST_RATE: 0.05,
  
  // Tax rates (as percentages)
  DEFAULT_TAX_RATES: {
    residential: 12,
    commercial: 15,
    industrial: 10,
    office: 14
  },
  
  // Building costs
  BUILDING_COSTS: {
    residential_low: 5000,
    residential_medium: 15000,
    residential_high: 50000,
    commercial_low: 10000,
    commercial_medium: 30000,
    commercial_high: 100000,
    industrial_low: 20000,
    industrial_medium: 60000,
    industrial_high: 200000,
    office_low: 15000,
    office_medium: 45000,
    office_high: 150000,
    
    // Service buildings
    fire_station: 25000,
    police_station: 30000,
    hospital: 100000,
    school: 50000,
    university: 200000,
    power_plant: 150000,
    water_treatment: 80000
  },
  
  // Operating costs per month
  OPERATING_COSTS: {
    fire_station: 2000,
    police_station: 2500,
    hospital: 8000,
    school: 3000,
    university: 15000,
    power_plant: 10000,
    water_treatment: 5000
  }
}

// Terrain and zoning constants
export const TERRAIN_CONFIG = {
  // Terrain value factors
  WATER_PROXIMITY_BONUS: 0.3,
  ELEVATION_FACTOR: 0.2,
  POLLUTION_PENALTY: 0.5,
  NOISE_PENALTY: 0.3,
  SCENIC_BONUS: 0.4,
  
  // Terrain value thresholds for wealth levels
  WEALTH_THRESHOLDS: {
    low: 0.0,
    medium: 0.4,
    high: 0.7
  },
  
  // Zoning density limits
  MAX_DENSITY: {
    residential: 8,
    commercial: 6,
    industrial: 4,
    office: 10
  }
}

// Building progression constants
export const BUILDING_CONFIG = {
  // Construction times (in game hours)
  CONSTRUCTION_TIME: {
    residential: 24,
    commercial: 48,
    industrial: 72,
    office: 36,
    service: 96
  },
  
  // Capacity per building level
  BASE_CAPACITY: {
    residential: 4,
    commercial: 20,
    industrial: 50,
    office: 30
  },
  
  // Experience points for city level progression
  EXPERIENCE_VALUES: {
    building_constructed: 10,
    population_milestone: 50,
    education_milestone: 30,
    economic_milestone: 40,
    achievement_unlocked: 100
  }
}

// Agent behavior constants
export const AGENT_CONFIG = {
  // Movement speeds (units per second)
  WALKING_SPEED: 2,
  DRIVING_SPEED: 8,
  BUS_SPEED: 6,
  EMERGENCY_SPEED: 12,
  
  // Pathfinding
  MAX_PATH_NODES: 100,
  PATH_RECALC_INTERVAL: 5, // seconds
  
  // Daily schedule timing (in game hours)
  WORK_START_TIME: 8,
  WORK_END_TIME: 17,
  SCHOOL_START_TIME: 8,
  SCHOOL_END_TIME: 15,
  
  // Citizen needs (0-100 scale)
  MAX_NEEDS: {
    food: 100,
    shelter: 100,
    employment: 100,
    education: 100,
    healthcare: 100,
    recreation: 100,
    social: 100
  },
  
  // Need decay rates per game hour
  NEED_DECAY_RATES: {
    food: 5,
    shelter: 1,
    employment: 0.5,
    education: 0.2,
    healthcare: 0.3,
    recreation: 2,
    social: 1.5
  }
}

// Education system constants
export const EDUCATION_CONFIG = {
  // Capacity per education level
  SCHOOL_CAPACITY: {
    elementary: 500,
    middle: 400,
    high: 600,
    university: 2000
  },
  
  // Education duration (in game days)
  EDUCATION_DURATION: {
    primary: 180,
    secondary: 180,
    university: 360,
    advanced: 180
  },
  
  // Employment multipliers based on education
  EMPLOYMENT_MULTIPLIERS: {
    none: 0.3,
    primary: 0.5,
    secondary: 0.8,
    university: 1.2,
    advanced: 1.5
  },
  
  // Income multipliers based on education
  INCOME_MULTIPLIERS: {
    none: 1.0,
    primary: 1.2,
    secondary: 1.5,
    university: 2.0,
    advanced: 2.8
  }
}

// Traffic and transportation constants
export const TRAFFIC_CONFIG = {
  // Road capacities (vehicles per hour)
  ROAD_CAPACITY: {
    dirt: 200,
    street: 800,
    avenue: 1600,
    highway: 3200
  },
  
  // Road costs per unit
  ROAD_COSTS: {
    dirt: 50,
    street: 200,
    avenue: 500,
    highway: 1000
  },
  
  // Traffic light timing (in seconds)
  TRAFFIC_LIGHT_CYCLE: 60,
  GREEN_LIGHT_DURATION: 30,
  YELLOW_LIGHT_DURATION: 5
}
