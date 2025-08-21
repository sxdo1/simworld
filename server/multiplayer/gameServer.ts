import { Server as SocketIOServer, Socket } from "socket.io";
import { IStorage } from "../storage";
import { CitySync } from "./citySync";

interface PlayerSession {
  userId: number;
  username: string;
  cityId?: number;
  regionId?: number;
  lastActivity: number;
  socket: Socket;
}

interface RegionSession {
  regionId: number;
  players: Map<number, PlayerSession>;
  citySync: CitySync;
  lastUpdate: number;
  isActive: boolean;
}

interface GameEvent {
  type: string;
  playerId: number;
  cityId: number;
  data: any;
  timestamp: number;
}

export function setupGameServer(io: SocketIOServer, storage: IStorage): void {
  const playerSessions = new Map<string, PlayerSession>();
  const regionSessions = new Map<number, RegionSession>();
  const gameEvents: GameEvent[] = [];
  
  console.log('🎮 Setting up multiplayer game server...');

  // Real-time city synchronization interval
  const SYNC_INTERVAL = 5000; // 5 seconds
  const CLEANUP_INTERVAL = 60000; // 1 minute

  io.on('connection', (socket: Socket) => {
    console.log(`🔗 Player connected: ${socket.id}`);
    
    socket.on('authenticate', async (data) => {
      try {
        const { userId, username } = data;
        
        if (!userId || !username) {
          socket.emit('auth_error', { message: 'Invalid authentication data' });
          return;
        }

        const session: PlayerSession = {
          userId,
          username,
          lastActivity: Date.now(),
          socket
        };

        playerSessions.set(socket.id, session);
        
        // Send current regions and cities to player
        const regions = await storage.getAvailableRegions();
        const userCities = await storage.getUserCities(userId);
        
        socket.emit('auth_success', {
          regions,
          cities: userCities
        });

        console.log(`👤 Player authenticated: ${username} (${userId})`);
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    });

    socket.on('join_region', async (data) => {
      try {
        const { regionId, cityId } = data;
        const session = playerSessions.get(socket.id);
        
        if (!session) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Update session
        session.regionId = regionId;
        session.cityId = cityId;
        session.lastActivity = Date.now();

        // Join socket room for region
        socket.join(`region_${regionId}`);

        // Get or create region session
        let regionSession = regionSessions.get(regionId);
        if (!regionSession) {
          regionSession = {
            regionId,
            players: new Map(),
            citySync: new CitySync(regionId, storage),
            lastUpdate: Date.now(),
            isActive: true
          };
          regionSessions.set(regionId, regionSession);
        }

        regionSession.players.set(session.userId, session);

        // Load city data for synchronization
        const cityData = await storage.getCityData(cityId);
        if (cityData) {
          await regionSession.citySync.addCity(cityId, cityData);
        }

        // Notify other players in region
        socket.to(`region_${regionId}`).emit('player_joined', {
          userId: session.userId,
          username: session.username,
          cityId
        });

        // Send region state to joining player
        const regionState = await regionSession.citySync.getRegionState();
        socket.emit('region_joined', {
          regionId,
          state: regionState,
          players: Array.from(regionSession.players.values()).map(p => ({
            userId: p.userId,
            username: p.username,
            cityId: p.cityId
          }))
        });

        console.log(`🌍 Player ${session.username} joined region ${regionId} with city ${cityId}`);
      } catch (error) {
        console.error('Join region error:', error);
        socket.emit('error', { message: 'Failed to join region' });
      }
    });

    socket.on('city_update', async (data) => {
      try {
        const session = playerSessions.get(socket.id);
        
        if (!session || !session.regionId || !session.cityId) {
          socket.emit('error', { message: 'Not in a region' });
          return;
        }

        const regionSession = regionSessions.get(session.regionId);
        if (!regionSession) {
          socket.emit('error', { message: 'Region session not found' });
          return;
        }

        // Update city data in sync system
        await regionSession.citySync.updateCity(session.cityId, data.cityData);
        
        // Save to database
        await storage.updateCity(session.cityId, {
          data: data.cityData,
          lastSaved: new Date()
        });

        // Broadcast update to other players in region
        socket.to(`region_${session.regionId}`).emit('city_updated', {
          cityId: session.cityId,
          userId: session.userId,
          changes: data.changes || {}
        });

        session.lastActivity = Date.now();

        // Log significant events
        if (data.changes?.buildings?.length > 0) {
          const event: GameEvent = {
            type: 'building_placed',
            playerId: session.userId,
            cityId: session.cityId,
            data: data.changes.buildings,
            timestamp: Date.now()
          };
          gameEvents.push(event);
          
          // Broadcast to region
          io.to(`region_${session.regionId}`).emit('game_event', event);
        }

      } catch (error) {
        console.error('City update error:', error);
        socket.emit('error', { message: 'Failed to update city' });
      }
    });

    socket.on('trade_request', async (data) => {
      try {
        const session = playerSessions.get(socket.id);
        
        if (!session || !session.regionId || !session.cityId) {
          socket.emit('error', { message: 'Not in a region' });
          return;
        }

        const { targetCityId, resource, quantity, price } = data;

        // Create trade offer
        const tradeOffer = await storage.createTradeOffer({
          fromCityId: session.cityId,
          toCityId: targetCityId,
          resource,
          quantity,
          price,
          status: 'pending',
          createdAt: new Date()
        });

        // Find target player and notify
        const regionSession = regionSessions.get(session.regionId);
        if (regionSession) {
          const targetPlayer = Array.from(regionSession.players.values())
            .find(p => p.cityId === targetCityId);
          
          if (targetPlayer) {
            targetPlayer.socket.emit('trade_offer_received', {
              tradeId: tradeOffer.id,
              fromCityId: session.cityId,
              fromPlayer: session.username,
              resource,
              quantity,
              price
            });
          }
        }

        socket.emit('trade_offer_sent', { tradeId: tradeOffer.id });

        console.log(`💰 Trade offer created: ${session.username} -> ${targetCityId} (${resource})`);
      } catch (error) {
        console.error('Trade request error:', error);
        socket.emit('error', { message: 'Failed to create trade offer' });
      }
    });

    socket.on('trade_response', async (data) => {
      try {
        const session = playerSessions.get(socket.id);
        
        if (!session || !session.regionId || !session.cityId) {
          socket.emit('error', { message: 'Not in a region' });
          return;
        }

        const { tradeId, accepted } = data;

        if (accepted) {
          const success = await storage.acceptTradeOffer(tradeId);
          
          if (success) {
            // Notify both players
            const tradeOffer = await storage.getTradeOffer(tradeId);
            
            const regionSession = regionSessions.get(session.regionId);
            if (regionSession && tradeOffer) {
              const fromPlayer = Array.from(regionSession.players.values())
                .find(p => p.cityId === tradeOffer.fromCityId);
              
              if (fromPlayer) {
                fromPlayer.socket.emit('trade_completed', {
                  tradeId,
                  resource: tradeOffer.resource,
                  quantity: tradeOffer.quantity,
                  price: tradeOffer.price
                });
              }

              socket.emit('trade_completed', {
                tradeId,
                resource: tradeOffer.resource,
                quantity: tradeOffer.quantity,
                price: tradeOffer.price
              });

              // Update regional economy
              const event: GameEvent = {
                type: 'trade_completed',
                playerId: session.userId,
                cityId: session.cityId,
                data: tradeOffer,
                timestamp: Date.now()
              };
              gameEvents.push(event);
              
              io.to(`region_${session.regionId}`).emit('game_event', event);
            }
          }
        } else {
          // Decline trade offer
          await storage.declineTradeOffer(tradeId);
        }

      } catch (error) {
        console.error('Trade response error:', error);
        socket.emit('error', { message: 'Failed to process trade response' });
      }
    });

    socket.on('great_work_contribute', async (data) => {
      try {
        const session = playerSessions.get(socket.id);
        
        if (!session || !session.regionId || !session.cityId) {
          socket.emit('error', { message: 'Not in a region' });
          return;
        }

        const { greatWorkId, resources } = data;

        const success = await storage.contributeToGreatWork(greatWorkId, session.cityId, resources);
        
        if (success) {
          // Notify all players in region
          io.to(`region_${session.regionId}`).emit('great_work_progress', {
            greatWorkId,
            contributor: session.username,
            cityId: session.cityId,
            resources
          });

          const event: GameEvent = {
            type: 'great_work_contribution',
            playerId: session.userId,
            cityId: session.cityId,
            data: { greatWorkId, resources },
            timestamp: Date.now()
          };
          gameEvents.push(event);
          
          io.to(`region_${session.regionId}`).emit('game_event', event);

          console.log(`🏗️ Great work contribution: ${session.username} contributed to ${greatWorkId}`);
        }

      } catch (error) {
        console.error('Great work contribution error:', error);
        socket.emit('error', { message: 'Failed to contribute to great work' });
      }
    });

    socket.on('chat_message', async (data) => {
      try {
        const session = playerSessions.get(socket.id);
        
        if (!session || !session.regionId) {
          socket.emit('error', { message: 'Not in a region' });
          return;
        }

        const { message, type = 'general' } = data;

        if (!message || message.trim().length === 0) {
          return;
        }

        const chatMessage = {
          id: Date.now(),
          userId: session.userId,
          username: session.username,
          message: message.trim(),
          type,
          timestamp: Date.now()
        };

        // Broadcast to region
        io.to(`region_${session.regionId}`).emit('chat_message', chatMessage);

        // Store chat history (optional)
        await storage.saveChatMessage(session.regionId, chatMessage);

      } catch (error) {
        console.error('Chat message error:', error);
      }
    });

    socket.on('get_region_stats', async (data) => {
      try {
        const session = playerSessions.get(socket.id);
        
        if (!session || !session.regionId) {
          socket.emit('error', { message: 'Not in a region' });
          return;
        }

        const stats = await storage.getRegionalPerformance(session.regionId);
        socket.emit('region_stats', stats);

      } catch (error) {
        console.error('Get region stats error:', error);
        socket.emit('error', { message: 'Failed to get region stats' });
      }
    });

    socket.on('disconnect', () => {
      const session = playerSessions.get(socket.id);
      
      if (session) {
        // Remove from region session
        if (session.regionId) {
          const regionSession = regionSessions.get(session.regionId);
          if (regionSession) {
            regionSession.players.delete(session.userId);
            
            // Notify other players
            socket.to(`region_${session.regionId}`).emit('player_left', {
              userId: session.userId,
              username: session.username
            });

            // Clean up empty region sessions
            if (regionSession.players.size === 0) {
              regionSession.isActive = false;
            }
          }
        }

        playerSessions.delete(socket.id);
        console.log(`🔌 Player disconnected: ${session.username} (${socket.id})`);
      }
    });
  });

  // Periodic synchronization
  setInterval(async () => {
    const activeRegions = Array.from(regionSessions.values()).filter(r => r.isActive);
    
    for (const regionSession of activeRegions) {
      try {
        // Sync city data between players
        await regionSession.citySync.synchronize();
        
        // Send periodic updates to players
        const regionState = await regionSession.citySync.getRegionState();
        io.to(`region_${regionSession.regionId}`).emit('region_sync', regionState);
        
        regionSession.lastUpdate = Date.now();
      } catch (error) {
        console.error(`Sync error for region ${regionSession.regionId}:`, error);
      }
    }
  }, SYNC_INTERVAL);

  // Cleanup inactive sessions
  setInterval(() => {
    const now = Date.now();
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes

    // Clean up inactive player sessions
    for (const [socketId, session] of playerSessions.entries()) {
      if (now - session.lastActivity > inactivityThreshold) {
        session.socket.disconnect();
        playerSessions.delete(socketId);
        console.log(`🧹 Cleaned up inactive session: ${session.username}`);
      }
    }

    // Clean up inactive region sessions
    for (const [regionId, regionSession] of regionSessions.entries()) {
      if (!regionSession.isActive && now - regionSession.lastUpdate > inactivityThreshold) {
        regionSessions.delete(regionId);
        console.log(`🧹 Cleaned up inactive region session: ${regionId}`);
      }
    }

    // Clean up old game events
    const eventRetentionTime = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffTime = now - eventRetentionTime;
    
    for (let i = gameEvents.length - 1; i >= 0; i--) {
      if (gameEvents[i].timestamp < cutoffTime) {
        gameEvents.splice(i, 1);
      }
    }
  }, CLEANUP_INTERVAL);

  console.log('✅ Multiplayer game server setup complete');
}
