import {existsSync, lstatSync, PathLike} from 'fs';
import * as Path from 'path';
import {inject, injectable} from 'tsyringe';
import {Logger} from 'winston';
import {IBackupManifest, IBackupTargetManifest} from '../IBackupManifest';
import {IBackupTargetS3Config} from './BackupTargetS3';
import {FileNotFound} from './Exceptions/FileNotFound';
import {ManifestNotFound} from './Exceptions/ManifestNotFound';
import {IBackupTarget, IBackupTargetConfig} from './IBackupTarget';

/**
 * @category Target
 */
export abstract class BackupTargetBase implements IBackupTarget {

    public static readonly manifestName = 'manifest.json';

    public readonly abstract name: string;

    protected manifest: IBackupTargetManifest;

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
            // @todo Error out and prevent target creation to prevent problems further down the road
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
                this.logger.error(e.message);
            }
        }
        await this.writeManifestToTarget();

    }

    /**
     * @inheritDoc
     */
    public async addBackup(manifest: IBackupManifest): Promise<void> {
        const lastStep = manifest.steps[manifest.steps.length - 1];

        const {uri} = lastStep;
        if (!(existsSync(uri) && lstatSync(uri).isFile())) {
            throw new FileNotFound(`File ${uri} doesn't exist`);
        }

        manifest = await this.moveBackupToTarget(uri, Path.basename(uri), manifest);

        this.manifest.backups.push(manifest);
        await this.writeManifestToTarget();
    }

    /**
     * @inheritDoc
     */
    public getAllBackups(): IBackupManifest[] {
        return this.manifest.backups;
    }

    /**
     * @inheritDoc
     */
    public getManifest(): IBackupTargetManifest {
        return this.manifest;
    }

    /**
     * @inheritDoc
     */
    public async deleteBackup(manifest: IBackupManifest): Promise<void> {
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
     * @param {IBackupTargetManifest} manifest The manifest shipped with backup.
     * @protected
     */
    protected abstract async moveBackupToTarget(
        tmpPath: string,
        name: string,
        manifest: IBackupManifest,
    ): Promise<IBackupManifest>;

    /**
     * Removes the backup file from the target.
     *
     * @param {IBackupTargetManifest} manifest The manifest for the backup to delete
     * @protected
     */
    protected abstract async deleteBackupFromTarget(manifest: IBackupManifest): Promise<void>;

    /**
     * Reads the manifest from the target.
     * @protected
     */
    protected abstract async readManifestFromTarget(): Promise<IBackupTargetManifest>;

    /**
     * Writes the manifest to the target
     * @protected
     */
    protected abstract async writeManifestToTarget(): Promise<void>;
}
