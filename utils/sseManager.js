import pg from "pg";
import TaskService from "../services/taskService.js";
import { v4 as uuidv4 } from "uuid";

const sseClients = new Map();
let listenerTaskChanges = null;

function addSSEClient(userId, res) {
  /** Lazy initialization - Enable the listener when the first client connects */
  if (sseClients.size === 0) {
    enableDBListener();
  }
  const clientId = uuidv4();
  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Map());
  }
  sseClients.get(userId).set(clientId, res);

  return clientId;
}

function removeSSEClient(userId, clientId) {
  const clients = sseClients.get(userId);

  if (clients) {
    clients.delete(clientId);

    if (clients.size === 0) {
      sseClients.delete(userId);
    }
  }

  if (sseClients.size === 0) disableDBListener();
}

//FIXME-LATER consider sending periodic empty messages to keep connection alive: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
async function sendEventToClient(userId) {
  const clients = sseClients.get(userId);

  if (clients) {
    const currentData = await TaskService.getTasksWithOptions({
      userId,
      includeCategories: "true",
    });

    clients.forEach((res, clientId) => {
      res.write(`event: data-update\ndata: ${JSON.stringify(currentData)}\n\n`);
    });
  } else {
    console.log("no client found");
  }
}

async function enableDBListener() {
  if (!listenerTaskChanges) {
    try {
      listenerTaskChanges = new pg.Client({
        host: "localhost",
        port: 5432,
        database: "eisenhower_test",
      });

      await listenerTaskChanges.connect();
      await listenerTaskChanges.query("LISTEN data_change");

      listenerTaskChanges.on("notification", (msg) => {
        const userId = msg.payload;
        sendEventToClient(userId);
      });
    } catch (err) {
      console.error("LISTEN client connection error:", err.stack);
    }
  }
}

function disableDBListener() {
  if (listenerTaskChanges) {
    // console.log("disabling listener");
    listenerTaskChanges.end();
    listenerTaskChanges = null;
  }
}

export { addSSEClient, removeSSEClient };
