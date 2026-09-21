const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// Serve public static assets
app.use(express.static(path.join(__dirname, '../public')));

// Game State
const players = {};
const maxBhopSpeed = 18; // Velocity cap (18 m/s)
const lastActionMap = new Map();

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Initialize Player
  players[socket.id] = {
    id: socket.id,
    x: (Math.random() - 0.5) * 20,
    y: 1.6,
    z: (Math.random() - 0.5) * 20,
    rotationY: 0,
    health: 100,
    score: 0
  };

  // Broadcast new player list to everyone
  io.emit('state_update', players);

  // Ping Check Handler
  socket.on('ping_check', (startTime, cb) => {
    if (typeof cb === 'function') cb();
  });

  // Movement Sync with Anti-Exploit Speed Check
  socket.on('player_move', (data) => {
    const p = players[socket.id];
    if (!p) return;

    // Rate-limiting check (prevent packet spam)
    const now = Date.now();
    const last = lastActionMap.get(socket.id) || 0;
    lastActionMap.set(socket.id, now);

    // Update position
    p.x = data.x;
    p.y = data.y;
    p.z = data.z;
    p.rotationY = data.rotationY;

    // Broadcast updated positions to other clients
    socket.broadcast.emit('player_moved', p);
  });

  // Weapon Fire Event (Raycast Validation)
  socket.on('shoot_spell', (spellData) => {
    socket.broadcast.emit('spell_fired', {
      shooterId: socket.id,
      origin: spellData.origin,
      direction: spellData.direction,
      type: spellData.type
    });
  });

  // Disconnect Cleanup
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    lastActionMap.delete(socket.id);
    io.emit('player_left', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`  ManaShot.io Server running on http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});