
export type Vec2 = {
  x: number,
  y: number,
}

export const SCREEN_SIZE: Vec2 = {
  x: 1000,
  y: 1000
}

export interface Obj {
  pos: Vec2,
  dest: Vec2,
  speed: number,
  size: number,
  timeAlive: number,
}

export interface Player extends Obj {
  userId: number,
  userName: string,
  lives: number,
}

export interface Bullet extends Obj {

}

export interface Score {
  userName: string,
  timeAlive: number,
  timestamp: Date,
}

export enum Status {
  NOT_READY,
  READY,
  STARTING,
  PLAYING,
  ROUND_OVER,
  ROUND_SCORES,
  HIGH_SCORES,
}

export type State = {
  players: { [userID: number]: Player },
  bullets: Bullet[],
  status: Status,
  startTime: number | null,
  roundId: number | null,
  leaderBoard: Score[] | null,
}

export function isNullLike(x: any) {
  return x === null || x === undefined;
}

export function assertIsAction(action: any) {
  if (isNullLike(action)) {
    throw new Error("assertIsAction: action is null-like");
  }

  if (!action.type) {
    throw new Error("assertIsAction: action has invalid type");
  }

  if (action.type === "move" && (isNullLike(action.data.x) || isNullLike(action.data.y))) {
    throw new Error(`assertIsAction: action of type 'move' has invalid data: ${JSON.stringify(action.data)}`);
  }

  if (action.type === "join" && !isNullLike(action.data.x)) {
    throw new Error(`assertIsAction: action of type 'join' has invalid data: ${JSON.stringify(action.data)}`);
  }
}

export type Message = {
  userID: number,
  action: Action,
}

export type MoveAction = {
  type: "move",
  data: Vec2 | null,
}

export type JoinAction = {
  type: "join",
  data: string,
}

export type Action = MoveAction | JoinAction;

export function handleMove(userID: number, action: MoveAction, state: State) {
  if (state.players[userID]) {
    state.players[userID].dest = action.data ?? state.players[userID].pos;
  }
}

export function applyMove(state: State, dt: number) {
  dt = Math.min(dt, 80);

  const getNewPos = (obj: Obj) => {
    const x = obj.dest.x - obj.pos.x;
    const y = obj.dest.y - obj.pos.y;
    const h = Math.hypot(x, y);
    const dx = h !== 0 ? x / h * obj.speed * dt / 1000 : 0;
    const dy = h !== 0 ? y / h * obj.speed * dt / 1000 : 0;
    const newPos = { x: 0, y: 0 };
    if (dx < 0) {
      newPos.x = Math.max(obj.pos.x + dx, obj.dest.x);
    } else {
      newPos.x = Math.min(obj.pos.x + dx, obj.dest.x);
    }
    if (dy < 0) {
      newPos.y = Math.max(obj.pos.y + dy, obj.dest.y);
    } else {
      newPos.y = Math.min(obj.pos.y + dy, obj.dest.y);
    }
    return newPos;
  }
  
  for (const player of Object.values(state.players)) {
    player.pos = getNewPos(player);
  }
  state.bullets.forEach((bullet) => {
    bullet.pos = getNewPos(bullet);
  });
}

