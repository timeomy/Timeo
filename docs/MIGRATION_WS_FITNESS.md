# WS Fitness → Timeo Migration (Tenant `7Kw87VeAnXg4qDXi6UTbu`)

## Scope
- Source members: legacy SQL Server POS (`OnePros`) on `WSFITNESS-PC`.
- Source face photos: Face terminal at `http://192.168.1.201` (reachable from gym PC LAN).
- Target: Timeo users + tenant memberships + subscriptions + avatars.
- Import endpoint: `POST /api/admin/migration/wsfitness/members`.

## Access Notes
- Gym host access is expected through Tailscale SSH (`user@100.85.207.121`).
- In this coding environment, outbound SSH was blocked (`Operation not permitted`), so live probing could not run here.
- The extraction/import scripts are implemented to run in a networked environment with the same commands below.

## SQL Queries Used

### 1) Active members for migration
```sql
SET NOCOUNT ON;
SELECT
  c.CardID,
  c.CardNo,
  c.UserName,
  c.UserID,
  c.TicketID,
  i.TicketName,
  i.TicketType,
  i.Price,
  a.AreaID,
  CONVERT(varchar(33), a.StartDate, 126) AS StartDate,
  CONVERT(varchar(33), a.EndDate, 126) AS EndDate,
  a.TimesLimit,
  a.RemainTimes
FROM Ticket_Card AS c
INNER JOIN Ticket_CardAccess AS a ON a.CardID = c.CardID
LEFT JOIN Ticket_Info AS i ON i.TicketID = c.TicketID
WHERE a.AreaID = 1
  AND a.EndDate > GETDATE()
ORDER BY a.EndDate DESC;
```

### 2) Legacy schema inspection (tables used)
```sql
SET NOCOUNT ON;
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('Ticket_Card', 'Ticket_CardAccess', 'Ticket_Info')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

## FaceDemo API Findings

Based on local protocol docs (`tunstile timeo/HTTP_En 2.pdf`) and prior WS integration code (`wsfitness/wsfitness-main/src/hooks/useTurnstileLanSync.ts`), the face terminal accepts JSON commands via HTTP POST to the device base URL.

### Endpoint: list enrolled people
- Method: `POST`
- URL: `http://192.168.1.201`
- Payload:
```json
{
  "version": "0.2",
  "cmd": "request persons",
  "role": -1,
  "page_no": 1,
  "page_size": 50,
  "feature_flag": 0,
  "image_flag": 0
}
```
- Response fields used: `total`, `count`, `persons[].id`, `persons[].name`.

### Endpoint: fetch face image by `person_id`
- Method: `POST`
- URL: `http://192.168.1.201`
- Payload:
```json
{
  "version": "0.2",
  "cmd": "request persons",
  "role": -1,
  "page_no": 1,
  "page_size": 1,
  "feature_flag": 0,
  "image_flag": 1,
  "query_mode": 0,
  "condition": {
    "person_id": "585_0"
  }
}
```
- Response fields used: `persons[0].reg_images[0].image_data` (base64 face image).

### SSH probe pattern (gym PC LAN hop)
```bash
ssh user@100.85.207.121 'powershell -Command "(Invoke-WebRequest -Uri http://192.168.1.201 -UseBasicParsing).Content"' \
  | grep -v "warning\|post-quantum\|vulnerable\|upgraded"
```

## Mapping Strategy

### Identity chain
- Legacy member primary key: `Ticket_Card.CardID`.
- Face terminal identity: `person_id` (typically `${CardID}_0`, fallback `${CardID}`).
- Timeo tenant identity: `tenant_memberships.member_id` (stores legacy `CardID` as external ID).

### Final relationship
- `CardID` ↔ `tenant_memberships.member_id` (idempotency key).
- `CardID` ↔ `person_id` (face lookup key).
- `tenant_memberships.user_id` ↔ `users.id` (Timeo member user).
- Endpoint stores mapping note in `tenant_memberships.notes` as `wsfitness_card=<CardID>;person_id=<person_id>` when available.

## Implemented Migration Flow

1. `scripts/migration/wsfitness-extract.mjs`
   - SSH to gym PC.
   - Runs SQL active-member query + schema query.
   - Calls FaceDemo `request persons` for list and per-`person_id` image retrieval.
   - Writes `/tmp/wsfitness-migration.json`.

2. `POST /api/admin/migration/wsfitness/members`
   - Platform-admin protected (`authMiddleware` + `requirePlatformAdmin`).
   - Accepts array of members with `faceImageBase64`.
   - Idempotent on `externalId` (`CardID`) via `tenant_memberships.member_id`.
   - Creates/matches membership plans by `planName + price`.
   - Creates/updates users, tenant memberships, and subscriptions (`current_period_end` from legacy `EndDate`).
   - Stores avatar to the same avatar storage path used by member avatars.

3. `scripts/migration/wsfitness-import.mjs`
   - Reads migration JSON.
   - Sends batches to the new endpoint.
   - Logs results to `/tmp/wsfitness-migration.log`.

## Runbook

### Extract
```bash
node scripts/migration/wsfitness-extract.mjs
```

Optional env overrides:
- `WSFITNESS_SSH_TARGET`
- `WSFITNESS_FACE_ENDPOINT`
- `WSFITNESS_OUTPUT_FILE`

### Import
```bash
TIMEO_SESSION_COOKIE='better-auth.session=...' \
node scripts/migration/wsfitness-import.mjs
```

Optional env overrides:
- `TIMEO_API_BASE_URL` (default `http://localhost:3001`)
- `WSFITNESS_IMPORT_URL`
- `WSFITNESS_BATCH_SIZE`
- `WSFITNESS_INPUT_FILE`
- `WSFITNESS_LOG_FILE`

