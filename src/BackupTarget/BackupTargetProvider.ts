import {inject, singleton} from 'tsyringe';
import {Config} from '../Config';
import {IBackupTarget} from './IBackupTarget';

/**
 * The BackupTargetProvider manages all available and configured BackupTargets.
 * BackupTargets need to be statically configured, as they may contain sensitive credentials or are reused by multiple
 * containers.
 */
@singleton()
export class BackupTargetProvider {

  private readonly _config: Config;

  /**
   * The default target to use when none is specified
   */
  private _defaultTarget: IBackupTarget;

  /**
   * The list of all registered targets
   */
  private targets: { [key: string]: IBackupTarget };

  constructor(@inject(Config) config) {
    this._config = config;
  }

  /**
   * Returns the default backup target
   * @return IBackupTarget
   */
  public getDefaultBackupTarget(): IBackupTarget {
    return this._defaultTarget;
  }

  /**
   * Returns the named target or null if the target name doesn't exist
   * @param name
   */
  public getBackupTarget(name: string): IBackupTarget|null {
    return null;
  }
}
