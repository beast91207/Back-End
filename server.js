const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));

app.use(express.json());

// Enhanced queue data structure
let queue = [];
let clients = [];
let currentUser = null;
let robotStatus = 'idle'; // idle, cleaning, stopped, rebooting
let turnStartTime = null;
let sessionDuration = 4 * 60 * 1000; // 4 minutes in milliseconds

// User session tracking
let userSessions = new Map(); // email -> { joinedAt, lastActivity, turnCount }

// Debug logging function
const debugLog = (message, data = {}) => {
  // Logging disabled
};

// Add user to queue with enhanced logic
app.post('/api/queue/join', (req, res) => {
  const { email } = req.body;
  
  debugLog('Queue join request', { email, currentQueueLength: queue.length, currentUser });
  
  if (!email) {
    debugLog('Join failed: Email required');
    return res.status(400).json({ error: "Email required" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    debugLog('Join failed: Invalid email format', { email });
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Check if user is already in queue - allow re-joining with same email
  if (queue.includes(email)) {
    debugLog('User already in queue, allowing re-join', { email, queue });
    // Remove existing entry and add to end of queue (re-join behavior)
    const existingIndex = queue.indexOf(email);
    queue.splice(existingIndex, 1);
    debugLog('Removed existing queue entry for re-join', { email, newQueueLength: queue.length });
  }

  // Check if user is currently active
  if (currentUser === email) {
    debugLog('Join failed: Already your turn', { email });
    return res.status(400).json({ error: "Already your turn" });
  }

  // Add user to queue
  queue.push(email);
  
  // Track user session
  if (!userSessions.has(email)) {
    userSessions.set(email, {
      joinedAt: new Date(),
      lastActivity: new Date(),
      turnCount: 0
    });
    debugLog('New user session created', { email });
  } else {
    userSessions.get(email).lastActivity = new Date();
    debugLog('Existing user session updated', { email });
  }

  const position = queue.indexOf(email) + 1;
  debugLog('User joined queue successfully', { 
    email, 
    queueLength: queue.length, 
    position,
    currentUser 
  });
  
  res.json({ 
    queueCount: queue.length,
    position: position,
    estimatedWaitTime: calculateWaitTime(queue.indexOf(email)),
    success: true
  });
  
  // Notify all clients about queue update
  notifyClients();
  
  // If this is the first user, start their turn immediately
  if (queue.length === 1) {
    debugLog('Starting first user turn', { email });
    startNextTurn();
  }
});

// Remove user from queue with enhanced logic
app.post('/api/queue/leave', (req, res) => {
  const { email } = req.body;
  
  debugLog('Queue leave request', { email, currentQueueLength: queue.length, currentUser });
  
  if (!email) {
    debugLog('Leave failed: Email required');
    return res.status(400).json({ error: "Email required" });
  }

  const index = queue.indexOf(email);
  if (index > -1) {
    queue.splice(index, 1);
    
    debugLog('User left queue', { 
      email, 
      newQueueLength: queue.length, 
      wasCurrentUser: currentUser === email 
    });
    
    // If the leaving user was the current user, end their turn
    if (currentUser === email) {
      debugLog('Current user left, ending turn', { email });
      endCurrentTurn();
    }
    
    // Additional cleanup: if queue is empty but currentUser still exists, clean it up
    if (queue.length === 0 && currentUser) {
      debugLog('Queue empty but currentUser exists, cleaning up', { currentUser });
      currentUser = null;
      robotStatus = 'idle';
      turnStartTime = null;
      notifyClients();
    }
    
    res.json({ 
      queueCount: queue.length,
      message: "Successfully left queue"
    });
    notifyClients();
  } else {
    debugLog('Leave failed: User not found in queue', { email, queue });
    res.status(404).json({ error: "User not found in queue" });
  }
});

// Get user's position in queue
app.get('/api/queue/position/:email', (req, res) => {
  const { email } = req.params;
  
  debugLog('Position check request', { email, currentQueueLength: queue.length, currentUser });
  
  const position = queue.indexOf(email);
  
  if (position === -1) {
    debugLog('Position check: User not in queue', { email });
    return res.status(404).json({ error: "User not in queue" });
  }
  
  const response = {
    position: position + 1,
    queueCount: queue.length,
    estimatedWaitTime: calculateWaitTime(position),
    isCurrentTurn: currentUser === email
  };
  
  debugLog('Position check result', response);
  res.json(response);
});

// Get user status (in queue, current turn, etc.)
app.get('/api/queue/status/:email', (req, res) => {
  const { email } = req.params;
  
  debugLog('Status check request', { email, currentQueueLength: queue.length, currentUser });
  
  const position = queue.indexOf(email);
  const isInQueue = position !== -1;
  const isCurrentTurn = currentUser === email;
  const session = userSessions.get(email);
  
  const response = {
    email,
    isInQueue,
    isCurrentTurn,
    position: isInQueue ? position + 1 : null,
    queueCount: queue.length,
    estimatedWaitTime: isInQueue ? calculateWaitTime(position) : null,
    hasSession: !!session,
    lastActivity: session?.lastActivity,
    turnCount: session?.turnCount || 0
  };
  
  debugLog('Status check result', response);
  res.json(response);
});

// Check if user can join queue
app.get('/api/queue/can-join/:email', (req, res) => {
  const { email } = req.params;
  
  debugLog('Can join check request', { email, currentQueueLength: queue.length, currentUser });
  
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const isInQueue = queue.includes(email);
  const isCurrentTurn = currentUser === email;
  const canJoin = !isInQueue && !isCurrentTurn;
  
  const response = {
    email,
    canJoin,
    isInQueue,
    isCurrentTurn,
    reason: canJoin ? null : (isInQueue ? "Already in queue" : "Already your turn")
  };
  
  debugLog('Can join check result', response);
  res.json(response);
});

// SSE endpoint for real-time updates
app.get('/api/queue/updates', (req, res) => {
  // Set headers for SSE
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  res.flushHeaders();

  // Send initial message
  res.write(`data: ${JSON.stringify({ 
    queueCount: queue.length, 
    currentTurn: currentUser,
    robotStatus: robotStatus,
    turnStartTime: turnStartTime,
    timeRemaining: calculateTimeRemaining(),
    queue: queue.slice(0, 5) // Send first 5 users for privacy
  })}\n\n`);

  // Add to clients list
  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  // Remove client on disconnect
  req.on('close', () => {
    const clientIndex = clients.findIndex(c => c.id === clientId);
    if (clientIndex > -1) {
      clients.splice(clientIndex, 1);
      debugLog(`Client ${clientId} disconnected. Active clients: ${clients.length}`);
    }
  });

  // Client connected
});

// Robot control endpoints with enhanced validation
app.post('/api/robot/start', (req, res) => {
  const { email } = req.body;
  
  if (!currentUser) {
    return res.status(403).json({ error: "No active user" });
  }
  
  if (email && email !== currentUser) {
    return res.status(403).json({ error: "Not your turn" });
  }
  
  robotStatus = 'cleaning';
  
  // Update user activity
  if (userSessions.has(currentUser)) {
    userSessions.get(currentUser).lastActivity = new Date();
  }
  
  // Robot started cleaning
  
  res.json({ status: 'success', message: 'Robot started cleaning' });
  notifyClients();
});

app.post('/api/robot/stop', (req, res) => {
  const { email } = req.body;
  
  if (!currentUser) {
    return res.status(403).json({ error: "No active user" });
  }
  
  if (email && email !== currentUser) {
    return res.status(403).json({ error: "Not your turn" });
  }
  
  robotStatus = 'stopped';
  
  // Update user activity
  if (userSessions.has(currentUser)) {
    userSessions.get(currentUser).lastActivity = new Date();
  }
  
  // Robot stopped
  
  res.json({ status: 'success', message: 'Robot stopped' });
  notifyClients();
});

app.post('/api/robot/reboot', (req, res) => {
  const { email } = req.body;
  
  if (!currentUser) {
    return res.status(403).json({ error: "No active user" });
  }
  
  if (email && email !== currentUser) {
    return res.status(403).json({ error: "Not your turn" });
  }
  
  robotStatus = 'rebooting';
  
  // Update user activity
  if (userSessions.has(currentUser)) {
    userSessions.get(currentUser).lastActivity = new Date();
  }
  
  // Robot rebooting
  
  res.json({ status: 'success', message: 'Robot rebooting' });

  // Notify clients about reboot immediately
  notifyClients();

  // Remove current user from queue and move to next after a brief moment
  // so clients can receive the rebooting state first
  setTimeout(() => {
    endCurrentTurn();
  }, 500);
});

// Get current queue status with enhanced information
app.get('/api/queue/status', (req, res) => {
  res.json({
    queueCount: queue.length,
    currentTurn: currentUser,
    robotStatus: robotStatus,
    turnStartTime: turnStartTime,
    timeRemaining: calculateTimeRemaining(),
    queue: queue.slice(0, 10), // Limit queue display for privacy
    activeSessions: userSessions.size
  });
});

// Admin endpoint to clear queue (for testing)
app.post('/api/admin/clear-queue', (req, res) => {
  const { secret } = req.body;
  
  debugLog('Admin clear queue request', { hasSecret: !!secret });
  
  if (secret !== 'admin123') {
    debugLog('Admin clear failed: Unauthorized');
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  const previousQueue = [...queue];
  const previousUser = currentUser;
  
  queue = [];
  currentUser = null;
  robotStatus = 'idle';
  turnStartTime = null;
  
  debugLog('Queue cleared by admin', { 
    previousQueueLength: previousQueue.length, 
    previousUser,
    clearedQueue: previousQueue 
  });
  
  res.json({ 
    message: "Queue cleared successfully",
    clearedUsers: previousQueue.length
  });
  notifyClients();
});

// Force reset endpoint for debugging
app.post('/api/debug/reset', (req, res) => {
  debugLog('Debug reset request');
  
  const previousState = {
    queueLength: queue.length,
    currentUser,
    robotStatus,
    clientCount: clients.length,
    sessionCount: userSessions.size
  };
  
  // Reset everything
  queue = [];
  currentUser = null;
  robotStatus = 'idle';
  turnStartTime = null;
  userSessions.clear();
  
  debugLog('Debug reset completed', { previousState });
  
  res.json({ 
    message: "System reset successfully",
    previousState
  });
  notifyClients();
});

// Notify all clients when queue or robot status changes
function notifyClients() {
  const data = {
    queueCount: queue.length,
    currentTurn: currentUser,
    robotStatus: robotStatus,
    turnStartTime: turnStartTime,
    timeRemaining: calculateTimeRemaining(),
    timestamp: new Date().toISOString()
  };

  debugLog('Notifying clients', { 
    clientCount: clients.length, 
    queueLength: queue.length, 
    currentUser,
    robotStatus 
  });

  clients.forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      debugLog('Error sending to client', { clientId: client.id, error: error.message });
      // Remove disconnected client
      clients = clients.filter(c => c.id !== client.id);
    }
  });
}

// Calculate estimated wait time for a position
function calculateWaitTime(position) {
  const averageTurnTime = sessionDuration / 1000 / 60; // in minutes
  return Math.round(position * averageTurnTime);
}

// Calculate time remaining for current turn
function calculateTimeRemaining() {
  if (!turnStartTime || !currentUser) return null;
  
  const elapsed = Date.now() - turnStartTime.getTime();
  const remaining = sessionDuration - elapsed;
  
  return Math.max(0, Math.round(remaining / 1000)); // in seconds
}

// Start next user's turn with enhanced logic
function startNextTurn() {
  debugLog('Starting next turn', { queueLength: queue.length, currentUser });
  
  if (queue.length === 0) {
    currentUser = null;
    robotStatus = 'idle';
    turnStartTime = null;
    notifyClients();
    debugLog('No users in queue, turn ended');
    return;
  }

  currentUser = queue[0];
  robotStatus = 'idle';
  turnStartTime = new Date();
  
  // Update user session
  if (userSessions.has(currentUser)) {
    userSessions.get(currentUser).turnCount++;
    userSessions.get(currentUser).lastActivity = new Date();
  }
  
  debugLog('Turn started', { 
    currentUser, 
    turnCount: userSessions.get(currentUser)?.turnCount || 1,
    turnStartTime: turnStartTime.toISOString()
  });
  notifyClients();
}

// End current user's turn and move to next with enhanced logic
function endCurrentTurn() {
  debugLog('Ending current turn', { currentUser, queueLength: queue.length });
  
  if (currentUser && queue.length > 0) {
    const endedUser = queue.shift(); // Remove current user from queue
    debugLog('Turn ended', { endedUser, newQueueLength: queue.length });
    
    currentUser = null;
    robotStatus = 'idle';
    turnStartTime = null;
    notifyClients();
    
    // Start next turn if there are users in queue
    if (queue.length > 0) {
      debugLog('Scheduling next turn', { delay: 2000 });
      setTimeout(() => {
        startNextTurn();
      }, 2000); // 2 second delay between turns
    } else {
      debugLog('No more users in queue');
    }
  } else if (currentUser && queue.length === 0) {
    // Handle case where currentUser exists but queue is empty
    debugLog('Cleaning up orphaned currentUser', { currentUser });
    currentUser = null;
    robotStatus = 'idle';
    turnStartTime = null;
    notifyClients();
  } else {
    debugLog('No current user or empty queue, nothing to end');
  }
}

// Auto-end turns after session duration
setInterval(() => {
  if (currentUser && queue.length > 0) {
    const timeRemaining = calculateTimeRemaining();
    if (timeRemaining <= 0) {
      debugLog('Auto-ending turn due to time expiration', { currentUser, timeRemaining });
      endCurrentTurn();
    }
  }
}, 10000); // Check every 10 seconds

// Clean up old user sessions (older than 24 hours)
setInterval(() => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  for (const [email, session] of userSessions.entries()) {
    if (session.lastActivity < oneDayAgo) {
      userSessions.delete(email);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

// Health check endpoint with enhanced information
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeClients: clients.length,
    queueLength: queue.length,
    currentUser: currentUser,
    robotStatus: robotStatus,
    turnStartTime: turnStartTime,
    timeRemaining: calculateTimeRemaining(),
    activeSessions: userSessions.size,
    uptime: process.uptime(),
    queue: queue.slice(0, 5), // Show first 5 users for debugging
    sessionEmails: Array.from(userSessions.keys()).slice(0, 5) // Show first 5 session emails
  };
  
  debugLog('Health check', healthData);
  res.json(healthData);
});

// Root endpoint
app.get('/', (req, res) => res.send('SmartClean Live Backend API'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // Server started successfully
});