const fs = require('node:fs');
const path = require('node:path');
const pool = require('./db/pool');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = migrate;

// Allow running directly: `npm run migrate`
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Database schema is up to date');
      return pool.end();
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
