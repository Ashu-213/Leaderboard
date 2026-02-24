import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import Team from './models/Team.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Socket.io setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL]
      : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// Rate limiting middleware - RELAXED FOR HIGH CONCURRENCY
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // Increased from 100 to handle more concurrent users
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const updateLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 100, // Increased from 20 to 100 updates per 10 seconds
  message: {
    error: 'Too many score updates, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use(generalLimiter);
app.use('/api/teams', updateLimiter);

// Health check endpoint for deployment services
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'success',
    message: 'Leaderboard API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Connect to MongoDB
connectDB();

// ============================================================================
// DEBOUNCED BROADCASTING SETUP - OPTIMIZED FOR HIGH CONCURRENCY
// ============================================================================

let broadcastTimeout = null;
const BROADCAST_DELAY = 100; // Reduced from 150ms for faster updates

// Connection tracking for better performance monitoring
let activeConnections = 0;
let totalUpdatesPerSecond = 0;
let updateCounter = 0;

// Reset counter every second
setInterval(() => {
  totalUpdatesPerSecond = updateCounter;
  updateCounter = 0;
}, 1000);

/**
 * Debounced version of broadcastLeaderboard to prevent excessive broadcasting
 * Groups multiple rapid updates into a single broadcast
 */
const debouncedBroadcast = () => {
  // Clear any existing timeout
  if (broadcastTimeout) {
    clearTimeout(broadcastTimeout);
  }
  
  // Set new timeout
  broadcastTimeout = setTimeout(async () => {
    try {
      await broadcastLeaderboard();
      broadcastTimeout = null;
    } catch (error) {
      console.error('Error in debounced broadcast:', error);
      broadcastTimeout = null;
    }
  }, BROADCAST_DELAY);
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch all teams, calculate ranks, and return sorted leaderboard
 */
const getLeaderboard = async () => {
  try {
    // Fetch all teams sorted by total (descending)
    const teams = await Team.find().sort({ total: -1, createdAt: 1 }).lean();

    // Assign ranks
    const leaderboard = teams.map((team, index) => ({
      ...team,
      _id: team._id.toString(),
      rank: index + 1,
    }));

    return leaderboard;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
};

/**
 * Broadcast updated leaderboard to all connected clients
 */
const broadcastLeaderboard = async () => {
  try {
    const leaderboard = await getLeaderboard();
    io.emit('leaderboardUpdated', leaderboard);
    console.log(`📡 Broadcasted leaderboard to ${io.engine.clientsCount} clients`);
  } catch (error) {
    console.error('Error broadcasting leaderboard:', error);
  }
};

// ============================================================================
// REST API ROUTES
// ============================================================================

// Get all teams with ranks
app.get('/api/teams', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new team
app.post('/api/teams', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = new Team({ name: name.trim() });
    await team.save();

    // Broadcast updated leaderboard
    await broadcastLeaderboard();

    res.status(201).json(team);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Team name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update a team's score
app.patch('/api/teams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Allowed fields for update
    const allowedFields = ['madLudo', 'treasureHunt', 'spaceRoulette', 'cosmicJump', 'spaceColosseum', 'name'];
    const scoreFields = ['madLudo', 'treasureHunt', 'spaceRoulette', 'cosmicJump', 'spaceColosseum'];

    // Check if this is a score update or name update
    const scoreUpdates = Object.keys(updates).filter(key => scoreFields.includes(key));
    const nameUpdate = updates.name;

    if (scoreUpdates.length === 1 && !nameUpdate) {
      // Single score field update - use atomic method
      const field = scoreUpdates[0];
      const value = Number(updates[field]);
      
      const updatedTeam = await Team.atomicUpdateScore(id, field, value);
      
      // Broadcast updated leaderboard (debounced to handle rapid updates)
      debouncedBroadcast();
      
      res.json(updatedTeam);
    } else {
      // Multiple fields or name update - use traditional method
      const updateFields = {};
      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          updateFields[key] = updates[key];
        }
      });

      const team = await Team.findById(id);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      Object.assign(team, updateFields);
      await team.save();

      // Broadcast updated leaderboard (debounced to handle rapid updates)
      debouncedBroadcast();

      res.json(team);
    }
  } catch (error) {
    if (error.message.includes('CONFLICT')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete functionality removed for security - teams cannot be deleted
// This prevents accidental or malicious team deletions during live competitions
// If you need to remove a team, contact the deployer

/*
// Delete a team - DISABLED FOR SECURITY
app.delete('/api/teams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const team = await Team.findByIdAndDelete(id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Broadcast updated leaderboard
    await broadcastLeaderboard();

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// SERVE FRONTEND STATIC FILES
// ============================================================================

// Get current directory path (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Handle client-side routing (SPA fallback)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Serve index.html for all other routes (React Router will handle client-side routing)
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// ============================================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================================

io.on('connection', (socket) => {
  activeConnections++;
  console.log(`✓ Client connected: ${socket.id} (Total: ${activeConnections}/${io.engine.clientsCount})`);

  // Send current leaderboard on connect
  getLeaderboard()
    .then((leaderboard) => {
      socket.emit('leaderboardUpdated', leaderboard);
    })
    .catch((error) => {
      console.error('Error sending initial leaderboard:', error);
    });

  // Handle score update via socket with enhanced retry mechanism for high concurrency
  socket.on('updateScore', async (data) => {
    const MAX_RETRIES = 5; // Increased from 3 for better conflict resolution
    let retryCount = 0;
    updateCounter++; // Track update frequency

    const attemptUpdate = async () => {
      try {
        const { teamId, field, value } = data;
        const numValue = Number(value);

        // Use atomic update method with optimistic locking
        const updatedTeam = await Team.atomicUpdateScore(teamId, field, numValue);

        console.log(`✎ Score updated: ${updatedTeam.name} - ${field} = ${numValue} (attempt ${retryCount + 1}) [${totalUpdatesPerSecond} ups]`);

        // Broadcast to all clients (will be debounced)
        debouncedBroadcast();

        // Notify the client of successful update
        socket.emit('updateSuccess', { 
          teamId,
          field,
          value: numValue,
          team: updatedTeam,
          attempts: retryCount + 1
        });

      } catch (error) {
        console.error(`Error updating score (attempt ${retryCount + 1}):`, error.message);
        
        // If it's a conflict error and we have retries left, retry after a smart delay
        if (error.message.includes('CONFLICT') && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`🔄 Retrying update for ${field} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
          
          // Exponential backoff with jitter for better collision avoidance
          const baseDelay = Math.min(50 * Math.pow(2, retryCount - 1), 500); // 50ms, 100ms, 200ms, 400ms, 500ms
          const jitter = Math.random() * 100; // 0-100ms random jitter
          const delay = baseDelay + jitter;
          
          setTimeout(attemptUpdate, delay);
          return;
        }
        
        // Send error to client with more details
        socket.emit('updateError', { 
          message: error.message,
          teamId,
          field,
          retryCount,
          serverLoad: {
            connections: activeConnections,
            updatesPerSecond: totalUpdatesPerSecond
          }
        });
      }
    };

    await attemptUpdate();
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    activeConnections--;
    console.log(`✗ Client disconnected: ${socket.id} (Total: ${activeConnections}/${io.engine.clientsCount})`);
  });

  // Add ping/pong for connection health monitoring
  socket.on('ping', () => {
    socket.emit('pong', { 
      serverTime: Date.now(),
      connections: activeConnections,
      updatesPerSecond: totalUpdatesPerSecond
    });
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log('');
  console.log('═════════════════════════════════════════════════════════');
  console.log('  🚀 LEADERBOARD SERVER RUNNING');
  console.log('═════════════════════════════════════════════════════════');
  console.log(`  📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`  🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`  🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('═════════════════════════════════════════════════════════');
  console.log('');
});
