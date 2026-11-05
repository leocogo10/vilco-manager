import { neon } from "@neondatabase/serverless";

let client;

export function usesNeonBackend() {
  return process.env.VILCO_STORAGE_PROVIDER === "neon";
}

export function getDatabase() {
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) throw new Error("VILCO Neon database is not configured.");
  if (!client) client = neon(connectionString);
  return client;
}
