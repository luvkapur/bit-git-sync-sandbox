import express from 'express';
import { CrmService } from "./crm-service.js";

export function run() {
  const app = express();
  const crmService = CrmService.from();
  const port = process.env.PORT || 3000;

  /**
   * learn more on the express docs:
   * https://expressjs.com/en/starter/hello-world.html
   */
  app.get('/', async (req, res) => {
    const greeting = await crmService.getHello();
    res.send(greeting);
  });
  


  /**
   * TEMPORARY probe: does a hosting variable override the injected MONGO_URL?
   * Redacted by design — reports host/shape only, never credentials.
   */
  app.get('/__env', async (_req, res) => {
    const raw = process.env.MONGO_URL;
    let shape: Record<string, unknown> = { set: false };
    if (raw) {
      try {
        const u = new URL(raw);
        shape = {
          set: true,
          protocol: u.protocol,
          hostname: u.hostname,
          database: u.pathname.replace(/^\//, '') || '(none)',
          hasUsername: Boolean(u.username),
          hasPassword: Boolean(u.password),
        };
      } catch { shape = { set: true, parseable: false }; }
    }
    res.json({ MONGO_URL: shape, totalEnvVarCount: Object.keys(process.env).length });
  });

  const server = app.listen(port, () => {
    console.log(`🚀  Server ready at: http://localhost:${port}`);
  });

  return {
    port,
    // implement stop to support HMR.
    stop: async () => {
      server.closeAllConnections();
      server.close();
    }
  };
}
