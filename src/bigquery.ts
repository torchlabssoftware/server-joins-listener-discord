import { BigQuery } from "@google-cloud/bigquery";

const bigquery = new BigQuery({
  projectId: process.env.BIGQUERY_PROJECT_ID,
  ...(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    ? { credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) }
    : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }),
});

const datasetId = process.env.BIGQUERY_DATASET_ID!;
const tableId = process.env.BIGQUERY_TABLE_ID!;

export interface MemberMetadata {
  username: string;
  display_name: string;
  discriminator: string;
  avatar_url: string | null;
  is_bot: boolean;
  account_created_at: string;
  joined_server_at: string;
  server_id: string;
  server_name: string;
  role_ids: string[];
}

export interface MemberJoinRow {
  discord_id: string;
  metadata: string; // JSON-serialised MemberMetadata
  updated_at: string;
}

export async function ensureTableExists(): Promise<void> {
  const dataset = bigquery.dataset(datasetId);
  const [datasetExists] = await dataset.exists();
  if (!datasetExists) {
    await bigquery.createDataset(datasetId, { location: "US" });
    console.log(`Dataset ${datasetId} created.`);
  }

  const table = dataset.table(tableId);
  const [tableExists] = await table.exists();
  if (!tableExists) {
    const schema = [
      { name: "discord_id", type: "STRING", mode: "REQUIRED" },
      { name: "metadata",   type: "JSON",   mode: "NULLABLE" },
      { name: "updated_at", type: "TIMESTAMP", mode: "REQUIRED" },
    ];
    await table.create({ schema });
    console.log(`Table ${tableId} created.`);
  }
}

export async function insertMemberJoin(row: MemberJoinRow): Promise<void> {
  const dataset = bigquery.dataset(datasetId);
  const table = dataset.table(tableId);
  await table.insert([row]);
  console.log(`Inserted row for discord_id ${row.discord_id}`);
}
