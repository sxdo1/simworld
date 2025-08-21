import { IStorage } from "../storage";

interface CityData {
  cityId: number;
  userId: number;
  lastUpdate: number;
  data: any;
  checksum: string;
}

interface SyncConflict {
  cityId: number;
  userId: number;
  conflictType: 'concurrent_modification' | 'version_mismatch' | 'data_corruption';
  localData: any;
  remoteData: any;
  timestamp: number;
}

interface RegionState {
  cities: Map<number, CityData>;
  sharedResources: Map<string, number>;
  greatWorks: any[];
  economicIndicators: {
    totalPopulation: number;
    totalGDP: number;
    averageHappiness: number;
    tradeVolume: number;
  };
  lastSync: number;
}

export class CitySync {
  private regionId: number;
  private storage: IStorage;
  private regionState: RegionState;
  private syncQueue: Map<number, CityData>;
  private conflictQueue: SyncConflict[];
  private lastGlobalSync: number;

  constructor(regionId: number, storage: IStorage) {
    this.regionId = regionId;
    this.storage = storage;
    this.syncQueue = new Map();
    this.conflictQueue = [];
    this.lastGlobalSync = Date.now();
    
    this.regionState = {
      cities: new Map(),
      sharedResources: new Map(),
      greatWorks: [],
      economicIndicators: {
        totalPopulation: 0,
        totalGDP: 0,
        averageHappiness: 0,
        tradeVolume: 0
      },
      lastSync: Date.now()
    };

    console.log(`🔄 City sync initialized for region ${regionId}`);
  }

  public async addCity(cityId: number, cityData: any): Promise<void> {
    try {
      const userId = cityData.userId || 0;
      const checksum = this.calculateChecksum(cityData);
      
      const syncData: CityData = {
        cityId,
        userId,
        lastUpdate: Date.now(),
        data: cityData,
        checksum
      };

      this.regionState.cities.set(cityId, syncData);
      this.updateRegionalIndicators();
      
      console.log(`🏙️ Added city ${cityId} to region ${this.regionId} sync`);
    } catch (error) {
      console.error(`Failed to add city ${cityId} to sync:`, error);
      throw error;
    }
  }

  public async updateCity(cityId: number, cityData: any): Promise<void> {
    try {
      const existingCity = this.regionState.cities.get(cityId);
      
      if (!existingCity) {
        throw new Error(`City ${cityId} not found in region sync`);
      }

      const newChecksum = this.calculateChecksum(cityData);
      
      // Check for concurrent modifications
      if (existingCity.checksum !== this.calculateChecksum(existingCity.data)) {
        // Data has been modified since last sync - potential conflict
        const conflict: SyncConflict = {
          cityId,
          userId: existingCity.userId,
          conflictType: 'concurrent_modification',
          localData: cityData,
          remoteData: existingCity.data,
          timestamp: Date.now()
        };
        
        this.conflictQueue.push(conflict);
        console.warn(`⚠️ Sync conflict detected for city ${cityId}`);
        
        // Apply conflict resolution strategy
        cityData = await this.resolveConflict(conflict);
      }

      const updatedCityData: CityData = {
        cityId,
        userId: existingCity.userId,
        lastUpdate: Date.now(),
        data: cityData,
        checksum: newChecksum
      };

      this.regionState.cities.set(cityId, updatedCityData);
      this.syncQueue.set(cityId, updatedCityData);
      this.updateRegionalIndicators();

      console.log(`🔄 Updated city ${cityId} in region sync`);
    } catch (error) {
      console.error(`Failed to update city ${cityId}:`, error);
      throw error;
    }
  }

  public async synchronize(): Promise<void> {
    try {
      const now = Date.now();
      
      // Sync queued city updates to database
      if (this.syncQueue.size > 0) {
        await this.syncCitiesToDatabase();
      }

      // Update shared resources
      await this.updateSharedResources();

      // Update great works progress
      await this.updateGreatWorks();

      // Process any pending conflicts
      if (this.conflictQueue.length > 0) {
        await this.processConflicts();
      }

      this.regionState.lastSync = now;
      this.lastGlobalSync = now;

      console.log(`🔄 Synchronized region ${this.regionId} - ${this.regionState.cities.size} cities`);
    } catch (error) {
      console.error(`Synchronization failed for region ${this.regionId}:`, error);
      throw error;
    }
  }

