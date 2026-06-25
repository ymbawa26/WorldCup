"use client";

import type { TournamentGameState } from "./schema";
import { parseImportedSave, serializeSave } from "./save";

const DB_NAME = "world-stage-saves";
const STORE_NAME = "saves";
const CURRENT_SAVE_KEY = "current";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveGame(state: TournamentGameState) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(state, CURRENT_SAVE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function loadGame() {
  const database = await openDatabase();
  const state = await new Promise<TournamentGameState | null>(
    (resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(CURRENT_SAVE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () =>
        resolve(
          request.result
            ? parseImportedSave(JSON.stringify(request.result))
            : null,
        );
    },
  );
  database.close();
  return state;
}

export async function resetSave() {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(CURRENT_SAVE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export function exportSave(state: TournamentGameState) {
  return serializeSave(state);
}

export async function importSave(text: string) {
  const state = parseImportedSave(text);
  await saveGame(state);
  return state;
}
