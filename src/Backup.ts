import {Container, ContainerInspectInfo} from 'dockerode';
import {BackupSourceProvider} from './BackupSourceProvider';
import {BackupTargetProvider} from './BackupTargetProvider';
import {IBackupSource} from './IBackupSource';
import {IBackupTarget} from './IBackupTarget';
import {ILabels} from './Labels';
import {extractLabels} from './Util';

export class Backup {

  /**
   *
   */
  public static fromContainer(container: ContainerInspectInfo): Backup {
    const defaultLabels: ILabels = {
      interval: '',
      namePattern: '',
      network: '',
      retention: '',
      target: '',
      type: '',
    };

    let labels = extractLabels(container.Config.Labels);

    labels = Object.assign(defaultLabels, labels);

    let target: IBackupTarget;
    if (labels.target && labels.target !== '') {
      console.log(`Use "${labels.target}" as target for ${container.Name}`);
      target = BackupTargetProvider.getInstance().getBackupTarget(labels.target);
      if (target == null) {
        throw new Error(`The target "${labels.target}" doesn't exist`);
      }
    } else {
      console.log(`Use default target for ${container.Name}`);
      target = BackupTargetProvider.getInstance().getDefaultBackupTarget();
    }

    const source = BackupSourceProvider.getInstance().createBackupSource(container);

    return new Backup(
      container.Id,
      source,
      target,
      labels.interval,
      labels.retention,
      labels.namePattern,
    );
  }

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

  private readonly _containerId: string;

  /**
   * The format of the file name of the backups
   * @TODO: define placeholder
   */
  private readonly _namePattern: string;

  constructor(
    containerId: string,
    source: IBackupSource,
    target: IBackupTarget,
    interval: string,
    retention: string,
    namePattern: string) {
    this._containerId = containerId;
    this._source = source;
    this._target = target;
    this._interval = interval;
    this._retention = retention;
    this._namePattern = namePattern;
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
}
