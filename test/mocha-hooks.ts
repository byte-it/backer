/**
 * @file Provide global setup for all tests.
 */

import * as Sentry from '@sentry/node';
import * as config from 'config';
import * as fs from 'fs';
import {IPackageJson} from 'package-json-type';
import * as Path from 'path';
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

        const npmPackage = JSON.parse(fs.readFileSync(Path.join(process.cwd(), 'package.json'), {encoding: 'utf-8'}));
        container.registerInstance<IPackageJson>('package', npmPackage);

        Sentry.init({
            environment: 'testing',
        });
    },

    /**
     * Reset the container to have a clean setup for every test.
     */
    afterEach() {
        container.reset();
    },
};
