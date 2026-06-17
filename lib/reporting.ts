import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type ScoreScope = "all-time" | "day";

export type ScoreRow = {
  rank: number;
  handle: string;
  score: number;
  durationMs: number;
  playedAt: string;
};

export type DayWindow = {
  date: string;
  tz: string;
  startsAt: Date;
  endsAt: Date;
};

export function parseLimit(value: string | null, fallback = 10, max = 100) {
  if (value == null || value === "") return fallback;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > max) return null;
  return limit;
}

export function parseDayWindow(
  date: string | null,
  tz: string | null
): DayWindow | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const timeZone = tz || "UTC";
  if (!isValidTimeZone(timeZone)) return null;

  const [year, month, day] = date.split("-").map(Number);
  if (!isValidDateParts(year, month, day)) return null;

  const startsAt = zonedDateTimeToUtc(year, month, day, 0, 0, 0, timeZone);
  const endsAt = zonedDateTimeToUtc(year, month, day + 1, 0, 0, 0, timeZone);

  return { date, tz: timeZone, startsAt, endsAt };
}

export async function getTopScores(options: {
  limit: number;
  window?: DayWindow;
}) {
  const where = options.window
    ? and(
        gte(schema.hackThySackGames.createdAt, options.window.startsAt),
        lt(schema.hackThySackGames.createdAt, options.window.endsAt)
      )
    : undefined;

  const rows = await db()
    .select({
      handle: schema.players.handle,
      score: schema.hackThySackGames.score,
      durationMs: schema.hackThySackGames.durationMs,
      playedAt: schema.hackThySackGames.createdAt,
    })
    .from(schema.hackThySackGames)
    .innerJoin(
      schema.players,
      eq(schema.hackThySackGames.playerId, schema.players.id)
    )
    .where(where)
    .orderBy(desc(schema.hackThySackGames.score), schema.hackThySackGames.createdAt)
    .limit(options.limit);

  return rows.map((row, index): ScoreRow => {
    const playedAt =
      row.playedAt instanceof Date
        ? row.playedAt.toISOString()
        : new Date(row.playedAt ?? 0).toISOString();

    return {
      rank: index + 1,
      handle: row.handle,
      score: row.score,
      durationMs: row.durationMs,
      playedAt,
    };
  });
}

export async function getDayStats(window: DayWindow, topLimit = 10) {
  const [stats] = await db()
    .select({
      gamesPlayed: sql<number>`count(${schema.hackThySackGames.id})`,
      uniquePlayers: sql<number>`count(distinct ${schema.hackThySackGames.playerId})`,
      highestScore: sql<number>`max(${schema.hackThySackGames.score})`,
      averageScore: sql<number>`avg(${schema.hackThySackGames.score})`,
    })
    .from(schema.hackThySackGames)
    .where(
      and(
        gte(schema.hackThySackGames.createdAt, window.startsAt),
        lt(schema.hackThySackGames.createdAt, window.endsAt)
      )
    );

  return {
    date: window.date,
    tz: window.tz,
    startsAt: window.startsAt.toISOString(),
    endsAt: window.endsAt.toISOString(),
    gamesPlayed: toNumber(stats?.gamesPlayed, 0),
    uniquePlayers: toNumber(stats?.uniquePlayers, 0),
    highestScore:
      stats?.highestScore == null ? null : toNumber(stats.highestScore, 0),
    averageScore:
      stats?.averageScore == null
        ? null
        : Math.round(toNumber(stats.averageScore, 0)),
    topScores: await getTopScores({ limit: topLimit, window }),
  };
}

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

function isValidDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getTimeZoneOffsetMs(timeZone, utcGuess);
  const utc = new Date(utcGuess.getTime() - offset);
  const adjustedOffset = getTimeZoneOffsetMs(timeZone, utc);

  if (adjustedOffset !== offset) {
    return new Date(utcGuess.getTime() - adjustedOffset);
  }

  return utc;
}

function getTimeZoneOffsetMs(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  return asUtc - date.getTime();
}

function toNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
