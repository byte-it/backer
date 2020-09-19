import {ValidationError as JoiValidationError} from 'joi';

export class ValidationError extends Error {

  /**
   * Constructs a ValidationError
   * @param message
   * @param validationError
   */
  constructor(message: string, public validationError: JoiValidationError) {
    super(message);
  }
}
