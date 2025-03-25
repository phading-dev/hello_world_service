import express = require("express");
import http = require("http");
import promClient = require("prom-client");
import { getUser, insertUserStatement } from "./db/sql";
import { ENV_VARS } from "./env_vars";
import { Spanner } from "@google-cloud/spanner";

export let SPANNER_DATABASE = new Spanner({
  projectId: ENV_VARS.projectId,
})
  .instance(ENV_VARS.spannerInstanceId)
  .database(ENV_VARS.spannerDatabaseId);

async function main() {
  let app = express();
  app.get("/healthz", (req, res) => {
    res.end("OK");
  });
  app.get("/readiness", (req, res) => {
    res.end("OK");
  });
  app.get("/metricsz", async (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.end(await promClient.register.metrics());
  });
  app.get("/hw", (req, res) => {
    res.end("Hello World from path /hw\n");
  });
  app.get("/hw/new", async (req, res) => {
    await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
      await transaction.batchUpdate([
        insertUserStatement({
          userId: "user1",
          createdTimeMs: Date.now(),
        }),
      ]);
      await transaction.commit();
    });
    res.end("User created.\n");
  });
  app.get("/hw/get", async (req, res) => {
    let rows = await getUser(SPANNER_DATABASE, { userUserIdEq: "user1" });
    res.end(`User: ${JSON.stringify(rows)}\n`);
  });
  http
    .createServer(app)
    .listen(ENV_VARS.port, () =>
      console.log(`Listening on port ${ENV_VARS.port}`),
    );
}

main();
