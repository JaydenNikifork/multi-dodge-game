import Database from "better-sqlite3";
import { Player, Score } from "shared";

const db = new Database("multi-dodge-game.db", { verbose: console.log });

db.prepare(`
           CREATE TABLE IF NOT EXISTS scores
           (name TEXT, points INTEGER, roundId INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)
           `).run();

export function insertScore(player: Player, roundId: number) {
  const insert = db.prepare("INSERT INTO scores (name, points, roundId) VALUES (?, ?, ?)");
  insert.run(player.userName, player.timeAlive, roundId);
}

export function getTop10AllTime() {
  const select = db.prepare(`
                            SELECT * FROM scores
                            ORDER BY scores.points DESC
                            LIMIT 10
                            `);
  const top10AllTimeRaw = select.all();
  const top10AllTime: Score[] = top10AllTimeRaw.map((scoreRaw: any) => ({
    userName: scoreRaw.name,
    timeAlive: scoreRaw.points,
    timestamp: scoreRaw.timestamp,
  }));
  return top10AllTime;
}

export function getScoresFromRound(roundId: number) {
  const select = db.prepare(`
                            SELECT * FROM scores
                            WHERE scores.roundId = ?
                            ORDER BY scores.points DESC
                            `);
  const scoresRaw = select.all(roundId);
  const scores: Score[] = scoresRaw.map((scoreRaw: any) => ({
    userName: scoreRaw.name,
    timeAlive: scoreRaw.points,
    timestamp: scoreRaw.timestamp,
  }));
  return scores;
}
