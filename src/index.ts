import * as Dockerode from 'dockerode';
import {BackupManager} from './BackupManager';

console.log('Start backer');
const config = {
  defaultTarget: process.env.DEFAULT_TARGET ? process.env.DEFAULT_TARGET : 'minio',
  socketPath: process.env.SOCKET_PATH ? process.env.SOCKET_PATH : '/var/run/docker.sock',
};

const docker = new Dockerode({socketPath: config.socketPath});

const backupManager = new BackupManager(docker);

backupManager.init();
