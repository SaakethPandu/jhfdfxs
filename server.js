const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static client files (put client.html and related files in "public/")
app.use(express.static("public"));

// Track players and bullets
let players = {};
let bullets = [];

// New player joins
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  players[socket.id] = {
    x: 100,
    y: 100,
    color: getRandomColor(),
    health: 100,
    alive: true,
  };

  // Send initial state
  socket.emit("init", { id: socket.id, players, bullets });

  // Broadcast to everyone that a new player joined
  io.emit("update", { players, bullets });

  // Handle player movement
  socket.on("move", (data) => {
    if (!players[socket.id]?.alive) return;
    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
    io.emit("update", { players, bullets });
  });

  // Handle shooting
  socket.on("shoot", (data) => {
    if (!players[socket.id]?.alive) return;
    bullets.push({
      x: data.x,
      y: data.y,
      dx: data.dx,
      dy: data.dy,
      owner: socket.id,
    });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    delete players[socket.id];
    io.emit("update", { players, bullets });
  });
});

// Game loop for bullets
setInterval(() => {
  bullets.forEach((bullet, index) => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;

    // Collision with players
    for (let id in players) {
      if (id !== bullet.owner && players[id].alive) {
        let p = players[id];
        if (
          bullet.x > p.x &&
          bullet.x < p.x + 50 &&
          bullet.y > p.y &&
          bullet.y < p.y + 50
        ) {
          p.health -= 10;
          if (p.health <= 0) {
            p.health = 0;
            p.alive = false;
          }
          bullets.splice(index, 1);
          break;
        }
      }
    }

    // Remove off-screen bullets
    if (bullet.x < 0 || bullet.y < 0 || bullet.x > 2000 || bullet.y > 2000) {
      bullets.splice(index, 1);
    }
  });

  io.emit("update", { players, bullets });
}, 30);

// Random color generator
function getRandomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
