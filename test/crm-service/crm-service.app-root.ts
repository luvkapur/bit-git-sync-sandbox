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
   * Diagnostic: reports which database-ish env vars the deployed runtime
   * supplies. Deliberately REDACTED — reports shape and host only, never
   * credentials, so the output is safe to read in a transcript or on camera.
   */
  app.get('/__env', async (_req, res) => {
    const interesting = Object.keys(process.env)
      .filter((k) => /MONGO|DATABASE|DB_|POSTGRES|REDIS|SECRET|BACKEND_URL|PLATFORM_SERVICE/i.test(k))
      .sort();

    const describe = (raw?: string) => {
      if (!raw) return { set: false };
      try {
        const u = new URL(raw);
        return {
          set: true,
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || '(default)',
          database: u.pathname.replace(/^\//, '') || '(none)',
          hasUsername: Boolean(u.username),
          hasPassword: Boolean(u.password),
        };
      } catch {
        return { set: true, parseable: false, length: raw.length };
      }
    };

    res.json({
      dbEnvVarNamesPresent: interesting,
      MONGO_URL: describe(process.env.MONGO_URL),
      totalEnvVarCount: Object.keys(process.env).length,
      nodeVersion: process.version,
    });
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
