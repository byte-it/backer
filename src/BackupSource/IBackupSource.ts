import {IJsonable} from '../API/IJsonable';
import {IBackupManifest} from '../IBackupManifest';
import {IProvideable} from '../IProvideable';

export interface IBackupSourceJSON {
    type: string;
}
/**
 * IBackupSource must be implemented by all back sources to instantiated by the {@link BackupSourceProvider}
 *
 * @category BackupSource
 *
 * @example
 * // In addition all implementations of IBackupSource must have a static factory method:
 * public static fromContainer(inspectInfo: ContainerInspectInfo): IBackupSource {}}
 */
export interface IBackupSource extends IProvideable, IJsonable {

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

    toJSON(): IBackupSourceJSON;
}
