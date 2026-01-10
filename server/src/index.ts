import { WebSocketServer } from "ws";
import {
  type State,
  type Message,
  handleMove,
  applyMove,
  Bullet,
  Vec2,
  Status,
} from "shared";

const wss = new WebSocketServer({ port: 8080 });
const FPS = 30;
const BULLET_SPAWN_RATE = 2;
const KILL_LEEWAY = 0.7;

const state: State = {
  players: {},
  bullets: [],
  status: Status.NOT_READY,
  startTime: null,
}

let curUserId = 0;

const clients: {
  [userId: number]: () => void,
} = {};

function main() {
  try {
    wss.on("connection", ws => {
      console.log("Client connected");

      const userId = curUserId++;

      clients[userId] = () => {
        ws.send(JSON.stringify(state));
      }

      ws.on("message", message => {
        const messageStr = message.toString();
        console.log("Received:", messageStr);

        const { action } = JSON.parse(messageStr) as Message;

        switch (action.type) {
          case "move": {
            handleMove(userId, action, state);
            break;
          }
          case "join": {
            break;
          }
          default: {
            throw new Error("Invalid action type attempted to be handled");
          }
        }
      });


      ws.on("close", () => {
        console.log("Client disconnected")
        delete clients[userId];
      });
    });

    console.log("WebSocket server running on ws://localhost:8080");

    let lastUpdate = Date.now();
    setInterval(() => {
      const now = Date.now();
      const dt = now - lastUpdate;
      update(dt);
      lastUpdate = now;
    }, 1000/FPS);

    setInterval(() => {
      if (state.status === Status.PLAYING) spawnBullet(state);
    }, 1000/BULLET_SPAWN_RATE);

  } catch (err) {
    console.error(err);
  }
}

function update(dt: number) {
  updateStatus(state);

  applyMove(state, dt);
  killPlayers(state);
  updateTimeAlives(state, dt);

  despawnBullets(state);

  for (const clientCb of Object.values(clients)) {
    clientCb();
  }
}

function updateStatus(state: State) {
  switch (state.status) {
    case Status.NOT_READY: {
      if (Object.keys(clients).length > 0) {
        state.status = Status.READY;
      }
      break;
    }

    case Status.READY: {
      // TODO: make players lock in?
      state.status = Status.STARTING;
        
      for (const userIdStr of Object.keys(clients)) {
        const userId = Number(userIdStr);
        spawnPlayer(state, userId);
      }

      break;
    }

    case Status.STARTING: {
      if (state.startTime === null) {
        state.startTime = Date.now() + 5000;
      } else if (state.startTime < Date.now()) {
        state.startTime = Date.now();
        state.status = Status.PLAYING;
      }
      break;
    }

    case Status.PLAYING: {
      if (Object.keys(state.players).length === 0) {
        state.status = Status.ROUND_OVER;
        state.startTime = null;
      }
      break;
    }

    case Status.ROUND_OVER: {
      if (state.startTime === null) {
        state.startTime = Date.now() + 5000;
      } else if (state.startTime < Date.now()) {
        state.startTime = null;
        state.status = Status.NOT_READY;
      }
      break;
    }
  }
}

function updateTimeAlives(state: State, dt: number) {
  for (const player of Object.values(state.players)) {
    if (player.lives > 0) player.timeAlive += dt;
  }
  state.bullets.forEach(bullet => bullet.timeAlive += dt);
}

function spawnPlayer(state: State, userId: number) {
  state.players[userId] = {
    pos: { x: 0, y: 0 },
    dest: { x: 0, y: 0 },
    size: 0.06,
    speed: 1,
    lives: 1,
    timeAlive: 0,
    userId,
  }
}

function spawnBullet(state: State) {
  const variance = (v: number = 0.1) => {
    return v * Math.random() - v / 2;
  }

  const playersList = Object.values(state.players);
  const targetPlayer = playersList[Math.floor(Math.random() * playersList.length)];

  if (targetPlayer === undefined && playersList.length > 0) {
    throw new Error("Managed to select undefined player from list in spawnBullet");
  }

  const targetPos: Vec2 = {
    x: (targetPlayer?.pos.x ?? 0) + variance(),
    y: (targetPlayer?.pos.y ?? 0) + variance(),
  }

  const angle = Math.random() * 2 * Math.PI;
  const dist = 3;
  const start: Vec2 = {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
  }
  const bullet: Bullet = {
    pos: start,
    dest: {
      x: start.x + (targetPos.x - start.x) * 100,
      y: start.y + (targetPos.y - start.y) * 100,
    },
    size: 0.03,
    speed: 1 * Math.pow((Date.now() - (state.startTime ?? Date.now())) / 1000 + 2, 1 / 6),
    timeAlive: 0,
  }
  state.bullets.push(bullet);
}

function despawnBullets(state: State) {
  const newBullets = state.bullets.filter(
    bullet => state.status === Status.PLAYING && bullet.timeAlive < 10000
  );
  state.bullets = newBullets;
}

function killPlayers(state: State) {
  const killedPlayers: number[] = [];
  const killedBullets: number[] = [];

  for (const player of Object.values(state.players)) {
    for (let i = 0; i < state.bullets.length; ++i) {
      const bullet = state.bullets[i];
      if (!bullet) throw Error("Somehow undefiend");

      if (
        Math.hypot(player.pos.x - bullet.pos.x, player.pos.y - bullet.pos.y)
       < (player.size + bullet.size) * KILL_LEEWAY) {
        killedPlayers.push(player.userId);
        killedBullets.push(i);
        break;
      }
    }
  }

  for (const userId of killedPlayers) {
    delete state.players[userId];
  }
  state.bullets = state.bullets.filter((_, idx) => !killedBullets.includes(idx));
}

main();

