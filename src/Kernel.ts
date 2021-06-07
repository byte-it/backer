import * as Sentry from '@sentry/node';
import {IConfig} from 'config';
import * as config from 'config';
import * as Dockerode from 'dockerode';
import {container} from 'tsyringe';
import * as winston from 'winston';
import {Logger} from 'winston';
import {API} from './API/API';
import {BackupManager} from './BackupManager';
import {BackupMiddlewareProvider} from './BackupMiddleware/BackupMiddlewareProvider';
import {BackupTargetProvider} from './BackupTarget/BackupTargetProvider';
import {Queue} from './Queue/Queue';

export class Kernel {
    public async bootstrap() {

        const signals = {
            SIGHUP: 1,
            SIGINT: 2,
            SIGTERM: 15,
        };

        for (const sig in signals) {
            if (signals.hasOwnProperty(sig)) {
                process.on(sig, () => {
                    this.shutdown(sig);
                });
            }
        }

        // @todo Load correct version from package
        // @todo Allow `serverName` in config
        Sentry.init(
            {
                dsn: config.get('sentry.dsn'),
                tracesSampleRate: 1.0,
                release: '0.0.2',
                environment: process.env.NODE_ENV,
            },
        );
        Sentry.setContext('node', {
            version: process.version,
        });

        try {

            Sentry.addBreadcrumb({
                type: 'info',
                message: 'Start Bootstrap',
                category: 'kernel',
            });

            container.registerInstance<IConfig>('Config', config);

            const logger = winston.createLogger({
                transports: [
                    new winston.transports.Console({
                        level: config.get<string>('logLevel'),
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

            container.resolve(Queue);

            const targetProvider = container.resolve(BackupTargetProvider);
            await targetProvider.init();

            const middlewareProvider = container.resolve(BackupMiddlewareProvider);
            await middlewareProvider.init();

            const backupManager = container.resolve(BackupManager);
            await backupManager.init();

            container.resolve(API);
            Sentry.addBreadcrumb({
                type: 'info',
                message: 'Bootstrap finished',
                category: 'kernel',
            });
            await container.resolve(Queue).start();
        } catch (e) {
            // Anything that escalates to here will be considered fatal
            Sentry.captureException(e);
            return;
        }
    }

    public async shutdown(signal) {
        Sentry.addBreadcrumb({
            type: 'info',
            message: `Shutting down. Signal: ${signal}`,
            category: 'kernel',
        });
        container.resolve<Logger>('Logger').info(`Shutting down. Signal: ${signal}`);
        container.resolve<BackupManager>(BackupManager).stopBackups();
        await Promise.all([
            container.resolve<Queue>(Queue).stop(),
            container.resolve<API>(API).stop(),
        ]);

        container.resolve<Logger>('Logger').info(`Shutdown complete. Signal: ${signal}`);
    }

}
