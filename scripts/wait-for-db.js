#!/usr/bin/env node
const net = require('net');
const { URL } = require('url');

const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/openhostmc?schema=public';

function parseHostAndPort(urlStr) {
  try {
    const cleaned = urlStr.replace(/^postgresql:\/\//i, 'http://');
    const parsed = new URL(cleaned);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port, 10) || 5432,
    };
  } catch {
    return { host: 'localhost', port: 5432 };
  }
}

const { host, port } = parseHostAndPort(dbUrl);

function checkConnection(targetHost, targetPort, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.on('timeout', () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on('error', () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.connect(targetPort, targetHost);
  });
}

async function main() {
  const maxRetries = 15;
  const delayMs = 2000;

  console.log(`[wait-for-db] Checking database connectivity at ${host}:${port}...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isReady = await checkConnection(host, port);
    if (isReady) {
      console.log(`[wait-for-db] Database at ${host}:${port} is reachable.`);
      process.exit(0);
    }

    console.log(
      `[wait-for-db] Database not reachable yet (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs / 1000}s...`,
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.warn(
    `[wait-for-db] Warning: Database at ${host}:${port} did not respond within timeout. Proceeding anyway...`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.warn(`[wait-for-db] Non-fatal check error:`, err);
  process.exit(0);
});
