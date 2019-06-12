import {IBackupTarget} from './IBackupTarget';

/**
 *
 */
export class BackupTargetProvider {
  public static getInstance() {
    if (!BackupTargetProvider.instance) {
      BackupTargetProvider.instance = new BackupTargetProvider();
      // ... any one time initialization goes here ...
    }
    return BackupTargetProvider.instance;
  }

  private static instance: BackupTargetProvider;

  /**
   * The default target to use when none is specified
   */
  private defaultTarget: IBackupTarget;

  /**
   * The list of all registered targets
   */
  private targets: { [key: string]: IBackupTarget };

  /**
   * Returns the default backup target
   * @return IBackupTarget
   */
  public getDefaultBackupTarget(): IBackupTarget {
    return this.defaultTarget;
  }

  /**
   * Returns the named target or null if the target name doesn't exist
   * @param name
   */
  public getBackupTarget(name: string): IBackupTarget|null {
    return null;
  }
}
