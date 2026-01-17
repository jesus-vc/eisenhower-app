import express from "express";
import { addSSEClient, removeSSEClient } from "../utils/sseManager.js";
import { schemaGetTask } from "../schemas/taskSchemas.js";
import { validateSchemas } from "../middleware/validationMiddleware.js";
import { ensureLoggedIn, validateUser } from "../middleware/authMiddleware.js";

const router = new express.Router();

/** GET /:userId/ => {tasks: [Task], categories: [Category]}
 *
 * Establish a server-sent event connection with clients
 *
 * Returns: an object containing up-to-date task and category data.
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no userID found.
 *
 * Authorization required: logged in as the correct user or admin. */

router.get(
  "/:userId",
  ensureLoggedIn,
  validateSchemas([{ schema: schemaGetTask, userIdParam: true }]),
  validateUser,
  async function (req, res, next) {
    try {
      const userId = req.params.userId;
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      /** Flushing headers forces the headers to be sent to the client immediately.
       * Otherwise a response might not be sent until there's an actual event to send to the client.
       *
       * Note: I also tested the alternative and common approach of using res.writeHead(200, headers),
       * but I noticed that this .writeHead method wasn't sending immediate headers to clients in my eventsRoutes.test.js.
       * So I'm keeping  my use of .setHeader and .flushHeaders() for now given there is no obvious need to switch to .writeHead approach*/

      const clientId = addSSEClient(userId, res);

      req.on("close", () => {
        // console.log("closing connection");
        removeSSEClient(userId, clientId);
        res.end();
      });
    } catch (err) {
      // console.log("error from eventsRoutes.js");
      // console.log(err);
      return next(err);
    }
  }
);

export default router;
