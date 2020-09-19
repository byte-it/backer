import * as Dockerode from 'dockerode';
import 'reflect-metadata';
import {container} from 'tsyringe';
import * as winston from 'winston';
import {Logger} from 'winston';
import {BackupManager} from './BackupManager';
import {Config} from './Config';

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
    ],
});

logger.info('Start backer');

container.registerInstance<Logger>(
    'Logger',
    logger,
);

container.registerInstance<Dockerode>(
    Dockerode,
    new Dockerode({socketPath: container.resolve(Config).get('socketPath')}),
);

const backupManager = container.resolve(BackupManager);

backupManager.init();
