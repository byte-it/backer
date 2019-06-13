import {ValidationError as JoiValidationError} from '@hapi/joi';

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
