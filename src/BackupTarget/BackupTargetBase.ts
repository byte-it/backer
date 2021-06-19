import {Mutex} from 'async-mutex';
import {existsSync, lstatSync, PathLike} from 'fs';
import {IPackageJson} from 'package-json-type';
import * as Path from 'path';
import {container, inject} from 'tsyringe';
import {Logger} from 'winston';
import {getIBackupTargetManifestSchema, IBackupManifest, IBackupTargetManifest} from '../IBackupManifest';
import {getLastStep} from '../Util';
import {FileNotFound} from './Exceptions/FileNotFound';
import {ManifestInvalid} from './Exceptions/ManifestInvalid';
import {ManifestNotFound} from './Exceptions/ManifestNotFound';
import {IBackupTarget, IBackupTargetConfig, IBackupTargetJSON} from './IBackupTarget';

/**
 * @category Target
 */
export abstract class BackupTargetBase implements IBackupTarget {
    private get manifest(): IBackupTargetManifest {
        return this._manifest;
    }

    private set manifest(manifest: IBackupTargetManifest) {
        if (this._manifest === null) {
            this._manifest = manifest;
        } else {
            throw new Error('The manifest can only be set once');
        }
    }

    get type(): string {
        return this._type;
    }

    get name(): string {
        return this._name;
    }

    public static readonly manifestName = 'manifest.json';

    protected _name: string;
    protected _type: string;
    protected _manifestMutex: Mutex;

    private _manifest: IBackupTargetManifest = null;

    protected constructor(@inject('logger') protected logger: Logger, protected config: IBackupTargetConfig) {
        this._name = config.name;
        this._manifestMutex = new Mutex();
    }

    /**
     * @inheritDoc
     */
    public async init(): Promise<void> {
        const writeable = await this.isTargetWriteable();
        if (!writeable) {
            this.logger.log({
                level: 'error',
                message: `BackupTarget ${this.config.name}: The configured target isn't writeable.`,
                targetName: this.config.name,
                targetType: this.config.type,
            });
            throw new Error(`Target ${this._name} isn't writeable, init aborted. All mandates with this target will fail`);
        }

        const version = container.resolve<IPackageJson>('package').version;

        await this._manifestMutex.runExclusive(async () => {
            try {
                const manifest = await this.readManifestFromTarget();

                const result = getIBackupTargetManifestSchema().validate(manifest);

                if (result.hasOwnProperty('error')) {
                    throw new ManifestInvalid(result.error.toString());
                }
                if (manifest.version !== version) {
                    manifest.version = version;
                }
                this.manifest = manifest;
            } catch (e) {
                if (e instanceof ManifestNotFound || e instanceof ManifestInvalid) {

                    if (e instanceof ManifestNotFound) {
                        this.logger.log({
                            level: 'info',
                            message: `BackupTarget ${this.config.name}: The configured target doesn't include a manifest file, a new one will be created`,
                            targetName: this.config.name,
                            targetType: this.config.type,
                        });
                    } else if (e instanceof ManifestInvalid) {
                        this.logger.log({
                            level: 'info',
                            message: `BackupTarget ${this.config.name}: The manifest of the configured target is invalid, a new one will be created`,
                            validationMessage: e.message,
                            targetName: this.config.name,
                            targetType: this.config.type,
                        });
                    }

                    // Create a new manifest
                    this.manifest = {
                        backups: [],
                        target: {
                            name: this.config.name,
                            type: this.config.type,
                        },
                        version: container.resolve<IPackageJson>('package').version,
                    };

                } else {
                    this.logger.error(e.message);
                    throw e;
                }
            }
            await this.writeManifestToTarget();
        });
    }

    /**
     * @inheritDoc
     */
    public async addBackup(manifest: IBackupManifest): Promise<void> {
        const lastStep = getLastStep(manifest);

        const {uri} = lastStep;
        if (!(existsSync(uri) && lstatSync(uri).isFile())) {
            throw new FileNotFound(`File ${uri} doesn't exist`);
        }

        await this.moveBackupToTarget(uri, Path.basename(uri), manifest);
        await this._manifestMutex.runExclusive(async () => {
            this.manifest.backups.push(manifest);
            await this.writeManifestToTarget();
        });
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

        this.manifest.backups.splice(index, 1);
        await this.writeManifestToTarget();
    }

    public abstract toJSON(): IBackupTargetJSON;

    /**
     * Validates that the target is writeable.
     * May do things like checking for existence of directories, checking write permissions etc.
     * @protected
     */
    protected abstract isTargetWriteable(): Promise<boolean>;

    /**
     * Validates that exists on the implemented target.
     * @param {string} path The absolute path to the file.
     * @protected
     */
    protected abstract doesFileExistOnTarget(path: string): Promise<boolean>;

    /**
     * Moves the backup file from the local tmp folder to the target implementation.
     *
     * @param {string} tmpPath The absolute path of the file in the local temp folder.
     * @param {string} name The final filename of the backup on the target. (Doesn't include the container prefix).
     * @param {IBackupTargetManifest} manifest The manifest shipped with backup.
     * @protected
     */
    protected abstract moveBackupToTarget(
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
    protected abstract deleteBackupFromTarget(manifest: IBackupManifest): Promise<void>;

    /**
     * Reads the manifest from the target.
     * @protected
     */
    protected abstract readManifestFromTarget(): Promise<IBackupTargetManifest>;

    /**
     * Writes the manifest to the target
     * @protected
     */
    protected abstract writeManifestToTarget(): Promise<void>;
}
