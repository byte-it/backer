import {Backup} from './Backup';

export class BackupManager {

  public static getInstance() {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
      // ... any one time initialization goes here ...
    }
    return BackupManager.instance;
  }

  private static instance: BackupManager;

  /**
   *
   */
  private readonly backups: { [containerId: string]: Backup };

  /**
   *
   */
  private constructor() {
    this.backups = {};
  }

  /**
   *
   * @param backup
   */
  public addBackup(backup: Backup): void {
    this.backups[backup.containerId] = backup;
  }

  /**
   *
   * @param containerId
   */
  public getBackup(containerId: string): Backup {
    return this.backups[containerId];
  }

  /**
   *
   * @param containerId
   */
  public stopBackup(containerId: string): void {
    // TODO: implement;
  }
}
