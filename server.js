
const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("TD2D The Last Disaster server is running!");
});

const wss = new WebSocket.Server({ server });

const players = new Map();
let nextId = 1;

function sendAll(data, except = null) {
  const message = JSON.stringify(data);

  for (const client of wss.clients) {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

wss.on("connection", (ws) => {
  const id = String(nextId++);

  players.set(id, {
    id,
    name: "Player",
    x: 100,
    y: 200,
    skin: "Blue Sonic",
    ready: false
  });

  ws.playerId = id;

  ws.send(JSON.stringify({
    type: "welcome",
    id,
    players: Array.from(players.values())
  }));

  sendAll({
    type: "player_joined",
    player: players.get(id)
  }, ws);

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const player = players.get(id);
      if (!player) return;

      if (data.type === "update") {
        if (typeof data.x === "number") player.x = data.x;
        if (typeof data.y === "number") player.y = data.y;
        if (typeof data.name === "string") {
          player.name = data.name.slice(0, 20);
        }
        if (typeof data.skin === "string") {
          player.skin = data.skin.slice(0, 40);
        }

        sendAll({
          type: "player_updated",
          player
        }, ws);
      }

      if (data.type === "chat") {
        sendAll({
          type: "chat",
          name: player.name,
          text: String(data.text || "").slice(0, 200)
        });
      }

      if (data.type === "ready") {
        player.ready = Boolean(data.value);
        sendAll({
          type: "player_updated",
          player
        });
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Invalid message"
      }));
    }
  });

  ws.on("close", () => {
    players.delete(id);
    sendAll({
      type: "player_left",
      id
    });
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("TD2D server listening on port " + PORT);
});