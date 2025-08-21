import { useGameStore } from '../../stores/gameStore'
import { useEconomyStore } from '../../stores/economyStore'
import { useTerrainStore } from '../../stores/terrainStore'

export function InfoPanel() {
  const { selectedBuilding, buildings, achievements } = useGameStore()
  const { generateEconomicReport } = useEconomyStore()
  const { analyzeArea } = useTerrainStore()

  const selectedBuildingData = selectedBuilding 
    ? buildings.find(b => b.id === selectedBuilding)
    : null

  const unlockedAchievements = achievements.filter(a => a.isUnlocked)
  const pendingAchievements = achievements.filter(a => !a.isUnlocked).slice(0, 3)

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      right: '20px',
      transform: 'translateY(-50%)',
      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(30, 30, 30, 0.9))',
      borderRadius: '16px',
      padding: '20px',
      pointerEvents: 'auto',
      width: '320px',
      maxHeight: '80vh',
      overflowY: 'auto',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        color: '#fff', 
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        📊 City Information
      </h3>

      {/* Selected Building Info */}
      {selectedBuildingData ? (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            color: '#4ade80', 
            fontSize: '14px',
            fontWeight: '600'
          }}>
            🏢 Selected Building
          </h4>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
              {selectedBuildingData.name}
            </div>
            <div style={{ marginBottom: '4px' }}>
              Type: {selectedBuildingData.type}
            </div>
            <div style={{ marginBottom: '4px' }}>
              Level: {selectedBuildingData.level}/{selectedBuildingData.maxLevel}
            </div>
            <div style={{ marginBottom: '4px' }}>
              Status: {selectedBuildingData.status}
            </div>
            {selectedBuildingData.status === 'constructing' && (
              <div style={{ marginBottom: '4px' }}>
                Progress: {Math.round(selectedBuildingData.constructionProgress * 100)}%
              </div>
            )}
            <div style={{ marginBottom: '4px' }}>
              Capacity: {selectedBuildingData.capacity}
            </div>
            {selectedBuildingData.residents && (
              <div style={{ marginBottom: '4px' }}>
                Residents: {selectedBuildingData.residents}
              </div>
            )}
            {selectedBuildingData.workers && (
              <div style={{ marginBottom: '4px' }}>
                Workers: {selectedBuildingData.workers}
              </div>
            )}
            <div style={{ marginBottom: '4px' }}>
              Property Value: ${selectedBuildingData.property_value.toLocaleString()}
            </div>
            <div style={{ 
              color: selectedBuildingData.operatingCost > 0 ? '#ef4444' : '#4ade80'
            }}>
              Operating Cost: ${selectedBuildingData.operatingCost}/month
            </div>
            
            {/* Building modules */}
            {selectedBuildingData.modules.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  Modules:
                </div>
                {selectedBuildingData.modules.map(module => (
                  <div key={module.id} style={{ 
                    fontSize: '11px', 
                    color: '#ccc',
                    marginBottom: '2px'
                  }}>
                    • {module.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            color: '#ccc', 
            fontSize: '14px',
            fontWeight: '600'
          }}>
            🎯 Selection Info
          </h4>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
            color: '#ccc',
            textAlign: 'center'
          }}>
            Click on a building to view detailed information
          </div>
        </div>
      )}

      {/* Achievements */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          color: '#fbbf24', 
          fontSize: '14px',
          fontWeight: '600'
        }}>
          🏆 Achievements ({unlockedAchievements.length}/{achievements.length})
        </h4>
        
        {/* Recently unlocked */}
        {unlockedAchievements.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '4px' }}>
              Recently Unlocked:
            </div>
            {unlockedAchievements.slice(-2).map(achievement => (
              <div key={achievement.id} style={{
                background: 'rgba(251, 191, 36, 0.2)',
                borderRadius: '6px',
                padding: '8px',
                fontSize: '11px',
                marginBottom: '4px',
                border: '1px solid rgba(251, 191, 36, 0.3)'
              }}>
                <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>
                  {achievement.name}
                </div>
                <div style={{ color: '#ccc', fontSize: '10px' }}>
                  {achievement.description}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress on pending achievements */}
        {pendingAchievements.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '4px' }}>
              In Progress:
            </div>
            {pendingAchievements.map(achievement => (
              <div key={achievement.id} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                padding: '8px',
                fontSize: '11px',
                marginBottom: '4px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                  {achievement.name}
                </div>
                <div style={{ color: '#ccc', fontSize: '10px', marginBottom: '4px' }}>
                  {achievement.description}
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '4px', 
                  background: '#333', 
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(achievement.currentProgress / achievement.requirement) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: '#ccc', 
                  marginTop: '2px',
                  textAlign: 'right'
                }}>
                  {achievement.currentProgress}/{achievement.requirement}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#60a5fa' }}>
          💡 Quick Tips
        </div>
        <div style={{ color: '#ccc', lineHeight: '1.4' }}>
          • Start with residential zones near water
          <br />
          • Build roads before placing buildings
          <br />
          • Higher terrain values attract wealthy residents
          <br />
          • Education increases employment opportunities
        </div>
      </div>
    </div>
  )
}
