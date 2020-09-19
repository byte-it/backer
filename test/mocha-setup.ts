/**
 * @file Provide global setup for all tests.
 */

import {container} from 'tsyringe';
import {createLogger, Logger, transports} from 'winston';

/**
 * Setup all needed injectables for the container.
 */
beforeEach(() => {
    container.registerInstance<Logger>('Logger', createLogger({
        transports: [
            new transports.Console(),
        ],
    }));
});

/**
 * Reset the container to have a clean setup for every test.
 */
afterEach(() => {
    container.reset();
});
