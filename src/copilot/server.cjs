const http = require("http");
const fs = require("fs");
const path = require("path");
const { handleRequest, loadConfig } = require("./service.cjs");

const publicDir = path.join(__dirname, "web");

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function sendFile(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch (error) {
    sendJson(res, 404, { error: "Not found" });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString("utf8");
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function buildCompactText(response) {
  if (response.executionResult && response.executionResult.ok && response.executionResult.stdout) {
    return response.executionResult.stdout;
  }

  if (response.executionPlan.prompt) {
    return response.executionPlan.prompt;
  }

  if (response.executionResult && !response.executionResult.ok) {
    return response.executionResult.stdout || response.executionResult.stderr || response.executionResult.error || "Claude could not complete the request.";
  }

  return response.result.summary || `Routed to ${response.result.label}.`;
}

function createServer(config = loadConfig()) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/") {
      sendFile(res, path.join(publicDir, "index.html"), "text/html; charset=utf-8");
      return;
    }

    if (req.method === "GET" && url.pathname === "/app.js") {
      sendFile(res, path.join(publicDir, "app.js"), "application/javascript; charset=utf-8");
      return;
    }

    if (req.method === "GET" && url.pathname === "/voice-listener.js") {
      sendFile(res, path.join(publicDir, "voice-listener.js"), "application/javascript; charset=utf-8");
      return;
    }

    if (req.method === "GET" && url.pathname === "/styles.css") {
      sendFile(res, path.join(publicDir, "styles.css"), "text/css; charset=utf-8");
      return;
    }

    if (req.method === "GET" && url.pathname === "/voice") {
      sendFile(res, path.join(publicDir, "voice.html"), "text/html; charset=utf-8");
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        config,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/copilot") {
      try {
        const raw = await readBody(req);
        const payload = raw ? JSON.parse(raw) : {};
        const input = String(payload.input || "").trim();

        if (!input) {
          sendJson(res, 400, { error: "Input is required." });
          return;
        }

        const response = handleRequest(input, {
          previewOnly: Boolean(payload.previewOnly),
        });

        sendJson(res, 200, {
          ok: true,
          compactText: buildCompactText(response),
          ...response,
        });
        return;
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          error: error.message,
        });
        return;
      }
    }

    sendJson(res, 404, { error: "Not found" });
  });
}

function startServer(options = {}) {
  const config = options.config || loadConfig();
  const host = options.host || process.env.COPILOT_HOST || config.webHost || "127.0.0.1";
  const port = Number(options.port || process.env.COPILOT_PORT || config.webPort || 3210);
  const server = createServer(config);

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve({
        server,
        host,
        port,
        url: `http://${host}:${port}`,
        config,
      });
    });
  });
}

async function main() {
  const instance = await startServer();
  console.log(`Smart Testing Copilot web app running on ${instance.url}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildCompactText,
  createServer,
  startServer,
};
