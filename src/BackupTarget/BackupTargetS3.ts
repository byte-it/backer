import {container, inject, injectable} from 'tsyringe';
import {Logger} from 'winston';
import {IBackupManifest, IBackupManifestBackup} from '../IBackupManifest';
import {IBackupTargetLocalConfig} from './BackupTargetLocal';
import {IBackupTarget, IBackupTargetConfig} from './IBackupTarget';

/**
 *
 * @category Config
 */
export interface IBackupTargetS3Config extends IBackupTargetConfig {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
    s3ForcePathStyle: boolean; // needed with minio?
    signatureVersion: 'v3' | 'v4';
    bucket: string;
}

/**
 * The BackupTargetS3 saves the backups to AWS S3 or any compatible (like minio)
 * @extends IBackupTarget
 *
 * @category BackupTarget
 */
export class BackupTargetS3 implements IBackupTarget {

    /**
     * Factory
     * @param {IBackupTargetLocalConfig} config
     * @return {BackupTargetS3}
     */
    public static async createInstance(config: IBackupTargetS3Config): Promise<BackupTargetS3> {
        const target = new BackupTargetS3(
            container.resolve('Logger'),
            config,
        );
        await target.init();
        return target;
    }

    public readonly name: string = 's3';

    // private _s3Client: Client;
s
    /**
     * @constructor
     * @param {winston.logger} logger The logger instance.
     * @param {IBackupTargetLocalConfig} config
     */
    constructor(@inject('logger') private logger: Logger, private config: IBackupTargetS3Config) {
        // this._s3Client = createClient({s3Options: config});
    }

    /**
     * @inheritDoc
     */
    public async init(): Promise<void> {
        return;
    }

    public addBackup(tmpPath: string, name: string, manifest: IBackupManifestBackup): Promise<Error | void> {
        return Promise.resolve(undefined);
    }

    public getAllBackups(): Promise<IBackupManifestBackup[]> {
        return Promise.resolve([]);
    }

    public getManifest(): IBackupManifest {
        return undefined;
    }

    public removeBackup(name: string, containerName: string): Promise<void> {
        return Promise.resolve(undefined);
    }

}
