import { v4 as uuidv4 } from "uuid";

export function getFakeUserId() {
  return uuidv4();
}

export function getFakeCategoryId() {
  return `CA-${uuidv4()}`;
}

export function getFakeTaskId() {
  return `TA-${uuidv4()}`;
}