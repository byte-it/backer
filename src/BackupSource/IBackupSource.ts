/**
 * IBackupSource must be implemented by all back sources to instantiated by the {@link BackupSourceProvider}
 *
 * @category BackupSource
 *
 * @example
 * // In addition all implementations of IBackupSource must have a static factory method:
 * public static fromContainer(inspectInfo: ContainerInspectInfo): IBackupSource {}}
 */
import {IBackupManifest} from '../IBackupManifest';

export interface IBackupSource {

  /**
   * The identifying name of the backup source (e.g 'mysql')
   */
  readonly name: string;

  /**
   * Returns the ending of the file created by this backup source. (e.g `.sql.tar` or `.dump`)
   */
  getFileSuffix(): string;

  /**
   * Starts the creation of a database backup to the local filesystem.
   *
   * The backup file must be written to the temporary directory defined in the config.
   *
   * @async
   * @param manifest
   */
  backup(manifest: IBackupManifest): Promise<IBackupManifest>;
}
