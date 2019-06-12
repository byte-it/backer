import {ContainerInfo, ContainerInspectInfo} from 'dockerode';
import * as Dockerode from 'dockerode';
import {Backup} from './Backup';
import {BackupManager} from './BackupManager';
import {BackupSourceMysql} from './BackupSourceMysql';
import {BackupSourceProvider} from './BackupSourceProvider';

const config = {
  defaultTarget: process.env.DEFAULT_TARGET ? process.env.DEFAULT_TARGET : 'minio',
  socketPath: process.env.SOCKET_PATH ? process.env.SOCKET_PATH : '/var/run/docker.sock',
};

const docker = new Dockerode({socketPath: config.socketPath});

const backups: Backup[] = [];

(async function init() {
  const containers = await docker.listContainers();
  for (const container of containers) {
    if (container.Labels['backer.type']) {
      docker.getContainer(container.Id).inspect().then((inspect: ContainerInspectInfo) => {
        try {
          const backup = Backup.fromContainer(inspect);
          BackupManager.getInstance().addBackup(backup);
        } catch (error) {
          console.error(error.message);
        }
      });
    }
  }
})();
