/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

// Every Convex module, for convex-test to load on demand.
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");

export function setup() {
  return convexTest(schema, modules);
}

export type TestBackend = ReturnType<typeof setup>;

/** Insert a user and return a client authenticated as them. */
export async function signIn(t: TestBackend, name: string) {
  const userId: Id<"users"> = await t.run((ctx) =>
    ctx.db.insert("users", { name, email: `${name.toLowerCase()}@example.com` }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session-${name}` }) };
}

/** R2 keys queued for deletion via lib/cascade. Use with vi.useFakeTimers(). */
export async function scheduledDeletes(t: TestBackend): Promise<string[]> {
  const jobs = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  return jobs.flatMap((job) => (job.args[0] as { r2Keys: string[] }).r2Keys).sort();
}
