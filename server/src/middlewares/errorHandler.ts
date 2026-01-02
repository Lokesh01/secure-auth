import { ErrorRequestHandler } from 'express';
import { AppError } from '#common/utils/AppError';

export const errorHandler: ErrorRequestHandler = (
  error: Error | unknown,
  req,
  res,
  _next
): void => {
  console.error(`Error occurred on PATH: ${req.path}`, error);

  if (error instanceof SyntaxError) {
    res.status(400).json({
      message: 'Bad Request: Invalid JSON syntax',
      error: error.message,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      errorCode: error.errorCode,
    });
    return;
  }

  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred';

  res.status(500).json({
    message: 'Internal Server Error',
    error: errorMessage,
  });
};
