import { useEconomyStore } from '../../stores/economyStore'
import { useGameStore } from '../../stores/gameStore'

export function EconomyPanel() {
  const { 
    funds,
    income,
    expenses,
    netIncome,
    totalLoans,
    loanLimit,
    creditRating,
    residentialTaxRate,
    commercialTaxRate,
    industrialTaxRate,
    officeTaxRate,
    takeLoan,
    repayLoan,
    setTaxRate,
    generateEconomicReport
  } = useEconomyStore()
  
  const { cityStats } = useGameStore()

  const report = generateEconomicReport()
  const availableCredit = loanLimit - totalLoans

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(30, 30, 30, 0.9))',
      borderRadius: '16px',
      padding: '20px',
      pointerEvents: 'auto',
      width: '800px',
      maxHeight: '300px',
      overflowY: 'auto',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        color: '#fff', 
        fontSize: '18px',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        💰 Economic Dashboard
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        {/* Financial Overview */}
        <div>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            color: '#4ade80', 
            fontSize: '14px',
            fontWeight: '600'
          }}>
            💵 Financial Status
          </h4>
          <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <span>Treasury:</span>
              <span style={{ 
                color: funds >= 0 ? '#4ade80' : '#ef4444',
                fontWeight: 'bold'
              }}>
                ${funds.toLocaleString()}
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <span>Monthly Income:</span>
              <span style={{ color: '#4ade80' }}>
                +${income.toLocaleString()}
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <span>Monthly Expenses:</span>
              <span style={{ color: '#ef4444' }}>
                -${expenses.toLocaleString()}
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '8px',
              paddingTop: '4px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <span style={{ fontWeight: 'bold' }}>Net Income:</span>
              <span style={{ 
                color: netIncome >= 0 ? '#4ade80' : '#ef4444',
                fontWeight: 'bold'
              }}>
                {netIncome >= 0 ? '+' : ''}${netIncome.toLocaleString()}
              </span>
            </div>
            
            {/* Loan Information */}
            {totalLoans > 0 && (
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                borderRadius: '6px',
                padding: '8px',
                marginTop: '8px',
                border: '1px solid rgba(251, 191, 36, 0.2)'
              }}>
                <div style={{ fontWeight: 'bold', color: '#fbbf24', marginBottom: '4px' }}>
                  🏛️ Outstanding Loans
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}>
                  <span>Total Debt:</span>
                  <span style={{ color: '#fbbf24' }}>
                    ${totalLoans.toLocaleString()}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}>
                  <span>Available Credit:</span>
                  <span style={{ color: '#4ade80' }}>
                    ${availableCredit.toLocaleString()}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between'
                }}>
                  <span>Credit Rating:</span>
                  <span style={{ 
                    color: creditRating > 80 ? '#4ade80' : creditRating > 60 ? '#fbbf24' : '#ef4444'
                  }}>
                    {creditRating}/100
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tax Settings */}
        <div>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            color: '#60a5fa', 
            fontSize: '14px',
            fontWeight: '600'
          }}>
            📊 Tax Rates
          </h4>
          <div style={{ fontSize: '12px' }}>
            {[
              { type: 'residential', rate: residentialTaxRate, icon: '🏠', label: 'Residential' },
              { type: 'commercial', rate: commercialTaxRate, icon: '🏪', label: 'Commercial' },
              { type: 'industrial', rate: industrialTaxRate, icon: '🏭', label: 'Industrial' },
              { type: 'office', rate: officeTaxRate, icon: '🏢', label: 'Office' }
            ].map(({ type, rate, icon, label }) => (
              <div key={type} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '6px'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{icon}</span>
                  <span>{label}:</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setTaxRate(type as any, Math.max(0, rate - 1))}
                    style={{
                      background: 'rgba(239, 68, 68, 0.7)',
                      border: 'none',
                      borderRadius: '3px',
                      color: 'white',
                      cursor: 'pointer',
                      width: '20px',
                      height: '16px',
                      fontSize: '10px'
                    }}
                  >
                    -
                  </button>
                  <span style={{ 
                    minWidth: '35px', 
                    textAlign: 'center',
                    color: rate > 20 ? '#ef4444' : rate > 15 ? '#fbbf24' : '#4ade80'
                  }}>
                    {rate}%
                  </span>
                  <button
                    onClick={() => setTaxRate(type as any, Math.min(50, rate + 1))}
                    style={{
                      background: 'rgba(74, 222, 128, 0.7)',
                      border: 'none',
                      borderRadius: '3px',
                      color: 'white',
                      cursor: 'pointer',
                      width: '20px',
                      height: '16px',
                      fontSize: '10px'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loan & Actions */}
        <div>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            color: '#a78bfa', 
            fontSize: '14px',
            fontWeight: '600'
          }}>
            🏛️ Banking & Actions
          </h4>
          <div style={{ fontSize: '12px' }}>
            {availableCredit > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ marginBottom: '4px' }}>Available Credit:</div>
                <div style={{ 
                  display: 'flex', 
                  gap: '4px',
                  marginBottom: '6px'
                }}>
                  {[10000, 25000, 50000].filter(amount => amount <= availableCredit).map(amount => (
                    <button
                      key={amount}
                      onClick={() => takeLoan(amount)}
                      style={{
                        background: 'rgba(59, 130, 246, 0.7)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        fontSize: '10px'
                      }}
                    >
                      ${(amount / 1000)}k
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {totalLoans > 0 && funds >= 10000 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ marginBottom: '4px' }}>Repay Loan:</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[10000, 25000, totalLoans].filter((amount, index, arr) => 
                    amount <= funds && amount <= totalLoans && arr.indexOf(amount) === index
                  ).map(amount => (
                    <button
                      key={amount}
                      onClick={() => repayLoan(amount)}
                      style={{
                        background: 'rgba(16, 185, 129, 0.7)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        fontSize: '10px'
                      }}
                    >
                      {amount === totalLoans ? 'All' : `$${(amount / 1000)}k`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Economic Indicators */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              padding: '8px',
              marginTop: '8px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                📈 Economic Health
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '2px'
              }}>
                <span>Trade Balance:</span>
                <span style={{ 
                  color: report.tradeBalance >= 0 ? '#4ade80' : '#ef4444'
                }}>
                  {report.tradeBalance >= 0 ? '+' : ''}${report.tradeBalance.toLocaleString()}
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '2px'
              }}>
                <span>Growth Rate:</span>
                <span style={{ color: '#4ade80' }}>
                  {report.economicGrowth.toFixed(1)}%
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between'
              }}>
                <span>Tax Efficiency:</span>
                <span style={{ 
                  color: report.taxEfficiency > 80 ? '#4ade80' : '#fbbf24'
                }}>
                  {report.taxEfficiency.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
