import { getCorsOptions, getTrustedOrigins } from './cors.util';

describe('getCorsOptions', () => {
  it('should return localhost regex when no env provided', () => {
    const options = getCorsOptions();
    expect(options.origin).toBeInstanceOf(RegExp);
    expect((options.origin as RegExp).test('http://localhost:3000')).toBe(true);
    expect((options.origin as RegExp).test('https://example.com')).toBe(false);
  });

  it('should allow all origins when set to "true"', () => {
    expect(getCorsOptions('true').origin).toBe(true);
  });

  it('should disable CORS when set to "false"', () => {
    expect(getCorsOptions('false').origin).toBe(false);
  });

  it('should parse comma-separated origins', () => {
    const options = getCorsOptions('https://example.com,https://app.example.com');
    expect(options.origin).toEqual(['https://example.com', 'https://app.example.com']);
  });

  it('should handle wildcard patterns', () => {
    const options = getCorsOptions('http://localhost:*,https://*.example.com');
    expect(typeof options.origin).toBe('function');

    const callback = options.origin as (
      origin: string,
      cb: (err: Error | null, allow?: boolean) => void
    ) => void;

    callback('http://localhost:3000', (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
    });

    callback('https://app.example.com', (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
    });

    callback('https://evil.com', (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(false);
    });
  });

  it('should include default CORS settings', () => {
    const options = getCorsOptions();
    expect(options.credentials).toBe(true);
    expect(options.maxAge).toBe(600);
  });
});

describe('getTrustedOrigins', () => {
  it('should return localhost wildcards by default', () => {
    expect(getTrustedOrigins()).toEqual(['http://localhost:*', 'http://127.0.0.1:*']);
  });

  it('should handle special values', () => {
    expect(getTrustedOrigins('true')).toEqual(['*']);
    expect(getTrustedOrigins('false')).toEqual([]);
  });

  it('should parse origins and include localhost', () => {
    const origins = getTrustedOrigins('https://example.com,https://app.example.com');
    expect(origins).toEqual([
      'http://localhost:*',
      'http://127.0.0.1:*',
      'https://example.com',
      'https://app.example.com',
    ]);
  });
});
