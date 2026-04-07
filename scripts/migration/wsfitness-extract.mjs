#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";

const SSH_TARGET = process.env.WSFITNESS_SSH_TARGET ?? "user@100.85.207.121";
const FACE_ENDPOINT = process.env.WSFITNESS_FACE_ENDPOINT ?? "http://192.168.1.201";
const OUTPUT_FILE =
  process.env.WSFITNESS_OUTPUT_FILE ?? "/tmp/wsfitness-migration.json";

const BANNER_NOISE_REGEX = /warning|post-quantum|vulnerable|upgraded/i;

const ACTIVE_MEMBER_SQL = `
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
`;

const LEGACY_SCHEMA_SQL = `
SET NOCOUNT ON;
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('Ticket_Card', 'Ticket_CardAccess', 'Ticket_Info')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
`;

function encodePowerShell(script) {
  return Buffer.from(script, "utf16le").toString("base64");
}

function filterNoise(rawText) {
  return rawText
    .split(/\r?\n/)
    .filter((line) => line.trim() && !BANNER_NOISE_REGEX.test(line))
    .join("\n")
    .trim();
}

function runSshCommand(command) {
  const result = spawnSync("ssh", [SSH_TARGET, command], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  const stdout = filterNoise(result.stdout ?? "");
  const stderr = filterNoise(result.stderr ?? "");

  if (result.status !== 0) {
    throw new Error(
      [
        `SSH command failed (${result.status ?? "unknown"})`,
        stderr ? `stderr: ${stderr}` : "",
        stdout ? `stdout: ${stdout}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return stdout;
}

function runPowerShell(script) {
  const encoded = encodePowerShell(script);
  return runSshCommand(`powershell -NoProfile -EncodedCommand ${encoded}`);
}

function parseSqlRows(output, expectedColumns) {
  const rows = [];

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("(")) continue;

    const parts = trimmed.split("|").map((part) => part.trim());
    if (parts.length < expectedColumns.length) continue;

    const row = {};
    expectedColumns.forEach((column, index) => {
      row[column] = parts[index] === "" ? null : parts[index];
    });
    rows.push(row);
  }

  return rows;
}

function extractJsonPayload(rawText) {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error("FaceDemo response was empty");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstObject = trimmed.search(/[\[{]/);
    if (firstObject < 0) {
      throw new Error(`FaceDemo response is not JSON: ${trimmed.slice(0, 180)}`);
    }
    return JSON.parse(trimmed.slice(firstObject));
  }
}

function requestFaceDemo(payload) {
  const body = JSON.stringify(payload);
  const ps = `
$body = @'
${body}
'@;
(Invoke-WebRequest -Uri '${FACE_ENDPOINT}' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing).Content
`;

  const raw = runPowerShell(ps);
  return extractJsonPayload(raw);
}

function requestFacePersonsPage(pageNo, pageSize, personId = null, imageFlag = 0) {
  const payload = {
    version: "0.2",
    cmd: "request persons",
    role: -1,
    page_no: pageNo,
    page_size: pageSize,
    feature_flag: 0,
    image_flag: imageFlag,
    query_mode: 0,
  };

  if (personId) {
    payload.condition = { person_id: personId };
  }

  return requestFaceDemo(payload);
}

function extractRegImageBase64(personRecord) {
  const regImages = Array.isArray(personRecord?.reg_images)
    ? personRecord.reg_images
    : [];
  const firstImage = regImages[0];
  if (!firstImage || typeof firstImage.image_data !== "string") {
    return null;
  }
  return firstImage.image_data;
}

function normalizeIso(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

function derivePersonId(cardId, knownPersonIds) {
  const card = String(cardId);
  const direct = card;
  const suffixed = `${card}_0`;

  if (knownPersonIds.has(suffixed)) return suffixed;
  if (knownPersonIds.has(direct)) return direct;
  return null;
}

function getLegacyMembersFromSql() {
  const sqlScript = `
$sql = @'
${ACTIVE_MEMBER_SQL.trim()}
'@;
sqlcmd -S . -d OnePros -E -W -h -1 -s "|" -Q $sql
`;

  const output = runPowerShell(sqlScript);
  return parseSqlRows(output, [
    "CardID",
    "CardNo",
    "UserName",
    "UserID",
    "TicketID",
    "TicketName",
    "TicketType",
    "Price",
    "AreaID",
    "StartDate",
    "EndDate",
    "TimesLimit",
    "RemainTimes",
  ]);
}

function getLegacySchemaColumns() {
  const sqlScript = `
$sql = @'
${LEGACY_SCHEMA_SQL.trim()}
'@;
sqlcmd -S . -d OnePros -E -W -h -1 -s "|" -Q $sql
`;

  const output = runPowerShell(sqlScript);
  return parseSqlRows(output, [
    "TABLE_NAME",
    "COLUMN_NAME",
    "DATA_TYPE",
    "IS_NULLABLE",
  ]);
}

function getAllFacePersonIds() {
  const pageSize = 50;
  let pageNo = 1;
  const knownPersonIds = new Set();

  while (true) {
    const response = requestFacePersonsPage(pageNo, pageSize, null, 0);
    const persons = Array.isArray(response?.persons) ? response.persons : [];

    for (const person of persons) {
      const personId = person?.id;
      if (typeof personId === "string" && personId.trim()) {
        knownPersonIds.add(personId.trim());
      }
    }

    if (!persons.length) break;

    const total = Number(response?.total ?? 0);
    if (total > 0 && knownPersonIds.size >= total) break;
    if (persons.length < pageSize) break;
    pageNo++;
  }

  return knownPersonIds;
}

function fetchFaceImageByPersonId(personId) {
  const response = requestFacePersonsPage(1, 1, personId, 1);
  const persons = Array.isArray(response?.persons) ? response.persons : [];
  if (!persons.length) return null;
  return extractRegImageBase64(persons[0]);
}

async function main() {
  console.log(`[wsfitness-extract] SSH target: ${SSH_TARGET}`);
  console.log(`[wsfitness-extract] Face endpoint: ${FACE_ENDPOINT}`);

  const schemaColumns = getLegacySchemaColumns();
  console.log(
    `[wsfitness-extract] Loaded schema metadata rows: ${schemaColumns.length}`,
  );

  const legacyMembers = getLegacyMembersFromSql();
  console.log(`[wsfitness-extract] Active SQL members: ${legacyMembers.length}`);

  const knownFacePersonIds = getAllFacePersonIds();
  console.log(
    `[wsfitness-extract] Faces found via FaceDemo list: ${knownFacePersonIds.size}`,
  );

  const personImageCache = new Map();

  const members = legacyMembers.map((legacyRow) => {
    const externalId = String(legacyRow.CardID);
    const personId = derivePersonId(externalId, knownFacePersonIds);

    let faceImageBase64 = null;
    if (personId) {
      if (!personImageCache.has(personId)) {
        personImageCache.set(personId, fetchFaceImageByPersonId(personId));
      }
      faceImageBase64 = personImageCache.get(personId);
    }

    return {
      externalId,
      cardNo: legacyRow.CardNo,
      legacyUserId: legacyRow.UserID,
      name: legacyRow.UserName,
      email: null,
      planName:
        legacyRow.TicketName ??
        (legacyRow.TicketID ? `Ticket ${legacyRow.TicketID}` : "Legacy Membership"),
      price: legacyRow.Price === null ? 0 : Number(legacyRow.Price),
      expiryDate: normalizeIso(legacyRow.EndDate),
      startDate: normalizeIso(legacyRow.StartDate),
      ticketType: legacyRow.TicketType,
      personId,
      faceImageBase64,
      source: {
        ticketId: legacyRow.TicketID,
        timesLimit:
          legacyRow.TimesLimit === null ? null : Number(legacyRow.TimesLimit),
        remainTimes:
          legacyRow.RemainTimes === null ? null : Number(legacyRow.RemainTimes),
      },
    };
  });

  const withFaces = members.filter((member) => !!member.faceImageBase64).length;

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      sshTarget: SSH_TARGET,
      sqlDatabase: "OnePros",
      faceEndpoint: FACE_ENDPOINT,
    },
    sql: {
      activeMembersQuery: ACTIVE_MEMBER_SQL.trim(),
      schemaQuery: LEGACY_SCHEMA_SQL.trim(),
      schemaColumns,
    },
    faceDemo: {
      listCommand: {
        method: "POST",
        url: FACE_ENDPOINT,
        payload: {
          version: "0.2",
          cmd: "request persons",
          role: -1,
          page_no: 1,
          page_size: 50,
          feature_flag: 0,
          image_flag: 0,
        },
      },
      fetchByPersonIdCommand: {
        method: "POST",
        url: FACE_ENDPOINT,
        payload: {
          version: "0.2",
          cmd: "request persons",
          role: -1,
          page_no: 1,
          page_size: 1,
          feature_flag: 0,
          image_flag: 1,
          condition: { person_id: "<person_id>" },
        },
      },
      discoveredPersonIds: knownFacePersonIds.size,
    },
    summary: {
      members: members.length,
      membersWithFaces: withFaces,
      membersWithoutFaces: members.length - withFaces,
    },
    members,
  };

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`[wsfitness-extract] Wrote ${OUTPUT_FILE}`);
  console.log(
    `[wsfitness-extract] Completed: ${members.length} members, ${withFaces} with face image`,
  );
}

main().catch((error) => {
  console.error("[wsfitness-extract] Failed:", error.message);
  process.exit(1);
});
