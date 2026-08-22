import { createApp } from "./app";
import { env } from "./config/env";
import { startScheduledJobs } from "./jobs/scheduler";

const app = createApp();

app.listen(env.port, () => {
  console.log(`✅ Warehouse & Asset Management API running on port ${env.port} [${env.nodeEnv}]`);
  startScheduledJobs();
});
