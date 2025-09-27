// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for now
  },
});

// Serve static files (optional, if you want to serve client.html directly)
app.use(express.static("."));

const PORT = process.env.PORT || 8080;

// Game state
let players = {};
let bullets = [];

// Handle socket connections
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Add new player
  players[socket.id] = { x: 100, y: 100, speed: 5 };

  // Handle movement
  socket.on("movement", (keys) => {
    const player = players[socket.id];
    if (!player) return;

    if (keys["w"] || keys["ArrowUp"]) player.y -= player.speed;
    if (keys["s"] || keys["ArrowDown"]) player.y += player.speed;
    if (keys["a"] || keys["ArrowLeft"]) player.x -= player.speed;
    if (keys["d"] || keys["ArrowRight"]) player.x += player.speed;
  });

  // Handle shooting
  socket.on("shoot", (target) => {
    const player = players[socket.id];
    if (!player) return;

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const dist = Math.hypot(dx, dy);
    const speed = 10;

    bullets.push({
      x: player.x + 10,
      y: player.y + 10,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
    });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
  });
});

// Update loop
setInterval(() => {
  // Update bullets
  for (const bullet of bullets) {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
  }

  // Send game state to clients
  io.emit("state", { players, bullets });
}, 1000 / 30); // 30 FPS

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
