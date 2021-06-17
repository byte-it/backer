import {IConfig} from 'config';
import {container, inject, singleton} from 'tsyringe';
import {Logger} from 'winston';
import {IProvider} from '../IProvider';
import {CcryptMiddleware, IBackupCcryptMiddlewareConfig} from './CcryptMiddleware';
import {GzipMiddleware} from './GzipMiddleware';
import {IBackupMiddlewareConfig} from './IBackupMiddleware';

/**
 * Instantiates all configured middlewares.
 */
@singleton()
export class BackupMiddlewareProvider implements IProvider{

    constructor(@inject('Config') private config: IConfig, @inject('Logger') private logger: Logger) {
    }

    public async init() {
        const config = this.config.get('middlewares') as IBackupMiddlewareConfig[];
        for (const middleware of config) {
            try {
                let instance;
                switch (middleware.type) {
                    case 'gzip':
                        instance = new GzipMiddleware(middleware.name);
                        break;
                    case 'ccrypt':
                        instance = new CcryptMiddleware(middleware as IBackupCcryptMiddlewareConfig);
                        break;
                    default:
                        throw new Error(`Middle ${middleware.type} not found.`);
                }

                container.registerInstance(['middleware', middleware.name].join('.'), instance);
                this.logger.log({
                    level: 'info',
                    message: `Registered ${['middleware', middleware.name].join('.')}.`,
                });
            } catch (e) {
                this.logger.log({
                    level: 'error',
                    message: `Failed to instantiate middleware ${middleware.name}`,
                    error: e,
                });
            }
        }
    }
}
