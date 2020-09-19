import * as fs from 'fs';
import * as makeDir from 'make-dir';
import * as moveFile from 'move-file';
import * as Path from 'path';
import {container, inject, registry} from 'tsyringe';
import {Logger} from 'winston';
import {IBackupManifest, IBackupManifestBackup} from '../IBackupManifest';
import {IBackupTarget, IBackupTargetConfig} from './IBackupTarget';
import Lifecycle from 'tsyringe/dist/typings/types/lifecycle';
import {Config} from '../Config';

/**
 * The configuration of the BackupTargetLocal.
 */
export interface IBackupTargetLocalConfig extends IBackupTargetConfig {
    /**
     * The local directory where to store the backups. Can be absolute or relative to the cwd.
     */
    dir: string;
}

/**
 * The BackupTargetLocal saves the backups to a destination in the local filesystem.
 */
@registry([{
    token: 'target.local',
    useClass: BackupTargetLocal,
}])
export class BackupTargetLocal implements IBackupTarget {

    public static createInstance(config: IBackupTargetLocalConfig): BackupTargetLocal {
        return new BackupTargetLocal(
            container.resolve('Logger'),
            config,
        );
    }

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
    private readonly _manifest: IBackupManifest;

    /**
     * @param logger
     * @param config
     */
    constructor(@inject('Logger') private logger: Logger, config: IBackupTargetLocalConfig) {

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

        if (fs.existsSync(this._backupDir)) {
            const manifestPath = Path.join(this._backupDir, 'manifest.json');
            if (fs.existsSync(Path.join(this._backupDir, 'manifest.json'))) {
                const readManifest = fs.readFileSync(manifestPath, {encoding: 'utf-8'});
                if (typeof readManifest === 'string') {
                    this._manifest = JSON.parse(readManifest) as IBackupManifest;
                }
            } else {
                this.logger.log({
                    level: 'info',
                    message: `BackupTarget ${config.name}: The configured directory doesn't include a manifest file, a new one will be created`,
                    targetName: config.name,
                    targetType: config.type,
                });

                this._manifest = {
                    backups: [],
                    target: {
                        name: config.name,
                        type: 'local',
                    },
                };

                this.writeManifest();
            }
        } else {
            this.logger.log({
                level: 'error',
                message: `BackupTarget ${config.name}: The directory ${this._backupDir} doesn't exist.`,
                targetName: config.name,
                targetType: config.type,
            });
            throw new Error('Dir does nit exist');
        }
    }

    /**
     * @inheritDoc
     */
    public async addBackup(tmpPath: string, name: string, manifest: IBackupManifestBackup): Promise<void> {
        if (!(fs.existsSync(tmpPath) && fs.lstatSync(tmpPath).isFile())) {
            throw new Error(`File ${tmpPath} doesn't exist`);
        }

        const containerPath = Path.join(this._backupDir, manifest.containerName);
        const filePath = Path.join(containerPath, name);

        if (fs.existsSync(filePath)) {
            throw new Error(`File ${filePath} already exists`);
        }

        if (!fs.existsSync(containerPath)) {
            await makeDir(containerPath);
        }

        await moveFile(tmpPath, filePath);

        // The current filePath maybe absolute or relative to the cwd. We want the path to be relative to the manifest.
        manifest.path = Path.relative(this._backupDir, filePath);

        this.addBackupToManifest(manifest);

        return;
    }

    /**
     * @inheritDoc
     */
    public async getAllBackups(): Promise<IBackupManifestBackup[]> {
        return this._manifest.backups;
    }

    /**
     * @inheritDoc
     */
    public async removeBackup(name: string, containerName: string): Promise<void> {
        // @todo: Implement
        return;
    }

    public getManifest(): IBackupManifest {
        return this._manifest;
    }

    /**
     * Add the backupManifest to the list of backups hold by the manifest.
     * @param backupManifest
     * @protected
     */
    protected addBackupToManifest(backupManifest: IBackupManifestBackup) {
        this._manifest.backups.push(backupManifest);

        this.writeManifest();
    }

    protected writeManifest() {
        fs.writeFileSync(Path.join(this._backupDir, 'manifest.json'), JSON.stringify(this._manifest), {flag: 'w+'});
    }

}
