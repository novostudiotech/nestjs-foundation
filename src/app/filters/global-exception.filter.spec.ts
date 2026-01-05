import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { ZodValidationException } from 'nestjs-zod';
import { QueryFailedError } from 'typeorm';
import { GlobalExceptionFilter } from './global-exception.filter';

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
    // Mock Sentry config to disable it in tests
    jest.mock('../../config', () => ({
      sentryConfig: {
        enabled: false,
        dsn: undefined,
        environment: 'test',
      },
    }));

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
        error: 'Bad Request',
        errors: [{ field: 'email', message: 'Invalid email' }],
      });

      filter.catch(zodError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          error: 'Bad Request',
          errors: [{ field: 'email', message: 'Invalid email' }],
          path: '/test',
          requestId: 'test-request-id',
        })
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('HTTP Exceptions', () => {
    it('should handle HttpException with correct status code', () => {
      const httpException = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
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
          error: 'Custom Error Type',
        },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(httpException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Custom error',
          error: 'Custom Error Type',
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

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          error: 'Conflict',
        })
      );
    });

    it('should handle foreign key violation (23503)', () => {
      const dbError = new QueryFailedError('query', [], new Error('foreign key'));
      (dbError as any).code = '23503';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Referenced record does not exist',
          error: 'Bad Request',
        })
      );
    });

    it('should handle not null violation (23502)', () => {
      const dbError = new QueryFailedError('query', [], new Error('not null'));
      (dbError as any).code = '23502';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Required field is missing',
          error: 'Bad Request',
        })
      );
    });

    it('should handle unknown database errors with 500', () => {
      const dbError = new QueryFailedError('query', [], new Error('unknown'));
      (dbError as any).code = 'UNKNOWN';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
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
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'Internal Server Error',
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
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'Internal Server Error',
        })
      );
    });
  });

  describe('Error Response Structure', () => {
    it('should always include timestamp, path, and requestId', () => {
      const error = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          path: '/test',
          requestId: 'test-request-id',
        })
      );
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
});
