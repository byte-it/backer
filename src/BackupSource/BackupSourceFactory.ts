import {ContainerInspectInfo} from 'dockerode';
import {singleton} from 'tsyringe';
import {BackupSourceMysql} from './BackupSourceMysql';
import {IBackupSource} from './IBackupSource';

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
  public createBackupSource(container: ContainerInspectInfo): IBackupSource {

    const type = container.Config.Labels['backer.type'];
    switch (type) {
      case 'mysql':
        return BackupSourceMysql.fromContainer(container);
      default:
        throw new Error(`Container ${!container.Name}: No backup source for '${type}' found`);
    }
  }
}
