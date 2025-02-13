import express = require("express");
import http = require("http");
import promClient = require("prom-client");

async function main() {
  let app = express();
  app.get("/healthz", (req, res) => {
    res.end("OK");
  });
  app.get("/metricsz", async (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.end(await promClient.register.metrics());
  });
  app.get("/hw", (req, res) => {
    res.send("Hello World from express\n");
  });
  http
    .createServer(app)
    .listen(8080, () => console.log("Listening on port 8080"));
  http
    .createServer(app)
    .listen(8081, () => console.log("Listening on port 8081"));
}

main();
