import {AWSError} from 'aws-sdk';
import S3 = require('aws-sdk/clients/s3');
import * as fs from 'fs';
import * as prettyBytes from 'pretty-bytes';
import {container, inject} from 'tsyringe';
import {Logger} from 'winston';
import {IBackupManifest, IBackupTargetManifest} from '../IBackupManifest';
import {getLastStep} from '../Util';
import {BackupTargetBase} from './BackupTargetBase';
import {IBackupTargetLocalConfig} from './BackupTargetLocal';
import {FileNotFound} from './Exceptions/FileNotFound';
import {FilePermissionDenied} from './Exceptions/FilePermissionDenied';
import {ManifestInvalid} from './Exceptions/ManifestInvalid';
import {ManifestNotFound} from './Exceptions/ManifestNotFound';
import {IBackupTarget, IBackupTargetConfig, IBackupTargetJSON} from './IBackupTarget';

/**
 *
 * @category Config
 */
export interface IBackupTargetS3Config extends IBackupTargetConfig {
    /**
     * The configuration the S3 Client will be instantiated with.
     * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property }
     */
    s3Client: S3.Types.ClientConfiguration;
    /**
     * The bucket all files will be uploaded to.
     */
    bucket: string;
}

/**
 * The BackupTargetS3 saves the backups to AWS S3 or any compatible (like minio)
 * @extends IBackupTarget
 *
 * @category BackupTarget
 */
export class BackupTargetS3 extends BackupTargetBase implements IBackupTarget {

    get bucket() {
        return this._bucket;
    }

    get s3Client() {
        return this._s3Client;
    }

    /**
     * Factory
     * @param {IBackupTargetLocalConfig} config
     * @param s3Client
     * @return {BackupTargetS3}
     */
    public static async createInstance(config: IBackupTargetS3Config, s3Client?: S3): Promise<BackupTargetS3> {
        const target = new BackupTargetS3(
            container.resolve('Logger'),
            config,
            s3Client,
        );
        await target.init();
        return target;
    }

    protected config: IBackupTargetS3Config;

    protected _type = 's3';

    /**
     * The S3 instance used for all operations
     * @private
     */
    private readonly _s3Client: S3;

    /**
     * The bucket to write to.
     * @private
     */
    private readonly _bucket;

    /**
     * @constructor
     * @param {winston.logger} logger The logger instance.
     * @param {IBackupTargetLocalConfig} config
     * @param {S3} s3Client Optional, the s3 instance to use, this will ignore all S3 settings in the config object
     */
    constructor(@inject('logger') logger: Logger, config: IBackupTargetS3Config, s3Client?: S3) {
        super(logger, config);
        this._bucket = config.bucket;

        this._s3Client = s3Client == null ? new S3({computeChecksums: true, ...config.s3Client}) : s3Client;
    }

    /**
     * @inheritDoc
     */
    public async isTargetWriteable(): Promise<boolean> {
        /**
         * Check that the configured bucket exists and is writeable. Fails if not
         */
        try {
            await this._s3Client.headBucket({Bucket: this._bucket}).promise();
        } catch (e) {
            switch (e.statusCode) {
                case 403:
                    this.logger.log({
                        level: 'error',
                        message: `BackupTarget ${this.config.name} doesn't have permissions for the configured bucket.`,
                        targetName: this.config.name,
                        targetType: this.config.type,
                    });
                    break;
                case 404:
                    this.logger.log({
                        level: 'error',
                        message: `BackupTarget ${this.config.name}: The bucket doesn't exist`,
                        targetName: this.config.name,
                        targetType: this.config.type,
                    });
                    break;
                default:
                    this.logger.log({
                        level: 'error',
                        message: `BackupTarget ${this.config.name}: ${e.message}`,
                        targetName: this.config.name,
                        targetType: this.config.type,
                    });
            }
            return false;
        }
        return true;
    }

    /**
     * @inheritDoc
     */
    public async doesFileExistOnTarget(path: string): Promise<boolean> {
        try {
            await this._s3Client.headObject({
                Bucket: this._bucket,
                Key: path,
            }).promise();
        } catch (e) {
            if (e.statusCode === 403) {
                throw new FilePermissionDenied();
            }
            return false;
        }
        return true;
    }

    /**
     * @inheritDoc
     */
    public async moveBackupToTarget(
        tmpPath: string,
        name: string,
        manifest: IBackupManifest,
    ): Promise<IBackupManifest> {

        const finalPath = `${manifest.containerName}/${name}`;
        const {md5, mime} = getLastStep(manifest);

        try {
            const tmpStream = fs.createReadStream(tmpPath);
            await this._s3Client.upload({
                Body: tmpStream,
                Bucket: this._bucket,
                Key: finalPath,
                // ContentMD5: Buffer.from(md5, 'hex').toString('base64'),
                ContentType: mime,
            }).promise();

            const response = await this._s3Client.headObject({
                Bucket: this._bucket,
                Key: finalPath,
            }).promise();
            const {ContentLength, ETag} = response;

            manifest.md5 = ETag;
            manifest.path = finalPath;
            manifest.filesize = prettyBytes(ContentLength);

        } catch (e) {
            this.handleAWSError(e);
        }
        return manifest;

    }

    /**
     * @inheritDoc
     */
    public async deleteBackupFromTarget(manifest: IBackupManifest): Promise<void> {
        try {
            await this._s3Client.deleteObject({
                Bucket: this._bucket,
                Key: manifest.path,
            }).promise();
        } catch (e) {
            this.handleAWSError(e);
        }

    }

    /**
     * @inheritDoc
     */
    public async readManifestFromTarget(): Promise<IBackupTargetManifest> {
        let body = null;
        try {
            const response = await this._s3Client.getObject({
                Bucket: this._bucket,
                Key: BackupTargetS3.manifestName,
            }).promise();
            body = response.Body;
        } catch (e) {
            switch (e.statusCode) {
                case 403:
                    throw new FilePermissionDenied();
                case 404:
                    throw new ManifestNotFound();
            }
        }

        let manifestString;
        if (typeof body === 'object') {
            manifestString = body.toString('utf8');
        } else {
            manifestString = body;
        }

        try {
            return JSON.parse(manifestString) as IBackupTargetManifest;
        } catch (e) {
            throw new ManifestInvalid();
        }
    }

    /**
     * @inheritDoc
     */
    public async writeManifestToTarget(): Promise<void> {
        try {
            await this._s3Client.putObject({
                Body: JSON.stringify(this.getManifest()),
                Bucket: this._bucket,
                Key: BackupTargetS3.manifestName,
                ContentType: 'application/json',
                ContentEncoding: 'utf-8',
            }).promise();
        } catch (e) {
            this.handleAWSError(e);
        }
    }

    public toJSON(): IBackupTargetJSON & { s3: { bucket: string, endpoint: string } } {
        return {
            name: this.name,
            type: this.type,
            s3: {
                bucket: this.bucket,
                endpoint: this.config.s3Client.endpoint.toString(),
            },
        };
    }

    /**
     * Translate the AWS Error to a set of out exceptions
     *
     * @param {AWSError} e
     * @protected
     */
    protected handleAWSError(e: AWSError): void {
        switch (e.statusCode) {
            case 403:
                throw new FilePermissionDenied();
            case 404:
                throw new FileNotFound();
            default:
                throw e;
        }
    }
}
