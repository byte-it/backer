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
 */
export interface IBackupTargetConfig {
    type: string;
    name: string;
}

export interface IBackupTarget {

    /**
     * List all backups on the remote
     */
    getAllBackups(): Promise<IBackupManifestBackup[]>;

    /**
     * Removes the named backup from the remote
     * @param name {string} The full name of the backup file as defined in the manifest
     * @param containerName {string} The name of the container the backup belongs to
     */
    removeBackup(name: string, containerName: string): Promise<void>;

    /**
     * Copy the named backup to a remote
     * @param tmpPath The absolute path to the backup on the local file system
     * @param name The filename to be used in the final destination including the file suffix
     * @param manifest The manifest of the current backup
     */
    addBackup(tmpPath: string, name: string, manifest: IBackupManifestBackup): Promise<Error | void>;

    /**
     * @return IBackupManifest The backup manifest managed by this target.
     */
    getManifest(): IBackupManifest;
}
