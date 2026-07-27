function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }

  return value;
}

export const env = {
  AUTH_SECRET: requireEnv("AUTH_SECRET"),
  GOOGLE_CLIENT_ID: requireEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: requireEnv("GOOGLE_CLIENT_SECRET"),
  MONGODB_URI: requireEnv("MONGODB_URI"),
  MONGODB_DB_NAME: requireEnv("MONGODB_DB_NAME"),
  GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),
  MONDAY_API_TOKEN: requireEnv("MONDAY_API_TOKEN"),
  DEALS_BOARD_ID: requireEnv("MONDAY_DEALS_BOARD_ID"),
  WORK_ORDERS_BOARD_ID: requireEnv("MONDAY_WORK_ORDERS_BOARD_ID"),
};
