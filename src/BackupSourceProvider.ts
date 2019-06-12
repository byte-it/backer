import {ContainerInspectInfo} from 'dockerode';
import {BackupSourceMysql} from './BackupSourceMysql';
import {IBackupSource} from './IBackupSource';

export class BackupSourceProvider {
  public static getInstance() {
    if (!BackupSourceProvider.instance) {
      BackupSourceProvider.instance = new BackupSourceProvider();
    }
    return BackupSourceProvider.instance;
  }

  private static instance: BackupSourceProvider;

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
        throw new Error(`Container ${!container.Name}: No matching backup source provider found`);
    }
  }
}
