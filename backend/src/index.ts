import { buildApp } from "./app.js";

const app = await buildApp();
const port = (process.env.PORT ? Number(process.env.PORT) : 8787);
try {
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`DIA backend listening on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
