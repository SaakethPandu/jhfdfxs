import { Server } from "socket.io";
import http from "http";

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" }
});

let players = {};
let bullets = [];

// 🎨 Random player color
function getRandomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

io.on("connection", (socket) => {
  const playerId = socket.id;
  players[playerId] = { x: 100, y: 100, color: getRandomColor(), health: 100, alive: true };

  // Send initial state
  socket.emit("init", { id: playerId, players, bullets });
  io.emit("update", { players, bullets });

  // Movement
  socket.on("move", (data) => {
    if (players[playerId] && players[playerId].alive) {
      players[playerId].x = data.x;
      players[playerId].y = data.y;
    }
  });

  // Shooting
  socket.on("shoot", (data) => {
    if (players[playerId] && players[playerId].alive) {
      bullets.push({
        x: data.x,
        y: data.y,
        dx: data.dx,
        dy: data.dy,
        owner: playerId
      });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    delete players[playerId];
    io.emit("update", { players, bullets });
  });
});

// Bullet physics & collision
setInterval(() => {
  bullets.forEach((bullet, index) => {
    // ⚡ Faster bullets (match client speed = 15)
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;

    for (let id in players) {
      if (id !== bullet.owner && players[id]?.alive) {
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
}, 60); // ~16 updates/sec (smoother)
 
// 🚀 Start server (Render/Heroku will set PORT)
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
