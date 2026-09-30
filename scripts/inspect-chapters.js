const { createClient } = require('@libsql/client');

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  const r = await client.execute({
    sql: 'SELECT id, title, order_index, length(content) as len, substr(content, 1, 120) as preview FROM chapters WHERE book_id = ? ORDER BY order_index ASC',
    args: ['66babd76-9dd0-4563-9f0c-bf0dc4967f24']
  });

  for (const row of r.rows) {
    console.log(`${row.order_index}. [${row.title}] (len: ${row.len}) => ${row.preview}`);
  }
}

main().catch(console.error);
