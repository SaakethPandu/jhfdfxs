import { WebSocketServer } from "ws";
import http from "http";

const server = http.createServer();
const wss = new WebSocketServer({ server });

let players = {};
let bullets = [];

function getRandomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

wss.on("connection", (ws) => {
  const playerId = Date.now().toString();
  players[playerId] = { x: 100, y: 100, color: getRandomColor(), health: 100, alive: true };

  ws.send(JSON.stringify({ type: "init", id: playerId, players, bullets }));

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (!players[playerId]?.alive) return;

    if (data.type === "move") {
      players[playerId].x = data.x;
      players[playerId].y = data.y;
    }

    if (data.type === "shoot") {
      bullets.push({
        x: data.x,
        y: data.y,
        dx: data.dx,
        dy: data.dy,
        owner: playerId
      });
    }
  });

  ws.on("close", () => {
    delete players[playerId];
  });
});

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

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "update", players, bullets }));
    }
  });
}, 30);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
