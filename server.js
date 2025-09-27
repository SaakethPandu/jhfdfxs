import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for testing
    methods: ["GET", "POST"]
  }
});

let players = {};
let bullets = [];

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  players[socket.id] = {
    x: 100,
    y: 100,
    color: getRandomColor(),
    health: 100,
    alive: true
  };

  // Send init data
  socket.emit("init", {
    id: socket.id,
    players,
    bullets
  });

  io.emit("update", { players, bullets });

  socket.on("move", (data) => {
    if (!players[socket.id]?.alive) return;
    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
    io.emit("update", { players, bullets });
  });

  socket.on("shoot", (data) => {
    bullets.push({
      x: data.x,
      y: data.y,
      dx: data.dx,
      dy: data.dy,
      owner: socket.id
    });
    io.emit("update", { players, bullets });
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    delete players[socket.id];
    io.emit("update", { players, bullets });
  });
});

function getRandomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

// Bullet movement loop
setInterval(() => {
  bullets.forEach((bullet, index) => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;

    for (let id in players) {
      if (id !== bullet.owner && players[id].alive) {
        let p = players[id];
        if (bullet.x > p.x && bullet.x < p.x + 50 && bullet.y > p.y && bullet.y < p.y + 50) {
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

    if (bullet.x < 0 || bullet.y < 0 || bullet.x > 2000 || bullet.y > 2000) {
      bullets.splice(index, 1);
    }
  });

  io.emit("update", { players, bullets });
}, 30);

const PORT = process.env.PORT || 8080; // ✅ Important for Render
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
