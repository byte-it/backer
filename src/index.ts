import * as Dockerode from 'dockerode';
import 'reflect-metadata';
import {container} from 'tsyringe';
import * as winston from 'winston';
import {Logger} from 'winston';
import {BackupManager} from './BackupManager';
import {BackupTargetProvider} from './BackupTarget/BackupTargetProvider';
import * as config from 'config';
import {IConfig} from 'config';
import {Queue} from './Queue/Queue';
import {BackupMiddlewareProvider} from './BackupMiddleware/BackupMiddlewareProvider';

/**
 * Bootstraps the application.
 * Mainly handles the initiation of all needed services.
 */
async function bootstrap() {
    container.registerInstance<IConfig>('Config', config);

    const logger = winston.createLogger({
        transports: [
            new winston.transports.Console({
                level: config.get<string>('logLevel')
            }),
        ],
    });

    logger.info('Start backer');

    container.registerInstance<Logger>(
        'Logger',
        logger,
    );

    container.registerInstance<Dockerode>(
        Dockerode,
        new Dockerode({socketPath: container.resolve<IConfig>('Config').get('socketPath')}),
    );

    const targetProvider = container.resolve(BackupTargetProvider);
    await targetProvider.init();


    const middlewareProvider = container.resolve(BackupMiddlewareProvider);
    await middlewareProvider.init();

    const backupManager = container.resolve(BackupManager);
    await backupManager.init();

    const queue = container.resolve(Queue);
    await queue.start();
}

bootstrap().then(() => {});
