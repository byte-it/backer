import {ContainerInspectInfo} from 'dockerode';
import {singleton} from 'tsyringe';
import {BackupSourceMysql, IMysqlLabels} from './BackupSourceMysql';
import {IBackupSource} from './IBackupSource';
import {ILabels} from '../Interfaces';

/**
 * BackupSourceProvider is a factory to instantiate {@link IBackupSource}s by config.
 *
 * @category BackupSource
 */
@singleton()
export class BackupSourceFactory {
  /**
   * Create a BackupSourceInstance from the labels
   * @param container The container instance to create the backup source for
   *
   * @throws Error If no matching backup source is found
   */
  public createBackupSource(container: ContainerInspectInfo, labels: ILabels | IMysqlLabels): IBackupSource {

    const type = labels.type;
    switch (type) {
      case 'mysql':
        return BackupSourceMysql.fromContainer(container, labels as IMysqlLabels);
      default:
        throw new Error(`Container ${!container.Name}: No backup source for '${type}' found`);
    }
  }
}
