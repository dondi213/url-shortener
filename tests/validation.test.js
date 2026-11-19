const { validateCreateLink } = require('../src/validation');
const { generateCode } = require('../src/utils/code');

describe('validateCreateLink', () => {
  test('returns expiresAt in the future when expiresInDays is set', () => {
    const { expiresAt } = validateCreateLink({ url: 'https://example.com', expiresInDays: 1 });
    const diffHours = (expiresAt.getTime() - Date.now()) / 36e5;
    expect(diffHours).toBeGreaterThan(23.9);
    expect(diffHours).toBeLessThanOrEqual(24);
  });

  test('collects every error at once', () => {
    try {
      validateCreateLink({ url: 'bad', alias: '!', expiresInDays: 999 });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.details).toHaveLength(3);
    }
  });
});

describe('generateCode', () => {
  test('generates base62 codes of the requested length', () => {
    expect(generateCode()).toMatch(/^[0-9a-zA-Z]{7}$/);
    expect(generateCode(10)).toHaveLength(10);
  });

  test('codes are random', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateCode()));
    expect(codes.size).toBe(1000);
  });
});
