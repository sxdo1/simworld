import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { setupGameServer } from "./multiplayer/gameServer";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes for city simulation
  
  // User management
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }
      
      const user = await storage.createUser({ username, password });
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // City data management
  app.get("/api/cities/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const cities = await storage.getUserCities(parseInt(userId));
      res.json(cities);
    } catch (error) {
      console.error('Get cities error:', error);
      res.status(500).json({ error: "Failed to fetch cities" });
    }
  });

  app.post("/api/cities", async (req, res) => {
    try {
      const { userId, cityName, cityData } = req.body;
      
      if (!userId || !cityName || !cityData) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const city = await storage.createCity({
        userId: parseInt(userId),
        name: cityName,
        data: cityData,
        lastSaved: new Date()
      });
      
      res.json(city);
    } catch (error) {
      console.error('Create city error:', error);
      res.status(500).json({ error: "Failed to create city" });
    }
  });

  app.put("/api/cities/:cityId", async (req, res) => {
    try {
      const { cityId } = req.params;
      const { cityData } = req.body;
      
      if (!cityData) {
        return res.status(400).json({ error: "City data required" });
      }
      
      const success = await storage.updateCity(parseInt(cityId), {
        data: cityData,
        lastSaved: new Date()
      });
      
      if (!success) {
        return res.status(404).json({ error: "City not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Update city error:', error);
      res.status(500).json({ error: "Failed to update city" });
    }
  });

  app.delete("/api/cities/:cityId", async (req, res) => {
    try {
      const { cityId } = req.params;
      const success = await storage.deleteCity(parseInt(cityId));
      
      if (!success) {
        return res.status(404).json({ error: "City not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete city error:', error);
      res.status(500).json({ error: "Failed to delete city" });
    }
  });

  // Regional trading and cooperation
  app.get("/api/regions/:regionId/trade", async (req, res) => {
    try {
      const { regionId } = req.params;
      const tradeOffers = await storage.getRegionalTradeOffers(parseInt(regionId));
      res.json(tradeOffers);
    } catch (error) {
      console.error('Get trade offers error:', error);
      res.status(500).json({ error: "Failed to fetch trade offers" });
    }
  });

  app.post("/api/trade", async (req, res) => {
    try {
      const { fromCityId, toCityId, resource, quantity, price } = req.body;
      
      if (!fromCityId || !toCityId || !resource || !quantity || !price) {
        return res.status(400).json({ error: "Missing required trade parameters" });
      }
      
      const trade = await storage.createTradeOffer({
        fromCityId: parseInt(fromCityId),
        toCityId: parseInt(toCityId),
        resource,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        status: 'pending',
        createdAt: new Date()
      });
      
      res.json(trade);
    } catch (error) {
      console.error('Create trade offer error:', error);
      res.status(500).json({ error: "Failed to create trade offer" });
    }
  });

  app.put("/api/trade/:tradeId/accept", async (req, res) => {
    try {
      const { tradeId } = req.params;
      const success = await storage.acceptTradeOffer(parseInt(tradeId));
      
      if (!success) {
        return res.status(404).json({ error: "Trade offer not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Accept trade error:', error);
      res.status(500).json({ error: "Failed to accept trade offer" });
    }
  });

  // Economic statistics and analytics
  app.get("/api/analytics/economic-trends", async (req, res) => {
    try {
      const trends = await storage.getEconomicTrends();
      res.json(trends);
    } catch (error) {
      console.error('Get economic trends error:', error);
      res.status(500).json({ error: "Failed to fetch economic trends" });
    }
  });

  app.get("/api/analytics/regional-performance/:regionId", async (req, res) => {
    try {
      const { regionId } = req.params;
      const performance = await storage.getRegionalPerformance(parseInt(regionId));
      res.json(performance);
    } catch (error) {
      console.error('Get regional performance error:', error);
      res.status(500).json({ error: "Failed to fetch regional performance" });
    }
  });

  // Multiplayer regions and Great Works
  app.get("/api/regions", async (req, res) => {
    try {
      const regions = await storage.getAvailableRegions();
      res.json(regions);
    } catch (error) {
      console.error('Get regions error:', error);
      res.status(500).json({ error: "Failed to fetch regions" });
    }
  });

  app.post("/api/regions", async (req, res) => {
    try {
      const { name, maxCities, creatorId } = req.body;
      
      if (!name || !maxCities || !creatorId) {
        return res.status(400).json({ error: "Missing required region parameters" });
      }
      
      const region = await storage.createRegion({
        name,
        maxCities: parseInt(maxCities),
        creatorId: parseInt(creatorId),
        createdAt: new Date()
      });
      
      res.json(region);
    } catch (error) {
      console.error('Create region error:', error);
      res.status(500).json({ error: "Failed to create region" });
    }
  });

  app.post("/api/regions/:regionId/join", async (req, res) => {
    try {
      const { regionId } = req.params;
      const { userId, cityId } = req.body;
      
      if (!userId || !cityId) {
        return res.status(400).json({ error: "User ID and City ID required" });
      }
      
      const success = await storage.joinRegion(
        parseInt(regionId), 
        parseInt(userId), 
        parseInt(cityId)
      );
      
      if (!success) {
        return res.status(400).json({ error: "Unable to join region" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Join region error:', error);
      res.status(500).json({ error: "Failed to join region" });
    }
  });

  app.get("/api/great-works/:regionId", async (req, res) => {
    try {
      const { regionId } = req.params;
      const greatWorks = await storage.getGreatWorks(parseInt(regionId));
      res.json(greatWorks);
    } catch (error) {
      console.error('Get great works error:', error);
      res.status(500).json({ error: "Failed to fetch great works" });
    }
  });

  app.post("/api/great-works", async (req, res) => {
    try {
      const { regionId, name, type, requiredResources, contributingCities } = req.body;
      
      if (!regionId || !name || !type || !requiredResources) {
        return res.status(400).json({ error: "Missing required great work parameters" });
      }
      
      const greatWork = await storage.createGreatWork({
        regionId: parseInt(regionId),
        name,
        type,
        requiredResources,
        contributingCities: contributingCities || [],
        progress: 0,
        status: 'planning',
        createdAt: new Date()
      });
      
      res.json(greatWork);
    } catch (error) {
      console.error('Create great work error:', error);
      res.status(500).json({ error: "Failed to create great work" });
    }
  });

  app.post("/api/great-works/:greatWorkId/contribute", async (req, res) => {
    try {
      const { greatWorkId } = req.params;
      const { cityId, resources } = req.body;
      
      if (!cityId || !resources) {
        return res.status(400).json({ error: "City ID and resources required" });
      }
      
      const success = await storage.contributeToGreatWork(
        parseInt(greatWorkId),
        parseInt(cityId),
        resources
      );
      
      if (!success) {
        return res.status(400).json({ error: "Unable to contribute to great work" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Contribute to great work error:', error);
      res.status(500).json({ error: "Failed to contribute to great work" });
    }
  });

  // Leaderboards and achievements
  app.get("/api/leaderboard/population", async (req, res) => {
    try {
      const leaderboard = await storage.getPopulationLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error('Get population leaderboard error:', error);
      res.status(500).json({ error: "Failed to fetch population leaderboard" });
    }
  });

  app.get("/api/leaderboard/economy", async (req, res) => {
    try {
      const leaderboard = await storage.getEconomicLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error('Get economic leaderboard error:', error);
      res.status(500).json({ error: "Failed to fetch economic leaderboard" });
    }
  });

  app.get("/api/achievements/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const achievements = await storage.getUserAchievements(parseInt(userId));
      res.json(achievements);
    } catch (error) {
      console.error('Get achievements error:', error);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  // Create HTTP server and set up WebSocket for real-time multiplayer
  const httpServer = createServer(app);
  
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Set up multiplayer game server
  setupGameServer(io, storage);

  return httpServer;
}
