# Hack Thy Sack Agent Access

This file documents the planned read-only reporting API for trusted agents.
The API lets an agent answer questions like:

- Who is in the current top ten?
- What were the highest Hack Thy Sack scores on a specific day?
- How many games were played on a specific day?

## Data Model

Hack Thy Sack should share the same `players` table used by Brood Tapper and store completed runs in its own table.

`players`

- `id`: internal UUID.
- `profile_id`: Raid Guild Portal profile id. Do not expose this through agent APIs.
- `handle`: display handle refreshed from the Portal launch token.
- `created_at`: first-seen timestamp.
- `last_seen_at`: latest launch timestamp.

`hack_thy_sack_games`

- `id`: internal UUID.
- `player_id`: links to `players.id`.
- `score`: final total score for the completed run.
- `duration_ms`: game duration in milliseconds.
- `created_at`: timestamp when the completed run was recorded.

Agent responses should expose player `handle`, total score, duration, and play timestamps.
They should not expose `profile_id`.

## Authentication

All agent routes live under `/api/agent/*`.

Send the shared key as a bearer token:

```bash
curl -H "Authorization: Bearer $HACK_THY_SACK_AGENT_API_TOKEN" \
  "https://hack-thy-sack.example.com/api/agent/scores?scope=all-time&limit=10"
```

Missing or invalid credentials should return:

```json
{ "error": "unauthorized" }
```

with HTTP status `401`.

## Endpoints

### Current Top Scores

```http
GET /api/agent/scores?scope=all-time&limit=10
```

Returns the highest completed Hack Thy Sack runs across all time.

Parameters:

- `scope`: must be `all-time`.
- `limit`: optional, defaults to `10`, maximum `100`.

Example response:

```json
{
  "scope": "all-time",
  "limit": 10,
  "scores": [
    {
      "rank": 1,
      "handle": "ranger",
      "score": 42000,
      "durationMs": 312000,
      "playedAt": "2026-06-17T18:42:00.000Z"
    }
  ]
}
```

### Highest Scores For A Day

```http
GET /api/agent/scores?scope=day&date=YYYY-MM-DD&tz=America/Denver&limit=10
```

Returns the highest completed runs recorded during a calendar day.

Parameters:

- `scope`: must be `day`.
- `date`: required calendar date in `YYYY-MM-DD` format.
- `tz`: optional IANA timezone. Defaults to `UTC`.
- `limit`: optional, defaults to `10`, maximum `100`.

The API interprets `date` in `tz`, converts that local day to UTC bounds, and
queries `hack_thy_sack_games.created_at` with an inclusive start and exclusive end.

### Games Played On A Day

```http
GET /api/agent/days?date=YYYY-MM-DD&tz=America/Denver
```

Returns summary stats for a calendar day.

Parameters:

- `date`: required calendar date in `YYYY-MM-DD` format.
- `tz`: optional IANA timezone. Defaults to `UTC`.

Example response:

```json
{
  "date": "2026-06-17",
  "tz": "America/Denver",
  "startsAt": "2026-06-17T06:00:00.000Z",
  "endsAt": "2026-06-18T06:00:00.000Z",
  "gamesPlayed": 37,
  "uniquePlayers": 14,
  "highestScore": 42000,
  "averageScore": 12540,
  "topScores": [
    {
      "rank": 1,
      "handle": "ranger",
      "score": 42000,
      "durationMs": 312000,
      "playedAt": "2026-06-17T18:42:00.000Z"
    }
  ]
}
```

## Reporting Guidance

- Treat `playedAt` as UTC unless a response includes local date metadata.
- Prefer `scope=day` for "today", "yesterday", or named-date score questions.
- Prefer `/api/agent/days` for participation questions like "how many games were played today?" or "how active was Friday?"
- If `tz` is not specified by the user, use the deployment's reporting timezone.
  For Raid Guild event reporting, `America/Denver` is a reasonable default.
- Never submit scores through the agent API. Score submission remains the authenticated player route: `POST /api/scores`.
- Never expose Portal profile ids or raw launch token claims.
