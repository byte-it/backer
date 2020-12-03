import {existsSync, lstatSync, PathLike} from 'fs';
import {inject, injectable} from 'tsyringe';
import {Logger} from 'winston';
import {IBackupManifest, IBackupManifestBackup} from '../IBackupManifest';
import {IBackupTargetS3Config} from './BackupTargetS3';
import {ManifestNotFound} from './Exceptions/ManifestNotFound';
import {IBackupTarget, IBackupTargetConfig} from './IBackupTarget';

/**
 * @category Target
 */
export abstract class BackupTargetBase implements IBackupTarget {

    public static readonly manifestName = 'manifest.json';

    public readonly abstract name: string;

    protected manifest: IBackupManifest;

    protected constructor(@inject('logger') protected logger: Logger, protected config: IBackupTargetConfig) {
    }

    /**
     * @inheritDoc
     */
    public async init(): Promise<void> {
        const writeable = await this.isTargetWriteable();
        if (!writeable) {
            this.logger.log({
                level: 'info',
                message: `BackupTarget ${this.config.name}: The configured target isn't writeable.`,
                targetName: this.config.name,
                targetType: this.config.type,
            });
            return;
        }
        try {
            this.manifest = await this.readManifestFromTarget();
        } catch (e) {
            if (e instanceof ManifestNotFound) {
                this.logger.log({
                    level: 'info',
                    message: `BackupTarget ${this.config.name}: The configured target doesn't include a manifest file, a new one will be created`,
                    targetName: this.config.name,
                    targetType: this.config.type,
                });

                // Create a new manifest
                this.manifest = {
                    backups: [],
                    target: {
                        name: this.config.name,
                        type: this.config.type,
                    },
                };

            } else {
                // @todo Better error handling
            }
        }
        await this.writeManifestToTarget();

    }

    /**
     * @inheritDoc
     */
    public async addBackup(tmpPath: string, name: string, manifest: IBackupManifestBackup): Promise<void> {
        if (!(existsSync(tmpPath) && lstatSync(tmpPath).isFile())) {
            throw new Error(`File ${tmpPath} doesn't exist`);
        }
        try {
            manifest = await this.moveBackupToTarget(tmpPath, name, manifest);
        } catch (e) {
            // @todo handle error properly
        }

        this.manifest.backups.push(manifest);
        await this.writeManifestToTarget();
    }

    /**
     * @inheritDoc
     */
    public getAllBackups(): IBackupManifestBackup[] {
        return this.manifest.backups;
    }

    /**
     * @inheritDoc
     */
    public getManifest(): IBackupManifest {
        return this.manifest;
    }

    /**
     * @inheritDoc
     */
    public async deleteBackup(manifest: IBackupManifestBackup): Promise<void> {
        await this.deleteBackupFromTarget(manifest);

        const index = this.manifest.backups.findIndex(
            (currManifest) => {
                return currManifest === manifest;
            });

        delete this.manifest.backups[index];

        await this.writeManifestToTarget();
    }

    /**
     * Validates that the target is writeable.
     * May do things like checking for existence of directories, checking write permissions etc.
     * @protected
     */
    protected abstract async isTargetWriteable(): Promise<boolean>;

    /**
     * Validates that exists on the implemented target.
     * @param {string} path The absolute path to the file.
     * @protected
     */
    protected abstract async doesFileExistOnTarget(path: string): Promise<boolean>;

    /**
     * Moves the backup file from the local tmp folder to the target implementation.
     *
     * @param {string} tmpPath The absolute path of the file in the local temp folder.
     * @param {string} name The final filename of the backup on the target. (Doesn't include the container prefix).
     * @param {IBackupManifest} manifest The manifest shipped with backup.
     * @protected
     */
    protected abstract async moveBackupToTarget(
        tmpPath: string,
        name: string,
        manifest: IBackupManifestBackup,
    ): Promise<IBackupManifestBackup>;

    /**
     * Removes the backup file from the target.
     *
     * @param {IBackupManifest} manifest The manifest for the backup to delete
     * @protected
     */
    protected abstract async deleteBackupFromTarget(manifest: IBackupManifestBackup): Promise<void>;

    /**
     * Reads the manifest from the target.
     * @protected
     */
    protected abstract async readManifestFromTarget(): Promise<IBackupManifest>;

    /**
     * Writes the manifest to the target
     * @protected
     */
    protected abstract async writeManifestToTarget(): Promise<void>;
}
