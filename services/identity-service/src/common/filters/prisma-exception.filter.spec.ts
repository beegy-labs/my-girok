import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '.prisma/identity-client';
import {
  PrismaClientExceptionFilter,
  PrismaValidationExceptionFilter,
  PrismaInitializationExceptionFilter,
} from './prisma-exception.filter';

describe('PrismaClientExceptionFilter', () => {
  let filter: PrismaClientExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new PrismaClientExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ArgumentsHost;
  });

  const createPrismaError = (code: string, meta?: Record<string, unknown>) => {
    const error = new Prisma.PrismaClientKnownRequestError('Test error', {
      code,
      clientVersion: '5.0.0',
      meta,
    });
    return error;
  };

  describe('P2000 - Value too long', () => {
    it('should return 400 with appropriate message', () => {
      const error = createPrismaError('P2000', { column_name: 'name' });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Value too long for field: name',
        error: 'Bad Request',
      });
    });
  });

  describe('P2001 - Record not found', () => {
    it('should return 404', () => {
      const error = createPrismaError('P2001');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'The requested record was not found',
        error: 'Not Found',
      });
    });
  });

  describe('P2002 - Unique constraint violation', () => {
    it('should return 409 with target fields', () => {
      const error = createPrismaError('P2002', { target: ['email', 'username'] });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.CONFLICT,
        message: 'A record with this email, username already exists',
        error: 'Conflict',
      });
    });

    it('should handle missing target in meta', () => {
      const error = createPrismaError('P2002');

      filter.catch(error, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'A record with this value already exists',
        }),
      );
    });
  });

  describe('P2003 - Foreign key constraint violation', () => {
    it('should return 400', () => {
      const error = createPrismaError('P2003');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Referenced record does not exist',
        error: 'Bad Request',
      });
    });
  });

  describe('P2014 - Required relation violation', () => {
    it('should return 400', () => {
      const error = createPrismaError('P2014');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Required relation constraint violation',
        error: 'Bad Request',
      });
    });
  });

  describe('P2015 - Related record not found', () => {
    it('should return 404', () => {
      const error = createPrismaError('P2015');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });
  });

  describe('P2016 - Query interpretation error', () => {
    it('should return 400', () => {
      const error = createPrismaError('P2016');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe('P2017 - Records not connected', () => {
    it('should return 400', () => {
      const error = createPrismaError('P2017');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe('P2018 - Required connected records not found', () => {
    it('should return 404', () => {
      const error = createPrismaError('P2018');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });
  });

  describe('P2019 - Input error', () => {
    it('should return 400', () => {
      const error = createPrismaError('P2019');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe('P2020 - Value out of range', () => {
    it('should return 400', () => {
      const error = createPrismaError('P2020');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe('P2021 - Table not found', () => {
    it('should return 500', () => {
      const error = createPrismaError('P2021');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('P2022 - Column not found', () => {
    it('should return 500', () => {
      const error = createPrismaError('P2022');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('P2025 - Record to update/delete not found', () => {
    it('should return 404 with cause message', () => {
      const error = createPrismaError('P2025', { cause: 'Record to update not found.' });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Record to update not found.',
        error: 'Not Found',
      });
    });
  });

  describe('Unknown error code', () => {
    it('should return 500', () => {
      const error = createPrismaError('P9999');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected database error occurred',
        error: 'Internal Server Error',
      });
    });
  });
});

describe('PrismaValidationExceptionFilter', () => {
  let filter: PrismaValidationExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new PrismaValidationExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ArgumentsHost;
  });

  it('should return 400 for validation errors', () => {
    const error = new Prisma.PrismaClientValidationError('Validation failed', {
      clientVersion: '5.0.0',
    });

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid data provided',
      error: 'Bad Request',
    });
  });
});

describe('PrismaInitializationExceptionFilter', () => {
  let filter: PrismaInitializationExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new PrismaInitializationExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ArgumentsHost;
  });

  it('should return 503 for initialization errors', () => {
    const error = new Prisma.PrismaClientInitializationError(
      'Could not connect to database',
      '5.0.0',
    );

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Database service is currently unavailable',
      error: 'Service Unavailable',
    });
  });
});
