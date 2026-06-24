import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .startsWith("postgresql://", "DATABASE_URL must use PostgreSQL")
    .optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

export const serverEnvironment = serverEnvironmentSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
});

export const publicEnvironment = publicEnvironmentSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
