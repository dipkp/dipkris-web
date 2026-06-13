import "dotenv/config";

export const env = {
  appSecret: process.env.APP_SECRET || "default-secret-key-for-guest-sessions",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL || "data.db",
};
