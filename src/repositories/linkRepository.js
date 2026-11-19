/**
 * Data access for links and clicks (PostgreSQL).
 * The rest of the app only talks to this object, so tests can swap it for an in-memory fake.
 */
function createLinkRepository(pool) {
  return {
    /** Returns the new link, or null if the code is already taken. */
    async create({ code, url, expiresAt }) {
      const { rows } = await pool.query(
        `INSERT INTO links (code, url, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO NOTHING
         RETURNING id, code, url, created_at, expires_at`,
        [code, url, expiresAt],
      );
      return rows[0] ? toLink(rows[0]) : null;
    },

    async findByCode(code) {
      const { rows } = await pool.query(
        'SELECT id, code, url, created_at, expires_at FROM links WHERE code = $1',
        [code],
      );
      return rows[0] ? toLink(rows[0]) : null;
    },

    async recordClick(linkId, { referrer, userAgent }) {
      await pool.query(
        'INSERT INTO clicks (link_id, referrer, user_agent) VALUES ($1, $2, $3)',
        [linkId, referrer, userAgent],
      );
    },

    async getStats(linkId) {
      const totals = await pool.query(
        'SELECT COUNT(*)::int AS clicks, MAX(clicked_at) AS last_click_at FROM clicks WHERE link_id = $1',
        [linkId],
      );
      const byDay = await pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('day', clicked_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
         FROM clicks WHERE link_id = $1
         GROUP BY 1 ORDER BY 1`,
        [linkId],
      );
      return {
        clicks: totals.rows[0].clicks,
        lastClickAt: totals.rows[0].last_click_at,
        clicksByDay: byDay.rows,
      };
    },

    /** Returns true if a link was deleted. */
    async deleteByCode(code) {
      const { rowCount } = await pool.query('DELETE FROM links WHERE code = $1', [code]);
      return rowCount > 0;
    },
  };
}

function toLink(row) {
  return {
    id: row.id,
    code: row.code,
    url: row.url,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

module.exports = { createLinkRepository };
