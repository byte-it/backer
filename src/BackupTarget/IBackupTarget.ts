/**
 * The BackupTarget represents the final backup storage (local, s3, etc).
 * It acts as filesystem abstraction layer to the {@link Backup} by providing
 * the needed methods for adding, listing and removing backups.
 */
import {IJsonable} from '../API/IJsonable';
import {IBackupTargetManifest} from '../IBackupManifest';
import {IBackupManifest} from '../IBackupManifest';
import {IProvideable} from '../IProvideable';

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

export interface IBackupTargetJSON {
    name: string;
    type: string;
}

/**
 *  BackupTarget
 *
 * @category BackupTarget
 */
export interface IBackupTarget extends IProvideable, IJsonable {
    /**
     * Initializes the target. The constructor only assigns the config. This allows the init method to perform async
     * operations up on start, like reading the manifest and validating that it can write to the target implementation.
     * @method
     * @return {Promise<void>} Resolves once all initiation work is done.
     */
    init(): Promise<void>;

    /**
     * List all backups on the remote
     * @method
     * @return  {Promise<IBackupManifest[]>}
     */
    getAllBackups(): IBackupManifest[];

    /**
     * Removes the named backup from the remote.
     * @method
     * @param {IBackupManifest} manifest
     */
    deleteBackup(manifest: IBackupManifest): Promise<void>;

    /**
     * Copy the named backup to a remote.
     * @method
     * @async
     * @param {IBackupManifest} manifest The manifest of the current backup
     * @return Promise
     */
    addBackup(manifest: IBackupManifest): Promise<Error | void>;

    /**
     * @method
     * @return {IBackupTargetManifest} The backup manifest managed by this target.
     */
    getManifest(): IBackupTargetManifest;

    toJSON(): IBackupTargetJSON;
}
