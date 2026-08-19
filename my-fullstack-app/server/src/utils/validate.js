import { validationResult } from 'express-validator';
import { ApiError } from './catchAsync.js';

// Run after an express-validator chain array; throws a 400 with the first message.
export function checkValidation(req) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    throw new ApiError(400, result.array()[0].msg);
  }
}
