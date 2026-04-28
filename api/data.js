const { neon } = require('@neondatabase/serverless');

let tableReady = false;

async function ensureTable(sql) {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS hex_pm_store (
      key        TEXT PRIMARY KEY,
      value      JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`
    INSERT INTO hex_pm_store (key, value)
    VALUES ('projects', '[]'), ('team', '[]')
    ON CONFLICT (key) DO NOTHING
  `;
  tableReady = true;
}

module.exports = async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  try {
    await ensureTable(sql);

    if (req.method === 'GET') {
      const rows = await sql`SELECT key, value FROM hex_pm_store`;
      const out = {};
      rows.forEach(r => { out[r.key] = r.value; });
      res.status(200).json({ projects: out.projects || [], team: out.team || [] });

    } else if (req.method === 'POST') {
      const { projects, team } = req.body;
      await sql`
        INSERT INTO hex_pm_store (key, value, updated_at)
        VALUES
          ('projects', ${JSON.stringify(projects ?? [])}::jsonb, now()),
          ('team',     ${JSON.stringify(team     ?? [])}::jsonb, now())
        ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
      `;
      res.status(200).json({ ok: true });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    console.error('[hex-pm/api/data]', e.message);
    res.status(500).json({ error: e.message });
  }
};
