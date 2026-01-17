"use client";

import { MouseEvent, RefObject, useEffect, useRef, useState } from "react"
import { Bullet, JoinAction, MoveAction, Player, State, Status, Vec2, Score } from "shared";
import { URL, SCREEN_SIZE } from "@/utils/consts";
import { g2s, g2sScale, s2g } from "@/utils/helpers";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headerRef = useRef<HTMLHeadingElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) {
      const url = URL;
      if (!url) {
        throw new Error("Web socket url unset: " + url);
      }
      setSocket(new WebSocket(url));
    } else {
      socket.onopen = () => {
        console.log("Connected");
      };

      socket.onerror = error => {
        console.error("WebSocket error:", error);
      };

      socket.onclose = () => {
        console.log("Disconnected");
      };

      // Cleanup when component unmounts
      return () => {
        socket.close();
      }
    }
  }, [socket]);

  useEffect(() => {
    if (username !== null && socket !== null) {
      const joinAction: JoinAction = {
        type: "join",
        data: username,
      }

      socket.send(JSON.stringify({ action: joinAction }));
    }
  }, [username, socket]);

  useEffect(() => {
    const stop = (event: KeyboardEvent) => {
      if (event.key === 's' || event.key === 'S') {
        const action: MoveAction = {
          type: "move",
          data: null
        }
        socket?.send(JSON.stringify({ action }));
      }
    }

    document.addEventListener("keydown", stop);
    
    return () => {
      document.removeEventListener("keydown", stop);
    }
  }, [socket]);

  const onCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const element = event.currentTarget as HTMLCanvasElement;
    const rect = element.getBoundingClientRect();
    const screenClickVec: Vec2 = {
      x: event.clientX - rect.x,
      y: event.clientY - rect.y,
    }
    const gameClickVec = s2g(screenClickVec);
    const action: MoveAction = {
      type: "move",
      data: {
        x: gameClickVec.x,
        y: gameClickVec.y,
      }
    }
    const ctx = element.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 4;
    }
    ctx?.beginPath();
    ctx?.arc(screenClickVec.x, screenClickVec.y, 15, 0, 2 * Math.PI);
    ctx?.stroke();
    socket?.send(JSON.stringify({ action }));
  }

  return <>
    <div style={{
      textAlign: "center"
    }}>
      <h1 ref={headerRef} style={{ fontSize: "30px", textAlign: "center" }} />
      {username === null && <>
        <input
          ref={usernameInputRef}
          placeholder="Enter username here to join next round"
          style={{
            width: "400px"
          }}
        />
        <button
          onClick={() => {
            if (usernameInputRef.current && usernameInputRef.current.value !== "") {
              setUsername(usernameInputRef.current.value);
            }
          }}
          style={{
            backgroundColor: "#333"
          }}
        >
          Submit Username
        </button>
      </>}
      <canvas
        ref={canvasRef}
        width={`${SCREEN_SIZE.x}px`}
        height={`${SCREEN_SIZE.y}px`}
        onContextMenu={onCanvasClick}
        onClick={onCanvasClick}
        style={{ position: "fixed" }}
      />
    </div>
    <GameStateHandler socket={socket} canvasRef={canvasRef} headerRef={headerRef} />
  </>
}

function drawPlayer(player: Player, ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = `#${((player.userId) * 123456) % 1000000}`;
  const drawPos = g2s({
    x: player.pos.x,
    y: player.pos.y,
  });
  const drawSize = g2sScale({
    x: player.size,
    y: player.size,
  })

  ctx.beginPath();
  ctx.arc(drawPos.x, drawPos.y, drawSize.x, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = "gray";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.lineWidth = 1;
  ctx.strokeStyle = "black";
  ctx.font = "normal 14px serif"
  ctx.strokeText(player.userName, drawPos.x, drawPos.y - drawSize.y * 1.3);
}

function drawBullet(bullet: Bullet, ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "red";
  const drawPos = g2s({
    x: bullet.pos.x,
    y: bullet.pos.y,
  });
  const drawSize = g2sScale({
    x: bullet.size,
    y: bullet.size,
  })

  ctx.beginPath();
  ctx.arc(drawPos.x, drawPos.y, drawSize.x, 0, 2 * Math.PI);
  ctx.fill();
}

function GameStateHandler(
  { socket, canvasRef, headerRef }: {
    canvasRef: RefObject<HTMLCanvasElement | null>,
    socket: WebSocket | null,
    headerRef: RefObject<HTMLHeadingElement | null>,
  }
) {
  const [gameState, setGameState] = useState<State>({
    players: {}, bullets: [], status: Status.NOT_READY, startTime: null, roundId: null, leaderBoard: null,
  });
  const countdownIntervalRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (socket !== null) {
      socket.onmessage = (event: MessageEvent) => {
        setGameState(JSON.parse(event.data));
      }
    }
  }, [socket]);

  useEffect(() => {
    switch (gameState.status) {
      case Status.NOT_READY: {
        if (headerRef.current) {
          headerRef.current.textContent = `Waiting for players`;
        }
        break;
      }

      case Status.READY: {
        break;
      }

      case Status.STARTING: {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        const startTime = gameState.startTime ?? Date.now() + 5000;
        countdownIntervalRef.current = setInterval(() => {
          if (headerRef.current) {
            headerRef.current.textContent = `Starting in ${Math.ceil((startTime - Date.now()) / 1000)}s`;
          }
        }, 100);
        break;
      }

      case Status.PLAYING: {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        const startTime = Date.now();

        countdownIntervalRef.current = setInterval(() => {
          if (headerRef.current) {
            headerRef.current.textContent = `${Math.ceil((Date.now() - startTime) / 1000)}s`;
          }
        }, 100);
        break;
      }

      case Status.ROUND_OVER: {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        if (headerRef.current) {
          headerRef.current.textContent = "Round Over";
        }
        break;
      }

      case Status.ROUND_SCORES: {
        if (headerRef.current) {
          headerRef.current.textContent = "Round Scores";
        }
        console.log("ROUND SCORES:", gameState.leaderBoard);

        break;
      }

      case Status.HIGH_SCORES: {
        if (headerRef.current) {
          headerRef.current.textContent = "High Scores";
        }
        console.log("HIGH SCORES:", gameState.leaderBoard);

        break;
      }

    }
  }, [gameState.status, headerRef]);



  useEffect(() => {
    if (canvasRef.current !== null) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, SCREEN_SIZE.x, SCREEN_SIZE.y);

        for (const player of Object.values(gameState.players)) {
          drawPlayer(player, ctx);
        }
        for (const bullet of gameState.bullets) {
          drawBullet(bullet, ctx);
        }
      }
    }
  }, [canvasRef, gameState]);

  if ([Status.ROUND_SCORES, Status.HIGH_SCORES].includes(gameState.status)) {
    return <Leaderboard scores={gameState.leaderBoard} />;
  } else {
    return null;
  }

}

function Leaderboard({ scores }: { scores: Score[] | null }) {
  if (scores === null) return null;

  return (
    <table style={{
      position: "fixed",
      zIndex: 2,
      color: "black",
      border: "1px black solid",
      top: "100px",
      left: "200px",
    }}>
      <thead>
        <tr>
          <th>User Name</th>
          <th>Time Alive</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {scores.map((score, idx) => (
          <tr key={idx}>
            <td>{score.userName}</td>
            <td>{(score.timeAlive / 1000).toFixed(1)}s</td>
            <td>{score.timestamp.toString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
