const { HttpError } = require('./utils/errors');

const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
const RESERVED = new Set(['api', 'health']);

/**
 * Validates the body of POST /api/links.
 * Returns clean values or throws a 400 HttpError listing every problem.
 */
function validateCreateLink(body = {}) {
  const errors = [];
  const { url, alias, expiresInDays } = body;

  if (typeof url !== 'string' || url.length > 2048 || !isHttpUrl(url)) {
    errors.push('url must be a valid http(s) URL (max 2048 chars)');
  }

  if (alias !== undefined && (typeof alias !== 'string' || !ALIAS_PATTERN.test(alias) || RESERVED.has(alias))) {
    errors.push('alias must be 3-32 chars: letters, numbers, "-" or "_" (and not a reserved word)');
  }

  if (expiresInDays !== undefined && !(Number.isInteger(expiresInDays) && expiresInDays >= 1 && expiresInDays <= 365)) {
    errors.push('expiresInDays must be an integer between 1 and 365');
  }

  if (errors.length > 0) {
    throw new HttpError(400, 'Validation failed', errors);
  }

  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;
  return { url, alias, expiresAt };
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = { validateCreateLink };
