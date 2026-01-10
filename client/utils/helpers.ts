import { Vec2 } from "shared";
import { SCREEN_SIZE } from "./consts";

export function g2s(vec: Vec2) {
  const newVec: Vec2 = { x: 0, y: 0 };
  const minSize = Math.min(SCREEN_SIZE.x, SCREEN_SIZE.y);
  newVec.x = vec.x * (minSize / 2) + SCREEN_SIZE.x / 2;
  newVec.y = vec.y * (-minSize / 2) + SCREEN_SIZE.y / 2;
  return newVec;
}

export function s2g(vec: Vec2) {
  const newVec: Vec2 = { x: 0, y: 0 };
  const minSize = Math.min(SCREEN_SIZE.x, SCREEN_SIZE.y);
  newVec.x = (vec.x - SCREEN_SIZE.x / 2) / (minSize / 2);
  newVec.y = (vec.y - SCREEN_SIZE.y / 2) / (-minSize / 2);
  return newVec;
}

export function g2sScale(vec: Vec2) {
  const minSize = Math.min(SCREEN_SIZE.x, SCREEN_SIZE.y);
  const newVec: Vec2 = { x: vec.x * minSize / 2, y: vec.y * minSize / 2 };
  return newVec;
}

export function s2gScale(vec: Vec2) {
  const minSize = Math.min(SCREEN_SIZE.x, SCREEN_SIZE.y);
  const newVec: Vec2 = { x: vec.x / minSize / 2, y: vec.y / minSize / 2 };
  return newVec;
}
