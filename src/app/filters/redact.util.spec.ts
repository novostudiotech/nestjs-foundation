import { createRedactor } from './redact.util';

describe('createRedactor', () => {
  const censor = '[REDACTED]';

  describe('basic functionality', () => {
    it('should redact top-level keys', () => {
      const redact = createRedactor({
        keys: ['password', 'token'],
        serialize: false,
      });

      const obj = {
        password: 'secret123',
        token: 'abc123',
        username: 'john',
      };

      const result = redact(obj);

      expect(result.password).toBe(censor);
      expect(result.token).toBe(censor);
      expect(result.username).toBe('john');
    });

    it('should redact keys at depth 1', () => {
      const redact = createRedactor({
        keys: ['password'],
        depth: 1,
        serialize: false,
      });

      const obj = {
        user: {
          password: 'secret123',
          email: 'test@example.com',
        },
      };

      const result = redact(obj);

      expect(result.user.password).toBe(censor);
      expect(result.user.email).toBe('test@example.com');
    });

    it('should redact keys at depth 2', () => {
      const redact = createRedactor({
        keys: ['password'],
        depth: 2,
        serialize: false,
      });

      const obj = {
        data: {
          user: {
            password: 'secret123',
            email: 'test@example.com',
          },
        },
      };

      const result = redact(obj);

      expect(result.data.user.password).toBe(censor);
      expect(result.data.user.email).toBe('test@example.com');
    });

    it('should redact keys at depth 3 (default)', () => {
      const redact = createRedactor({
        keys: ['password'],
        serialize: false,
      });

      const obj = {
        body: {
          data: {
            user: {
              password: 'secret123',
              email: 'test@example.com',
            },
          },
        },
      };

      const result = redact(obj);

      expect(result.body.data.user.password).toBe(censor);
      expect(result.body.data.user.email).toBe('test@example.com');
    });

    it('should not redact keys beyond specified depth', () => {
      const redact = createRedactor({
        keys: ['password'],
        depth: 1,
        serialize: false,
      });

      const obj = {
        level1: {
          level2: {
            password: 'should-not-be-redacted',
          },
        },
      };

      const result = redact(obj);

      // At depth 1, we can only redact *.password (one level deep)
      // level1.level2.password is 2 levels deep, so it won't be redacted
      expect(result.level1.level2.password).toBe('should-not-be-redacted');
    });
  });

  describe('multiple keys', () => {
    it('should redact multiple keys at various depths', () => {
      const redact = createRedactor({
        keys: ['password', 'token', 'secret'],
        depth: 2,
        serialize: false,
      });

      const obj = {
        password: 'top-level',
        user: {
          password: 'level-1',
          token: 'level-1-token',
        },
        data: {
          credentials: {
            password: 'level-2',
            secret: 'level-2-secret',
          },
        },
        public: 'visible',
      };

      const result = redact(obj);

      expect(result.password).toBe(censor);
      expect(result.user.password).toBe(censor);
      expect(result.user.token).toBe(censor);
      expect(result.data.credentials.password).toBe(censor);
      expect(result.data.credentials.secret).toBe(censor);
      expect(result.public).toBe('visible');
    });
  });

  describe('custom censor', () => {
    it('should use custom censor value', () => {
      const customCensor = '***';
      const redact = createRedactor({
        keys: ['password'],
        censor: customCensor,
        serialize: false,
      });

      const obj = { password: 'secret' };
      const result = redact(obj);

      expect(result.password).toBe(customCensor);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON when serialize is true', () => {
      const redact = createRedactor({
        keys: ['password'],
        serialize: true,
      });

      const obj = {
        password: 'secret',
        username: 'john',
      };

      const result = redact(obj);

      expect(typeof result).toBe('string');
      expect(result).toBe('{"password":"[REDACTED]","username":"john"}');
    });

    it('should not serialize when serialize is false', () => {
      const redact = createRedactor({
        keys: ['password'],
        serialize: false,
      });

      const obj = {
        password: 'secret',
        username: 'john',
      };

      const result = redact(obj);

      expect(typeof result).toBe('object');
      expect(result.password).toBe(censor);
      expect(result.username).toBe('john');
    });
  });

  describe('edge cases', () => {
    it('should handle objects with null values', () => {
      const redact = createRedactor({
        keys: ['password'],
        serialize: false,
      });

      const obj = {
        user: null,
      };

      const result = redact(obj);

      expect(result.user).toBeNull();
    });

    it('should handle objects with undefined values', () => {
      const redact = createRedactor({
        keys: ['password'],
        serialize: false,
      });

      const obj = {
        user: {
          password: undefined,
        },
      };

      const result = redact(obj);

      expect(result.user.password).toBe(censor);
    });

    it('should handle arrays', () => {
      const redact = createRedactor({
        keys: ['password'],
        serialize: false,
      });

      const obj = {
        users: [{ password: 'secret1' }, { password: 'secret2' }],
      };

      const result = redact(obj);

      // fast-redact with wildcards (*.password) successfully redacts keys in array elements
      expect(result.users[0].password).toBe(censor);
      expect(result.users[1].password).toBe(censor);
    });

    it('should handle missing keys gracefully', () => {
      const redact = createRedactor({
        keys: ['password'],
        serialize: false,
      });

      const obj = {
        username: 'john',
      };

      const result = redact(obj);

      expect(result.username).toBe('john');
    });
  });

  describe('plainKeys', () => {
    it('should redact plain keys without wildcard expansion', () => {
      const redact = createRedactor({
        keys: ['authorization'],
        plainKeys: ['["x-api-key"]', '["x-auth-token"]'],
        depth: 0,
        serialize: false,
      });

      const obj = {
        authorization: 'Bearer token123',
        'x-api-key': 'api-key-456',
        'x-auth-token': 'auth-token-789',
        'content-type': 'application/json',
      };

      const result = redact(obj);

      expect(result.authorization).toBe(censor);
      expect(result['x-api-key']).toBe(censor);
      expect(result['x-auth-token']).toBe(censor);
      expect(result['content-type']).toBe('application/json');
    });

    it('should work with both keys and plainKeys together', () => {
      const redact = createRedactor({
        keys: ['password'],
        plainKeys: ['["special-key"]'],
        depth: 1,
        serialize: false,
      });

      const obj = {
        password: 'top-level',
        'special-key': 'special-value',
        user: {
          password: 'nested',
          'special-key': 'should-not-be-redacted',
        },
      };

      const result = redact(obj);

      expect(result.password).toBe(censor);
      expect(result['special-key']).toBe(censor);
      expect(result.user.password).toBe(censor);
      // plainKeys don't get wildcard expansion
      expect(result.user['special-key']).toBe('should-not-be-redacted');
    });
  });

  describe('validation', () => {
    it('should throw error when keys array is empty', () => {
      expect(() => {
        createRedactor({ keys: [] });
      }).toThrow('redact.util - keys array must not be empty');
    });

    it('should throw error when depth is negative', () => {
      expect(() => {
        createRedactor({ keys: ['password'], depth: -1 });
      }).toThrow('redact.util - depth must be a non-negative number');
    });

    it('should allow depth of 0', () => {
      const redact = createRedactor({
        keys: ['password'],
        depth: 0,
        serialize: false,
      });

      const obj = {
        password: 'secret',
        user: {
          password: 'nested',
        },
      };

      const result = redact(obj);

      expect(result.password).toBe(censor);
      expect(result.user.password).toBe('nested'); // Not redacted at depth > 0
    });
  });

  describe('real-world scenarios', () => {
    it('should redact sensitive fields in API request body', () => {
      const redact = createRedactor({
        keys: ['password', 'token', 'secret', 'apiKey', 'api_key', 'creditCard', 'credit_card'],
        depth: 3,
        serialize: false,
      });

      const requestBody = {
        user: {
          email: 'test@example.com',
          password: 'secret123',
          profile: {
            name: 'John Doe',
            payment: {
              creditCard: '4111-1111-1111-1111',
              credit_card: '4111-1111-1111-1111',
            },
          },
        },
        auth: {
          token: 'bearer-token-123',
          apiKey: 'api-key-456',
          api_key: 'api-key-789',
        },
        config: {
          secret: 'app-secret',
        },
      };

      const result = redact(requestBody);

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password).toBe(censor);
      expect(result.user.profile.name).toBe('John Doe');
      expect(result.user.profile.payment.creditCard).toBe(censor);
      expect(result.user.profile.payment.credit_card).toBe(censor);
      expect(result.auth.token).toBe(censor);
      expect(result.auth.apiKey).toBe(censor);
      expect(result.auth.api_key).toBe(censor);
      expect(result.config.secret).toBe(censor);
    });
  });
});
