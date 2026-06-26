import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { loadEnvFiles } from './envFiles.js';
import { startReminderScheduler } from './reminders/scheduler.js';

loadEnvFiles();
const config = loadConfig();
const app = buildApp({ config });

await app.listen({ port: config.port, host: '0.0.0.0' });
startReminderScheduler(config);