  private async syncCitiesToDatabase(): Promise<void> {
    const syncPromises: Promise<void>[] = [];

    for (const [cityId, cityData] of this.syncQueue) {
      const syncPromise = this.storage.updateCity(cityId, {
        data: cityData.data,
        lastSaved: new Date(cityData.lastUpdate)
      }).then(() => {
        console.log(`💾 Synced city ${cityId} to database`);
      }).catch(error => {
        console.error(`Failed to sync city ${cityId} to database:`, error);
      });

      syncPromises.push(syncPromise);
    }

    await Promise.all(syncPromises);
    this.syncQueue.clear();
  }

  private async updateSharedResources(): Promise<void> {
    // Calculate shared regional resources based on all cities
    const sharedResources = new Map<string, number>();
    
    for (const [cityId, cityData] of this.regionState.cities) {
      const cityResources = cityData.data.economy?.exports || {};
      
      Object.entries(cityResources).forEach(([resource, amount]) => {
        const currentAmount = sharedResources.get(resource) || 0;
        sharedResources.set(resource, currentAmount + (amount as number));
      });
    }

    this.regionState.sharedResources = sharedResources;
  }

  private async updateGreatWorks(): Promise<void> {
    try {
      const greatWorks = await this.storage.getGreatWorks(this.regionId);
      this.regionState.greatWorks = greatWorks;

      // Update progress based on city contributions
      for (const greatWork of greatWorks) {
        if (greatWork.status === 'active') {
          let totalContributed = 0;
          const requiredTotal = Object.values(greatWork.requiredResources).reduce((sum: number, req: any) => sum + req, 0);

          greatWork.contributingCities.forEach((cityContribution: any) => {
            totalContributed += Object.values(cityContribution.resources).reduce((sum: number, amount: any) => sum + amount, 0);
          });

          const newProgress = Math.min(1, totalContributed / requiredTotal);
          
          if (newProgress !== greatWork.progress) {
            await this.storage.updateGreatWorkProgress(greatWork.id, newProgress);
            greatWork.progress = newProgress;

            // Check for completion
            if (newProgress >= 1 && greatWork.status !== 'completed') {
              await this.storage.completeGreatWork(greatWork.id);
              greatWork.status = 'completed';
              console.log(`🎉 Great Work completed: ${greatWork.name} in region ${this.regionId}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to update great works:', error);
    }
  }

  private async processConflicts(): Promise<void> {
    const resolvedConflicts: SyncConflict[] = [];

    for (const conflict of this.conflictQueue) {
      try {
        const resolvedData = await this.resolveConflict(conflict);
        
        // Update city with resolved data
        const cityData = this.regionState.cities.get(conflict.cityId);
        if (cityData) {
          cityData.data = resolvedData;
          cityData.checksum = this.calculateChecksum(resolvedData);
          cityData.lastUpdate = Date.now();
          
          this.syncQueue.set(conflict.cityId, cityData);
        }

        resolvedConflicts.push(conflict);
        console.log(`✅ Resolved sync conflict for city ${conflict.cityId}`);
      } catch (error) {
        console.error(`Failed to resolve conflict for city ${conflict.cityId}:`, error);
      }
    }

    // Remove resolved conflicts
    resolvedConflicts.forEach(resolved => {
      const index = this.conflictQueue.indexOf(resolved);
      if (index > -1) {
        this.conflictQueue.splice(index, 1);
      }
    });
  }

  private async resolveConflict(conflict: SyncConflict): Promise<any> {
    // Implement conflict resolution strategies
    switch (conflict.conflictType) {
      case 'concurrent_modification':
        return await this.resolveConcurrentModification(conflict);
      
      case 'version_mismatch':
        return await this.resolveVersionMismatch(conflict);
      
      case 'data_corruption':
        return await this.resolveDataCorruption(conflict);
      
      default:
        console.warn(`Unknown conflict type: ${conflict.conflictType}`);
        return conflict.localData; // Default to local data
    }
  }

  private async resolveConcurrentModification(conflict: SyncConflict): Promise<any> {
    // Strategy: Merge changes where possible, prefer newer timestamps for conflicts
    const localData = conflict.localData;
    const remoteData = conflict.remoteData;
    
    // Deep merge strategy
    const mergedData = this.deepMerge(remoteData, localData);
    
    // For buildings, prefer additions and avoid removals unless explicitly deleted
    if (localData.buildings && remoteData.buildings) {
      mergedData.buildings = this.mergeBuildings(remoteData.buildings, localData.buildings);
    }

    // For economy, use most recent values
    if (localData.economy && remoteData.economy) {
      mergedData.economy = {
        ...remoteData.economy,
        ...localData.economy,
        lastUpdate: Math.max(localData.economy.lastUpdate || 0, remoteData.economy.lastUpdate || 0)
      };
    }

    return mergedData;
  }

  private async resolveVersionMismatch(conflict: SyncConflict): Promise<any> {
    // Strategy: Use the data with the higher version number
    const localVersion = conflict.localData.version || 0;
    const remoteVersion = conflict.remoteData.version || 0;
    
    if (localVersion > remoteVersion) {
      return conflict.localData;
    } else {
      return conflict.remoteData;
    }
  }

  private async resolveDataCorruption(conflict: SyncConflict): Promise<any> {
    // Strategy: Validate data integrity and use the valid dataset
    const localValid = this.validateCityData(conflict.localData);
    const remoteValid = this.validateCityData(conflict.remoteData);
    
    if (localValid && !remoteValid) {
      return conflict.localData;
    } else if (!localValid && remoteValid) {
      return conflict.remoteData;
    } else if (localValid && remoteValid) {
      // Both valid, use newer one
      const localTime = conflict.localData.lastUpdate || 0;
      const remoteTime = conflict.remoteData.lastUpdate || 0;
      return localTime > remoteTime ? conflict.localData : conflict.remoteData;
    } else {
      // Both invalid, try to reconstruct from database
      console.error(`Both datasets invalid for city ${conflict.cityId}, attempting recovery`);
      const dbData = await this.storage.getCityData(conflict.cityId);
      return dbData || conflict.localData; // Fallback to local if recovery fails
    }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private mergeBuildings(remoteBuildings: any[], localBuildings: any[]): any[] {
    const buildingMap = new Map();
    
    // Add remote buildings
    remoteBuildings.forEach(building => {
      buildingMap.set(building.id, building);
    });
    
    // Merge local buildings (newer wins)
    localBuildings.forEach(building => {
      const existing = buildingMap.get(building.id);
      
      if (!existing || (building.lastUpdate || 0) > (existing.lastUpdate || 0)) {
        buildingMap.set(building.id, building);
      }
    });
    
    return Array.from(buildingMap.values());
  }

  private validateCityData(cityData: any): boolean {
    try {
      // Basic validation checks
      if (!cityData || typeof cityData !== 'object') {
        return false;
      }

      // Check required fields
      const requiredFields = ['name', 'population', 'buildings'];
      for (const field of requiredFields) {
        if (!(field in cityData)) {
          return false;
        }
      }

      // Validate buildings array
      if (!Array.isArray(cityData.buildings)) {
        return false;
      }

      // Validate each building has required properties
      for (const building of cityData.buildings) {
        if (!building.id || !building.type || !building.position) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('City data validation error:', error);
      return false;
    }
  }

  private calculateChecksum(data: any): string {
    // Simple checksum calculation (in production, use a proper hash function)
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(36);
  }

  private updateRegionalIndicators(): void {
    let totalPopulation = 0;
    let totalGDP = 0;
    let totalHappiness = 0;
    let tradeVolume = 0;
    const cityCount = this.regionState.cities.size;

    for (const [cityId, cityData] of this.regionState.cities) {
      const city = cityData.data;
      
      totalPopulation += city.population || 0;
      totalGDP += city.economy?.gdp || 0;
      totalHappiness += city.happiness || 0;
      
      if (city.economy?.tradeVolume) {
        tradeVolume += city.economy.tradeVolume;
      }
    }

    this.regionState.economicIndicators = {
      totalPopulation,
      totalGDP,
      averageHappiness: cityCount > 0 ? totalHappiness / cityCount : 0,
      tradeVolume
    };
  }

  public getRegionState(): RegionState {
    return {
      ...this.regionState,
      cities: new Map(this.regionState.cities), // Return a copy
      sharedResources: new Map(this.regionState.sharedResources)
    };
  }

  public getCityData(cityId: number): CityData | undefined {
    return this.regionState.cities.get(cityId);
  }

  public getSharedResources(): Map<string, number> {
    return new Map(this.regionState.sharedResources);
  }

  public getConflicts(): SyncConflict[] {
    return [...this.conflictQueue];
  }

  public async removeCity(cityId: number): Promise<void> {
    const removed = this.regionState.cities.delete(cityId);
    
    if (removed) {
      this.syncQueue.delete(cityId);
      this.updateRegionalIndicators();
      console.log(`🗑️ Removed city ${cityId} from region ${this.regionId} sync`);
    }
  }

  public dispose(): void {
    this.regionState.cities.clear();
    this.regionState.sharedResources.clear();
    this.syncQueue.clear();
    this.conflictQueue = [];
    
    console.log(`🗑️ City sync disposed for region ${this.regionId}`);
  }
}
