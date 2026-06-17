import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: text("profile_id").unique().notNull(),
  handle: text("handle").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const hackThySackGames = pgTable(
  "hack_thy_sack_games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .references(() => players.id)
      .notNull(),
    score: integer("score").notNull(),
    durationMs: integer("duration_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("hack_thy_sack_games_score_idx").on(t.score.desc()),
    index("hack_thy_sack_games_created_at_idx").on(t.createdAt),
  ]
);
