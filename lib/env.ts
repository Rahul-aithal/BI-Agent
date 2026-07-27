function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }

  return value;
}

export const env = {
  GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),
  MONDAY_API_TOKEN: requireEnv("MONDAY_API_TOKEN"),
  DEALS_BOARD_ID: requireEnv("MONDAY_DEALS_BOARD_ID"),
  WORK_ORDERS_BOARD_ID: requireEnv("MONDAY_WORK_ORDERS_BOARD_ID"),
};
