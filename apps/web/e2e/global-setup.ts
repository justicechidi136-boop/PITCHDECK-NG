export default async function globalSetup() {
  process.env.DATABASE_URL ??=
    process.env.DATABASE_URL ??
    "postgresql://pitchdeck:pitchdeck_dev@localhost:15432/pitchdeck?schema=public";
}
