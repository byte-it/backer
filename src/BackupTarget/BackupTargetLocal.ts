import {constants, existsSync, promises as fs} from 'fs';
import * as makeDir from 'make-dir';
import * as moveFile from 'move-file';
import * as Path from 'path';
import * as prettyBytes from 'pretty-bytes';
import {container, inject} from 'tsyringe';
import {Logger} from 'winston';
import {IBackupManifest, IBackupTargetManifest} from '../IBackupManifest';
import {getLastStep, getMd5} from '../Util';
import {BackupTargetBase} from './BackupTargetBase';
import {FileNotWriteable} from './Exceptions/FileNotWriteable';
import {ManifestNotFound} from './Exceptions/ManifestNotFound';
import {IBackupTarget, IBackupTargetConfig, IBackupTargetJSON} from './IBackupTarget';

/**
 * The configuration of the BackupTargetLocal.
 * @category Config
 */
export interface IBackupTargetLocalConfig extends IBackupTargetConfig {
    /**
     * The local directory where to store the backups. Can be absolute or relative to the cwd.
     */
    dir: string;
}

/**
 * The BackupTargetLocal saves the backups to a destination in the local filesystem.
 * @extends IBackupTarget
 *
 * @category BackupTarget
 */
export class BackupTargetLocal extends BackupTargetBase implements IBackupTarget {

    /**
     * Factory
     * @param {IBackupTargetLocalConfig} config
     * @return {BackupTargetLocal}
     */
    public static async createInstance(config: IBackupTargetLocalConfig): Promise<BackupTargetLocal> {
        const target = new BackupTargetLocal(
            container.resolve('Logger'),
            config,
        );
        await target.init();
        return target;
    }

    protected _type = 'local';

    get backupDir(): string {
        return this._backupDir;
    }

    /**
     * @property _backupDir The path to the directory to store the backups in
     */
    private readonly _backupDir: string;

    /**
     * @private The manifest managed by this target instance
     */
    private _manifest: IBackupTargetManifest;

    /**
     * @constructor
     * @param {winston.logger} logger The logger instance.
     * @param {IBackupTargetLocalConfig} config
     */
    constructor(@inject('Logger') logger: Logger, config: IBackupTargetLocalConfig) {
        super(logger, config);
        if (Path.isAbsolute(config.dir)) {
            this._backupDir = String().replace(/\/+$/, '');
        } else {
            this._backupDir = String().replace(/\/+$/, '');
        }
        const calculatedPath = Path.isAbsolute(config.dir) ?
            Path.normalize(config.dir) :
            Path.join(process.cwd(), config.dir);

        // Remove the training slash
        this._backupDir = String(calculatedPath).replace(/\/+$/, '');
    }

    public toJSON(): IBackupTargetJSON & { local: { path: string } } {
        return {
            name: this.name,
            type: this.type,
            local: {
                path: this._backupDir,
            },
        };
    }

    /**
     * @inheritDoc
     */
    protected async isTargetWriteable(): Promise<boolean> {
        if (existsSync(this._backupDir)) {
            try {
                await fs.access(this._backupDir, constants.W_OK);
            } catch (e) {
                this.logger.log({
                    level: 'error',
                    message: `BackupTarget ${this.config.name}: The directory ${this._backupDir} isn't writeable.`,
                    targetName: this.config.name,
                    targetType: this.config.type,
                });
                return false;
            }
            return true;
        }
        this.logger.log({
            level: 'error',
            message: `BackupTarget ${this.config.name}: The directory ${this._backupDir} doesn't exist.`,
            targetName: this.config.name,
            targetType: this.config.type,
        });
        return false;
    }

    /**
     * @inheritDoc
     */
    protected doesFileExistOnTarget(path: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    /**
     * @inheritDoc
     */
    protected async moveBackupToTarget(
        tmpPath: string,
        name: string,
        manifest: IBackupManifest,
    ): Promise<IBackupManifest> {

        const containerPath = Path.join(this._backupDir, manifest.containerName);
        const finalTargetPath = Path.join(containerPath, name);

        if (existsSync(finalTargetPath)) {
            throw new FileNotWriteable(`File ${finalTargetPath} already exists`);
        }

        if (!existsSync(containerPath)) {
            await makeDir(containerPath);
        }

        const md5Hash = await getMd5(tmpPath);

        await moveFile(tmpPath, finalTargetPath);


        if (md5Hash !== getLastStep(manifest).md5) {
            throw new Error(`File ${tmpPath} corrupted on movement to target location ${finalTargetPath}`);
        }

        const {size} = await fs.stat(finalTargetPath);

        // The current finalTargetPath maybe absolute or relative to the cwd. We want the path to be relative to the manifest.
        manifest.path = Path.relative(this._backupDir, finalTargetPath);
        manifest.md5 = md5Hash;
        manifest.filesize = prettyBytes(size);

        return manifest;
    }

    /**
     * @inheritDoc
     */
    protected async deleteBackupFromTarget(manifest: IBackupManifest): Promise<void> {
        const path = Path.join(this._backupDir, manifest.path);
        await fs.rm(path);
    }

    /**
     * @inheritDoc
     */
    protected async readManifestFromTarget(): Promise<IBackupTargetManifest> {
        const manifestPath = Path.join(this._backupDir, 'manifest.json');
        try {
            const readManifest = await fs.readFile(manifestPath, {encoding: 'utf-8'});
            if (typeof readManifest === 'string') {
                return JSON.parse(readManifest) as IBackupTargetManifest;
            }
        } catch (e) {
            throw new ManifestNotFound();
        }
    }

    /**
     * @inheritDoc
     */
    protected async writeManifestToTarget(): Promise<void> {
        await fs.writeFile(Path.join(this._backupDir, 'manifest.json'), JSON.stringify(this.manifest), {flag: 'w+'});
    }

}
