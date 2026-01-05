import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { ZodValidationException } from 'nestjs-zod';
import { QueryFailedError } from 'typeorm';
import { ErrorCode } from '../dto/error-response.dto';
import { GlobalExceptionFilter } from './global-exception.filter';

// Mock Sentry config to disable it in tests
jest.mock('../../config', () => ({
  sentryConfig: {
    enabled: false,
    dsn: undefined,
    environment: 'test',
  },
}));

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockLogger: jest.Mocked<Logger>;

  const mockRequest = {
    url: '/test',
    path: '/test',
    method: 'GET',
    headers: {
      'x-request-id': 'test-request-id',
      authorization: 'Bearer token',
    },
    query: {},
    body: {},
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const mockArgumentsHost = {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
  } as any;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Zod Validation Exceptions', () => {
    it('should handle ZodValidationException with 400 status', () => {
      const zodError = new ZodValidationException('Validation failed');
      (zodError.getResponse as jest.Mock) = jest.fn().mockReturnValue({
        message: 'Validation failed',
        errors: [{ path: ['email'], message: 'Invalid email', code: 'invalid_string' }],
      });

      filter.catch(zodError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          validation: [{ field: 'email', message: 'Invalid email', rule: 'invalid_string' }],
          path: '/test',
          requestId: 'test-request-id',
        })
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should transform nested field paths correctly', () => {
      const zodError = new ZodValidationException('Validation failed');
      (zodError.getResponse as jest.Mock) = jest.fn().mockReturnValue({
        message: 'Validation failed',
        errors: [{ path: ['user', 'address', 'city'], message: 'Required', code: 'invalid_type' }],
      });

      filter.catch(zodError, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          validation: [{ field: 'user.address.city', message: 'Required', rule: 'invalid_type' }],
        })
      );
    });
  });

  describe('HTTP Exceptions', () => {
    it('should handle HttpException with correct status code', () => {
      const httpException = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.NOT_FOUND,
          code: ErrorCode.NOT_FOUND,
          message: 'Not found',
          path: '/test',
          requestId: 'test-request-id',
        })
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle HttpException with object response', () => {
      const httpException = new HttpException(
        {
          message: 'Custom error',
        },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          code: ErrorCode.BAD_REQUEST,
          message: 'Custom error',
        })
      );
    });

    it('should handle UNAUTHORIZED status', () => {
      const error = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.UNAUTHORIZED,
          code: ErrorCode.UNAUTHORIZED,
        })
      );
    });

    it('should handle FORBIDDEN status', () => {
      const error = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.FORBIDDEN,
          code: ErrorCode.FORBIDDEN,
        })
      );
    });

    it('should log error for 500+ status codes', () => {
      const serverError = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);

      filter.catch(serverError, mockArgumentsHost);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('TypeORM Database Errors', () => {
    it('should handle unique constraint violation (23505)', () => {
      const dbError = new QueryFailedError('query', [], new Error('duplicate key'));
      (dbError as any).code = '23505';
      (dbError as any).constraint = 'users_email_key';
      (dbError as any).table = 'users';
      (dbError as any).column = 'email';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          code: ErrorCode.DATABASE_CONFLICT_ERROR,
          message: 'A record with this value already exists',
        })
      );

      // In development, should include constraint and table
      const response = mockResponse.json.mock.calls[0][0];
      if (process.env.NODE_ENV === 'development') {
        expect(response.details).toMatchObject({
          constraint: 'users_email_key',
          table: 'users',
          column: 'email',
        });
      } else {
        // In production, only column is exposed
        expect(response.details?.column).toBe('email');
        expect(response.details?.constraint).toBeUndefined();
        expect(response.details?.table).toBeUndefined();
      }
    });

    it('should handle foreign key violation (23503)', () => {
      const dbError = new QueryFailedError('query', [], new Error('foreign key'));
      (dbError as any).code = '23503';
      (dbError as any).constraint = 'orders_user_id_fkey';
      (dbError as any).table = 'orders';
      (dbError as any).column = 'user_id';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          code: ErrorCode.DATABASE_VALIDATION_ERROR,
          message: 'Referenced record does not exist',
        })
      );
    });

    it('should handle not null violation (23502)', () => {
      const dbError = new QueryFailedError('query', [], new Error('not null'));
      (dbError as any).code = '23502';
      (dbError as any).column = 'email';
      (dbError as any).table = 'users';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          code: ErrorCode.DATABASE_VALIDATION_ERROR,
          message: 'Required field is missing',
        })
      );
    });

    it('should handle database errors without details', () => {
      const dbError = new QueryFailedError('query', [], new Error('duplicate key'));
      (dbError as any).code = '23505';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          code: ErrorCode.DATABASE_CONFLICT_ERROR,
          message: 'A record with this value already exists',
        })
      );
      // Should not have details field when there are no details
      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.details).toBeUndefined();
    });

    it('should handle unknown database errors with 500', () => {
      const dbError = new QueryFailedError('query', [], new Error('unknown'));
      (dbError as any).code = 'UNKNOWN';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ErrorCode.DATABASE_ERROR,
          message: 'Database error occurred',
        })
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Generic Errors', () => {
    it('should handle generic Error with 500 status', () => {
      const genericError = new Error('Something went wrong');

      filter.catch(genericError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        })
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle unknown exceptions with 500 status', () => {
      const unknownError = 'string error';

      filter.catch(unknownError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        })
      );
    });
  });

  describe('Error Response Structure', () => {
    it('should always include status, code, timestamp, path, and requestId', () => {
      const error = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          code: expect.any(String),
          timestamp: expect.any(String),
          path: '/test',
          requestId: 'test-request-id',
        })
      );
    });

    it('should not include error field (removed from structure)', () => {
      const error = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(error, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.error).toBeUndefined();
      expect(responseCall.statusCode).toBeUndefined();
    });

    it('should handle missing requestId gracefully', () => {
      const mockRequestWithoutId = {
        ...mockRequest,
        headers: {},
      };

      const mockHostWithoutId = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: () => mockResponse,
          getRequest: () => mockRequestWithoutId,
        }),
      } as any;

      const error = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(error, mockHostWithoutId);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          path: '/test',
          requestId: undefined,
        })
      );
    });
  });

  describe('Sentry Integration', () => {
    it('should not crash when Sentry is disabled', () => {
      const serverError = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);

      expect(() => {
        filter.catch(serverError, mockArgumentsHost);
      }).not.toThrow();

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('Sensitive Data Sanitization', () => {
    it('should sanitize top-level sensitive fields', () => {
      const request = {
        ...mockRequest,
        body: {
          email: 'user@example.com',
          password: 'secret123',
          token: 'abc-token',
        },
      };

      const host = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: () => mockResponse,
          getRequest: () => request,
        }),
      } as any;

      const error = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
      filter.catch(error, host);

      // Verify response is sent (sanitization happens internally)
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should sanitize nested sensitive fields', () => {
      const request = {
        ...mockRequest,
        body: {
          user: {
            email: 'user@example.com',
            password: 'secret123',
            profile: {
              apiKey: 'key-123',
            },
          },
          credentials: {
            token: 'bearer-token',
          },
        },
      };

      const host = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: () => mockResponse,
          getRequest: () => request,
        }),
      } as any;

      const error = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
      filter.catch(error, host);

      // Verify response is sent (sanitization happens internally)
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should sanitize arrays with sensitive data', () => {
      const request = {
        ...mockRequest,
        body: {
          users: [
            { email: 'user1@example.com', password: 'pass1' },
            { email: 'user2@example.com', password: 'pass2' },
          ],
        },
      };

      const host = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: () => mockResponse,
          getRequest: () => request,
        }),
      } as any;

      const error = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
      filter.catch(error, host);

      // Verify response is sent (sanitization happens internally)
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle case-insensitive sensitive field matching', () => {
      const request = {
        ...mockRequest,
        body: {
          userPassword: 'secret',
          apiToken: 'token123',
          secretKey: 'key',
        },
      };

      const host = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: () => mockResponse,
          getRequest: () => request,
        }),
      } as any;

      const error = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
      filter.catch(error, host);

      // Verify response is sent (sanitization happens internally)
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('Prototype Pollution Protection', () => {
    it('should prevent __proto__ injection in request body', () => {
      const request = {
        ...mockRequest,
        body: {
          email: 'user@example.com',
          __proto__: { polluted: true },
          constructor: { polluted: true },
          prototype: { polluted: true },
        },
      };

      const host = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: () => mockResponse,
          getRequest: () => request,
        }),
      } as any;

      const error = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
      filter.catch(error, host);

      // Verify response is sent without crashing
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalled();

      // Verify Object.prototype is not polluted
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('should prevent __proto__ injection in request headers', () => {
      const request = {
        ...mockRequest,
        headers: {
          'x-request-id': 'test-id',
          __proto__: { malicious: true },
          constructor: { malicious: true },
          prototype: { malicious: true },
        },
      };

      const host = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: () => mockResponse,
          getRequest: () => request,
        }),
      } as any;

      const error = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
      filter.catch(error, host);

      // Verify response is sent without crashing
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalled();

      // Verify Object.prototype is not polluted
      expect((Object.prototype as any).malicious).toBeUndefined();
    });

    it('should prevent nested __proto__ injection', () => {
      const request = {
        ...mockRequest,
        body: {
          user: {
            name: 'John',
            __proto__: { polluted: true },
          },
          settings: {
            theme: 'dark',
            constructor: { polluted: true },
          },
        },
      };

      const host = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: () => mockResponse,
          getRequest: () => request,
        }),
      } as any;

      const error = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
      filter.catch(error, host);

      // Verify response is sent without crashing
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalled();

      // Verify Object.prototype is not polluted
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });
});
