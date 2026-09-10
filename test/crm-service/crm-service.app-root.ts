import express from 'express';
import { MongoClient } from 'mongodb';
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


  /**
   * Diagnostic: can application code running inside the hosted runtime reach
   * the injected MongoDB and enumerate/export data? Reports structure and
   * counts only — no document contents, no credentials.
   */
  app.get('/__db', async (_req, res) => {
    const url = process.env.MONGO_URL;
    if (!url) { res.status(500).json({ error: 'MONGO_URL not set' }); return; }
    const client = new MongoClient(url, { serverSelectionTimeoutMS: 8000 });
    try {
      await client.connect();
      const db = client.db();
      const admin = await db.admin().serverStatus().catch(() => null);
      const cols = await db.listCollections().toArray();
      const counts: Record<string, number> = {};
      for (const c of cols) counts[c.name] = await db.collection(c.name).countDocuments();
      // prove we can WRITE too, then clean up
      await db.collection('__exit_test').insertOne({ at: new Date(), note: 'exit-test probe' });
      const wrote = await db.collection('__exit_test').countDocuments();
      await db.collection('__exit_test').drop().catch(() => {});
      res.json({
        connected: true,
        dbName: db.databaseName,
        mongoVersion: admin?.version ?? '(no admin access)',
        collections: cols.map((c) => c.name),
        documentCounts: counts,
        writeProbe: { inserted: true, countAfterInsert: wrote, cleanedUp: true },
      });
    } catch (e: any) {
      res.status(500).json({ connected: false, error: String(e?.message || e).slice(0, 300) });
    } finally {
      await client.close().catch(() => {});
    }
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
