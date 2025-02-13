import http = require("http");

async function main() {
  http
    .createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Hello World\n");
    })
    .listen(8080, () => console.log("Listening on port 8080"));
  http
    .createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Hello World from port 8081\n");
    })
    .listen(8081, () => console.log("Listening on port 8081"));
}

main();
