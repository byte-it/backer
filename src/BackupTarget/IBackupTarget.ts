/**
 * The BackupTarget represents the final backup storage (local, s3, etc).
 * It acts as filesystem abstraction layer to the {@link Backup} by providing
 * the needed methods for adding, listing and removing backups.
 */
import {IBackupManifest} from '../IBackupManifest';
import {IBackupManifestBackup} from '../IBackupManifest';

/**
 * The configuration object used to initialize the target. Each BackupTarget implementation can extend this interface
 * to provide the configs they need.
 * @category Config
 */
export interface IBackupTargetConfig {
    /**
     * The type of target.
     */
    type: string;

    /**
     * The name the target should be used under.
     */
    name: string;

    /**
     * Indicates that the target should be default and used for all undefined targets.
     */
    default?: boolean;
}

/**
 *  BackupTarget
 *
 * @category BackupTarget
 */
export interface IBackupTarget {

    readonly name: string;
    /**
     * List all backups on the remote
     * @method
     * @return  {Promise<IBackupManifestBackup[]>}
     */
    getAllBackups(): Promise<IBackupManifestBackup[]>;

    /**
     * Removes the named backup from the remote.
     * @method
     * @param name {string} The full name of the backup file as defined in the manifest
     * @param containerName {string} The name of the container the backup belongs to
     */
    removeBackup(name: string, containerName: string): Promise<void>;

    /**
     * Copy the named backup to a remote.
     * @method
     * @async
     * @param {string} tmpPath The absolute path to the backup on the local file system
     * @param {string} name The filename to be used in the final destination including the file suffix
     * @param {IBackupManifestBackup} manifest The manifest of the current backup
     * @return Promise
     */
    addBackup(tmpPath: string, name: string, manifest: IBackupManifestBackup): Promise<Error | void>;

    /**
     * @method
     * @return {IBackupManifest} The backup manifest managed by this target.
     */
    getManifest(): IBackupManifest;
}
