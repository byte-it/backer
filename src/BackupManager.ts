import * as Dockerode from 'dockerode';
import {inject, singleton} from 'tsyringe';
import {Logger} from 'winston';
import {BackupMandate} from './Backup/BackupMandate';
import {BackupTargetProvider} from './BackupTarget/BackupTargetProvider';
import {IDockerContainerEvent, IDockerEvent} from './Interfaces';

/**
 * BackupManager is responsible for the bookkeeping of all active backups.
 * It scans the docker daemon for all running and configured containers and reacts docker's container events.
 */
@singleton()
export class BackupManager {

  /**
   * The list of backups currently active.
   */
  private readonly _backups: { [containerId: string]: BackupMandate };

  /**
   * Constructor
   * @param {Dockerode} docker The Dockerode instance to watch the docker daemon.
   * @param {winston.Logger} logger The logger.
   * @param {BackupTargetProvider}  targetProvider The target provider.
   */
  constructor(
      @inject(Dockerode) private docker: Dockerode,
      @inject('Logger') private logger: Logger,
      @inject(BackupTargetProvider) private targetProvider: BackupTargetProvider,
  ) {
    this._backups = {};
  }

  public async createBackup(containerId: string): Promise<BackupMandate> {
    const inspect = await this.docker.getContainer(containerId).inspect();
    if (inspect.Config.Labels['backer.type']) {
      try {
        const backup = BackupMandate.fromContainer(inspect);
        this.addBackup(backup);
        return Promise.resolve<BackupMandate>(backup);
      } catch (error) {
        this.logger.error(`Container ${inspect.Name}: Failed to create backup. Reason ${error.message}`);
        return Promise.reject(error.message);
      }
    }
    return Promise.reject();
  }

  /**
   * Add a backup to the manged list.
   * @param {Backup} backup
   */
  public addBackup(backup: BackupMandate): void {
    this._backups[backup.containerId] = backup;
  }

  /**
   * Retrieves a backup by the containerId
   * @param {string} containerId
   * @return {Backup|null} The {@link Backup} with for the containerId or null if not found
   */
  public getBackup(containerId: string): BackupMandate {
    return this._backups[containerId];
  }

  /**
   * Stops the backing up of a single backup by the containerId. The backup cron will be stopped an the backup removed
   * from the list of backups
   *
   * @param {string} containerId
   */
  public stopBackup(containerId: string): void {
    if (this._backups[containerId]) {
      this.logger.info(`Container ${this._backups[containerId].containerName}: Stop backup`);
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
    this.logger.info('Read already started container');
    const containers = await this.docker.listContainers();
    for (const container of containers) {
      if (container.Labels['backer.type']) {
        this.createBackup(container.Id).catch(() => {
          // Do nothing, just dont escalate that promise
        });
      }
    }

    this.logger.info('Start monitoring docker events');
    this.docker.getEvents({}, (err, data) => {
      if (err) {
        this.logger.error(err);
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
