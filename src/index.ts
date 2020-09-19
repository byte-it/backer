import * as Dockerode from 'dockerode';

import 'reflect-metadata';
import {BackupManager} from './BackupManager';
import {Config} from './Config';
import {container} from 'tsyringe';

console.log('Start backer');

container.registerInstance<Dockerode>(
    Dockerode,
    new Dockerode({socketPath: container.resolve(Config).get('socketPath')}),
);

const backupManager = container.resolve(BackupManager);

backupManager.init();
