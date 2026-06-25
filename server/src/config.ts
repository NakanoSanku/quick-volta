export interface ServerConfig {
  databaseUrl: string;
  appBaseUrl: string;
  apiBaseUrl: string;
  sessionSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  lineChannelSecret: string;
  lineChannelAccessToken: string;
  lineBotAddFriendUrl: string;
  reminderCronEnabled: boolean;
  reminderCheckIntervalMinutes: number;
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
}

function required(env: NodeJS.ProcessEnv | Record<string, string | undefined>, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function optionalBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function optionalInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): ServerConfig {
  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    appBaseUrl: required(env, 'APP_BASE_URL').replace(/\/+$/, ''),
    apiBaseUrl: required(env, 'API_BASE_URL').replace(/\/+$/, ''),
    sessionSecret: required(env, 'SESSION_SECRET'),
    googleClientId: required(env, 'GOOGLE_CLIENT_ID'),
    googleClientSecret: required(env, 'GOOGLE_CLIENT_SECRET'),
    googleCallbackUrl: required(env, 'GOOGLE_CALLBACK_URL'),
    lineChannelSecret: required(env, 'LINE_CHANNEL_SECRET'),
    lineChannelAccessToken: required(env, 'LINE_CHANNEL_ACCESS_TOKEN'),
    lineBotAddFriendUrl: required(env, 'LINE_BOT_ADD_FRIEND_URL'),
    reminderCronEnabled: optionalBoolean(env.REMINDER_CRON_ENABLED, false),
    reminderCheckIntervalMinutes: optionalInteger(env.REMINDER_CHECK_INTERVAL_MINUTES, 30),
    nodeEnv: (env.NODE_ENV as ServerConfig['nodeEnv']) || 'development',
    port: optionalInteger(env.PORT, 3000),
  };
}
