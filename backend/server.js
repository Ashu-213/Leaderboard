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

// Rate limiting middleware
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const updateLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 20, // Limit each IP to 20 updates per 10 seconds
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
// DEBOUNCED BROADCASTING SETUP
// ============================================================================

let broadcastTimeout = null;
const BROADCAST_DELAY = 150; // milliseconds

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
    const updateFields = {};

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateFields[key] = updates[key];
      }
    });

    // Atomic update
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    Object.assign(team, updateFields);
    await team.save();

    // Broadcast updated leaderboard (debounced to handle rapid updates)
    debouncedBroadcast();

    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  console.log(`✓ Client connected: ${socket.id} (Total: ${io.engine.clientsCount})`);

  // Send current leaderboard on connect
  getLeaderboard()
    .then((leaderboard) => {
      socket.emit('leaderboardUpdated', leaderboard);
    })
    .catch((error) => {
      console.error('Error sending initial leaderboard:', error);
    });

  // Handle score update via socket
  socket.on('updateScore', async (data) => {
    try {
      const { teamId, field, value } = data;

      // Validate field
      const validFields = ['madLudo', 'treasureHunt', 'spaceRoulette', 'cosmicJump', 'spaceColosseum'];
      if (!validFields.includes(field)) {
        socket.emit('error', { message: 'Invalid field' });
        return;
      }

      // Validate value
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        socket.emit('error', { message: 'Invalid score value' });
        return;
      }

      // First get current team to calculate new total
      const currentTeam = await Team.findById(teamId);
      if (!currentTeam) {
        socket.emit('error', { message: 'Team not found' });
        return;
      }

      // Calculate new total with the updated field
      const newTotal = 
        (field === 'madLudo' ? numValue : currentTeam.madLudo) +
        (field === 'treasureHunt' ? numValue : currentTeam.treasureHunt) +
        (field === 'spaceRoulette' ? numValue : currentTeam.spaceRoulette) +
        (field === 'cosmicJump' ? numValue : currentTeam.cosmicJump) +
        (field === 'spaceColosseum' ? numValue : currentTeam.spaceColosseum);

      // Atomic update to prevent race conditions - update both field and total
      const updatedTeam = await Team.findByIdAndUpdate(
        teamId,
        { 
          [field]: numValue,
          total: newTotal
        },
        { 
          new: true, // Return updated document
          runValidators: true // Run mongoose validators
        }
      );

      if (!updatedTeam) {
        socket.emit('error', { message: 'Team not found' });
        return;
      }

      console.log(`✎ Score updated: ${updatedTeam.name} - ${field} = ${numValue}`);

      // Broadcast to all clients (will be debounced)
      debouncedBroadcast();
    } catch (error) {
      console.error('Error updating score:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id} (Total: ${io.engine.clientsCount})`);
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
