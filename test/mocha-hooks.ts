/**
 * @file Provide global setup for all tests.
 */

import * as config from 'config';
import {container} from 'tsyringe';
import {createLogger, Logger, transports} from 'winston';

export const mochaHooks = {

    /**
     * Setup all needed injectables for the container.
     */
    beforeEach() {
        process.env.npm_package_version = '0.0.1';
        container.registerInstance<Logger>('Logger', createLogger({
            transports: [
                new transports.Console({
                    silent: true,
                }),
            ],
        }));

        container.registerInstance('Config', config);
    },

    /**
     * Reset the container to have a clean setup for every test.
     */
    afterEach() {
        container.reset();
    },
};
