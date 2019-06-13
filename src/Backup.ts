import * as Joi from '@hapi/Joi';
import {JoiObject} from '@hapi/Joi';
import {ContainerInspectInfo} from 'dockerode';
import {BackupSourceProvider} from './BackupSourceProvider';
import {BackupTargetProvider} from './BackupTargetProvider';
import {IBackupSource} from './IBackupSource';
import {IBackupTarget} from './IBackupTarget';
import {extractLabels} from './Util';
import {ValidationError} from './ValidationError';

export class Backup {
  public static getSchema(): JoiObject {
    return Joi.object().keys({
      target: Joi.string(),
      type: Joi.string().required(),
      interval: Joi.string(),
      retention: Joi.string(),
      namePattern: Joi.string(),
      network: Joi.string().required(),
    }).options({
      allowUnknown: true,
    });
  }

  /**
   *
   */
  public static fromContainer(container: ContainerInspectInfo): Backup {
    console.log(`Container ${container.Name}: Create backup`);

    const defaultLabels = {
      interval: '0 0 * * *',
      namePattern: '<DATE>-<CONTAINER_NAME>-<DATABASE>',
      retention: '10',
    };

    let labels = extractLabels(container.Config.Labels);

    labels = Object.assign(defaultLabels, labels);

    const result = Joi.validate(labels, this.getSchema());

    if (result.error !== null) {
      for (const error of result.error.details) {
        console.log(`Container ${container.Name}: ${error.message}`);
      }
      throw new ValidationError('Validation failed', result.error);
    }

    let target: IBackupTarget;
    if (labels.target && labels.target !== '') {
      console.log(`Container ${container.Name}: Use "${labels.target}" as target`);
      target = BackupTargetProvider.getInstance().getBackupTarget(labels.target);
      if (target == null) {
        throw new Error(`Container ${container.Name}: Validation: The target "${labels.target}" doesn't exist`);
      }
    } else {
      console.log(`Container ${container.Name}: Use default target`);
      target = BackupTargetProvider.getInstance().getDefaultBackupTarget();
    }

    const source = BackupSourceProvider.getInstance().createBackupSource(container);

    console.log(`Container ${container.Name}: Created backup`);
    return new Backup(
      container.Id,
      container.Name,
      source,
      target,
      labels.interval,
      labels.retention,
      labels.namePattern,
    );
  }

  /**
   * The human readable name of the docker container to backup
   */
  private readonly _containerName: string;
  /**
   * The docker sha of the docker container to backup
   */
  private readonly _containerId: string;

  /**
   *
   */
  private readonly _source: IBackupSource;

  /**
   *
   */
  private readonly _target: IBackupTarget;
  /**
   * The backup interval in cron format (* * * * * *)
   */
  private readonly _interval: string;

  /**
   * How long the backups should be retained
   */
  private readonly _retention: string;
  /**
   * The format of the file name of the backups
   * @TODO: define placeholder
   */
  private readonly _namePattern: string;
  constructor(
    containerId: string,
    containerName: string,
    source: IBackupSource,
    target: IBackupTarget,
    interval: string,
    retention: string,
    namePattern: string) {
    this._containerId = containerId;
    this._containerName = containerName;
    this._source = source;
    this._target = target;
    this._interval = interval;
    this._retention = retention;
    this._namePattern = namePattern;
  }

  get containerName(): string {
    return this._containerName;
  }

  get containerId(): string {
    return this._containerId;
  }

  get source(): IBackupSource {
    return this._source;
  }

  get target(): IBackupTarget {
    return this._target;
  }

  get interval(): string {
    return this._interval;
  }

  get retention(): string {
    return this._retention;
  }

  get namePattern(): string {
    return this._namePattern;
  }

  /**
   * Stops the backup and its cron
   */
  public stop() {
    // TODO: implement
    console.log(`Container ${this._containerId}: Stop backup`);
  }
}
