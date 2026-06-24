import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export function getBadge(points: number): string {
  if (points >= 501) return "Vawulence Legend";
  if (points >= 201) return "Street Governor";
  if (points >= 76) return "Chief Instigator";
  if (points >= 21) return "Gist Monger";
  return "Lurker";
}

export async function awardPoints(userId: string, delta: number): Promise<void> {
  await db
    .update(usersTable)
    .set({ totalPoints: sql`${usersTable.totalPoints} + ${delta}` })
    .where(eq(usersTable.id, userId));
}
