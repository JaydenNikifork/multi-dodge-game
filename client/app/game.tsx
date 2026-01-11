"use client";

import { MouseEvent, RefObject, useEffect, useRef, useState } from "react"
import { Bullet, JoinAction, MoveAction, Player, State, Status, Vec2 } from "shared";
import { URL, SCREEN_SIZE } from "@/utils/consts";
import { g2s, g2sScale, s2g } from "@/utils/helpers";

export default function Game() {
  // CANVAS
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headerRef = useRef<HTMLHeadingElement>(null);

  // WEB
  const [socket, setSocket] = useState<WebSocket | null>(null);

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

        const joinAction: JoinAction = {
          type: "join",
          data: null,
        }

        socket.send(JSON.stringify({ action: joinAction }));

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
  ctx.strokeText(player.userId.toString(), drawPos.x, drawPos.y);
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
    players: {}, bullets: [], status: Status.NOT_READY, startTime: null,
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

  return null;
}
