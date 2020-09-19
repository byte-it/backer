import * as Dockerode from 'dockerode';
import {inject, singleton} from 'tsyringe';
import {Backup} from './Backup/Backup';
import {IDockerContainerEvent, IDockerEvent} from './Interfaces';

/**
 * BackupManager is responsible for the bookkeeping of all active backups.
 * It scans the docker daemon for all running and configured containers and reacts docker's container events.
 */
@singleton()
export class BackupManager {

  /**
   *
   */
  private readonly _backups: { [containerId: string]: Backup };

  /**
   *
   */
  constructor(@inject(Dockerode) private docker: Dockerode) {
    this._backups = {};
  }

  public async createBackup(containerId: string): Promise<Backup> {
    const inspect = await this.docker.getContainer(containerId).inspect();
    if (inspect.Config.Labels['backer.type']) {
      try {
        const backup = Backup.fromContainer(inspect);
        this.addBackup(backup);
        return Promise.resolve<Backup>(backup);
      } catch (error) {
        console.error(`Container ${inspect.Name}: Failed to create backup. Reason ${error.message}`);
        return Promise.reject(error.message);
      }
    }
    return Promise.reject();
  }

  /**
   *
   * @param backup
   */
  public addBackup(backup: Backup): void {
    this._backups[backup.containerId] = backup;
  }

  /**
   *
   * @param containerId
   */
  public getBackup(containerId: string): Backup {
    return this._backups[containerId];
  }

  /**
   *
   * @param containerId
   */
  public stopBackup(containerId: string): void {
    if (this._backups[containerId]) {
      console.log(`Container ${this._backups[containerId].containerName}: Stop backup`);
      this._backups[containerId].stop();
      delete this._backups[containerId];
    }
  }

  /**
   * Initiates the backup manager.
   * It start crawling all containers for backup sources and watches the
   * docker event stream for started/stopped containers
   */
  public async init(): Promise<void> {
    console.log('Read already started container');
    const containers = await this.docker.listContainers();
    for (const container of containers) {
      if (container.Labels['backer.type']) {
        this.createBackup(container.Id).catch(() => {
          // Do nothing, just dont escalate that promise
        });
      }
    }

    console.log('Start monitoring docker events');
    this.docker.getEvents({}, (err, data) => {
      if (err) {
        console.log(err);
      } else {
        data.on('data', (buffer: Buffer) => {
          let event: IDockerEvent = JSON.parse(buffer.toString('utf-8'));
          if (event.Type === 'container') {
            event = event as IDockerContainerEvent;
            if (event.Action === 'start') {
              this.createBackup(event.Actor.ID).catch(() => {
                // Do nothing, just dont escalate that promise
              });

            } else if (event.Action === 'stop') {
              this.stopBackup(event.Actor.ID);
            }
          }
        });
      }
    });
  }

}
