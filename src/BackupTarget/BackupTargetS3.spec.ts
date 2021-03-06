import * as AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import {expect, use} from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {IConfig} from 'config';
import * as fs from 'fs';
import * as Path from 'path';
import {container} from 'tsyringe';
import {IBackupManifest, IBackupTargetManifest} from '../IBackupManifest';
import {BackupTargetS3, IBackupTargetS3Config} from './BackupTargetS3';
import {FileNotFound} from './Exceptions/FileNotFound';
import {FilePermissionDenied} from './Exceptions/FilePermissionDenied';

use(chaiAsPromised);

const targetPath = Path.join(process.cwd(), '.tmp/test/targets/s3');

beforeEach(() => {
    fs.mkdirSync(targetPath, {recursive: true});
});
afterEach(() => {
    // rimraf.sync(container.resolve<IConfig>('Config').get('tmpPath'));
});

describe('BackupTargetS3', () => {
    describe('#constructor', () => {
        it('should set the s3Client, bucket and name', () => {
            const targetConfig: IBackupTargetS3Config = {
                type: 's3',
                name: 'test',
                bucket: 'test',
                s3Client: {},
            };
            const target = new BackupTargetS3(container.resolve('Logger'), targetConfig);

            expect(target.bucket).to.equal('test');
            expect(target.name).to.equal('test');
            expect(target.s3Client).to.be.an.instanceof(AWS.S3);
        });
    });
    describe('#createInstance', () => {
        it('should return a promise', () => {
            AWSMock.setSDKInstance(AWS);
            AWSMock.mock('S3', 'headBucket', () => {
                return {};
            });
            AWSMock.mock('S3', 'putObject', () => {
                return {};
            });
            const targetConfig: IBackupTargetS3Config = {
                type: 's3',
                name: 'test',
                bucket: 'test',
                s3Client: {},
            };
            const s3Client = new AWS.S3({});
            const promise = BackupTargetS3.createInstance(targetConfig, s3Client);
            expect(promise).to.be.an.instanceof(Promise);
            AWSMock.restore('S3');
        });
        it('should return a Promise resolving to an instance of BackupTargetS3', async () => {
            const expectedManifest: IBackupTargetManifest = {
                target: {
                    name: 's3',
                    type: 's3',
                },
                backups: [],
                version: '0.0.1',
            };
            AWSMock.mock('S3', 'headBucket', (params, callback) => {
                callback(null, {});
            });
            AWSMock.mock('S3', 'putObject', (params, callback) => {
                callback(null, {});
            });
            AWSMock.mock('S3', 'getObject', (params, callback) => {
                if (params.Key === 'manifest.json') {
                    callback(null, {
                        Body: JSON.stringify(expectedManifest),
                    });
                } else {
                    callback(null, {});
                }
            });
            const targetConfig: IBackupTargetS3Config = {
                type: 's3',
                name: 'test',
                bucket: 'test',
                s3Client: {},
            };

            const s3Client = new AWS.S3({});
            const instance = await BackupTargetS3.createInstance(targetConfig, s3Client);

            expect(instance).to.be.an.instanceof(BackupTargetS3);

            AWSMock.restore('S3');
            return;
        });
    });

    describe('#isTargetWriteable', () => {
        // Default config for all tests
        const targetConf: IBackupTargetS3Config = {
            type: 's3',
            name: 'test',
            bucket: 'test',
            s3Client: {},
        };

        it('should return true if the the head request doesn\'t fail', async () => {
            AWSMock.mock('S3', 'headBucket', (params, callback) => {
                callback(null, {});
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConf, s3Client);
            const isWriteable = await instance.isTargetWriteable();

            expect(isWriteable).to.equal(true);

            AWSMock.restore('S3');
            return;
        });

        it('should return false if the request fails with a 404', async () => {
            AWSMock.mock('S3', 'headBucket', (params, callback) => {
                callback({statusCode: 404}, null);
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConf, s3Client);
            const isWriteable = await instance.isTargetWriteable();

            expect(isWriteable).to.equal(false);

            AWSMock.restore('S3');
            return;
        });

        it('should return false if the request fails with a 403', async () => {
            AWSMock.mock('S3', 'headBucket', (params, callback) => {
                callback({statusCode: 403}, null);
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConf, s3Client);
            const isWriteable = await instance.isTargetWriteable();

            expect(isWriteable).to.equal(false);

            AWSMock.restore('S3');
            return;
        });

        it('should return false if the request fails with anything', async () => {
            AWSMock.mock('S3', 'headBucket', (params, callback) => {
                callback({}, null);
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConf, s3Client);
            const isWriteable = await instance.isTargetWriteable();

            expect(isWriteable).to.equal(false);

            AWSMock.restore('S3');
            return;
        });
    });

    describe('#doesFileExistOnTarget', () => {
        // Default config for all tests
        const targetConfig: IBackupTargetS3Config = {
            type: 's3',
            name: 'test',
            bucket: 'test',
            s3Client: {},
        };
        it('should return true if the file exists (no error)', async () => {
            AWSMock.mock('S3', 'headObject', (params, callback) => {
                callback(null, {});
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConfig, s3Client);
            const isWriteable = await instance.doesFileExistOnTarget('test');

            expect(isWriteable).to.equal(true);

            AWSMock.restore('S3');
            return;
        });

        it('should return false if the file don\'t exists', async () => {
            AWSMock.mock('S3', 'headObject', (params, callback) => {
                callback({statusCode: 404}, null);
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConfig, s3Client);
            const isWriteable = await instance.doesFileExistOnTarget('test');

            expect(isWriteable).to.equal(false);

            AWSMock.restore('S3');
            return;
        });
        it('should throw an exception if the file exists but isn\'t accessible', async () => {
            AWSMock.mock('S3', 'headObject', (params, callback) => {
                callback({statusCode: 403}, null);
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConfig, s3Client);
            expect(instance.doesFileExistOnTarget('test')).to.be.rejectedWith(FilePermissionDenied);

            AWSMock.restore('S3');
            return;
        });
    });
    describe('#moveBackupToTarget', () => {
        const targetConf: IBackupTargetS3Config = {
            type: 's3',
            name: 'test',
            bucket: 'test',
            s3Client: {},
        };

        it('should write the given file to the bucket', async () => {
            AWSMock.mock('S3', 'upload', (params, callback) => {
                callback(null, {});
            });
            AWSMock.mock('S3', 'putObject', (params, callback) => {
                callback(null, {});
            });

            AWSMock.mock('S3', 'headObject', (params, callback) => {
                callback(null, {ContentLength: 0});
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConf, s3Client);
            const tmpPath = Path.join(targetPath, 'empty');
            fs.writeFileSync(tmpPath, 'test');

            const manifest: IBackupManifest = {
                uuid: '1',
                name: 'test',
                containerName: 'test',
                date: '',
                sourceName: '',
                filesize: null,
                mime: 'text/plain',
                steps: [{
                    processor: 'test',
                    uri: tmpPath,
                    fileName: Path.basename(tmpPath),
                    md5: 'd41d8cd98f00b204e9800998ecf8427e',
                    filesize: '0',
                    mime: 'text/plain',
                }],
            };

            await instance.moveBackupToTarget(tmpPath, 'empty', manifest);

            AWSMock.restore('S3');
            return;
        });
        it('should throw an error if the file can\'t be written to the bucket', async () => {
            AWSMock.mock('S3', 'putObject', (params, callback) => {
                callback({statusCode: 403}, null);
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConf, s3Client);
            const manifest: IBackupManifest = {
                steps: [],
                name: 'test',
                containerName: 'test',
                date: '',
                sourceName: '',
            };

            const tmpPath = Path.join(container.resolve<IConfig>('Config').get('tmpPath'), '/s3/empty');
            fs.writeFileSync(tmpPath, 'test');
            expect(instance.moveBackupToTarget(tmpPath, 'empty', manifest)).to.be.rejectedWith(FilePermissionDenied);
        });
        it('should return the manifest with the correct final path', async () => {
            return;
        });
    });

    describe('#removeBackupFromTarget', () => {
        const targetConfig: IBackupTargetS3Config = {
            type: 's3',
            name: 'test',
            bucket: 'test',
            s3Client: {},
        };

        it('should delete the given file to the bucket', async () => {
            AWSMock.mock('S3', 'deleteObject', (params, callback) => {
                expect(params.Key).to.equal('test/test.test');
                callback(null, {});
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConfig, s3Client);
            const manifest: IBackupManifest = {
                name: 'test.test',
                containerName: 'test',
                date: '',
                sourceName: '',
                path: 'test/test.test',
                steps: [],
            };

            await instance.deleteBackupFromTarget(manifest);

            AWSMock.restore('S3');
            return;
        });
        it('should throw an error if the given file doesn\'t exists on the bucket', async () => {
            AWSMock.mock('S3', 'deleteObject', (params, callback) => {
                callback({statusCode: 404}, null);
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConfig, s3Client);
            const manifest: IBackupManifest = {
                name: 'test.test',
                containerName: 'test',
                date: '',
                sourceName: '',
                path: 'test/test.test',
                steps: [],
            };
            expect(instance.deleteBackupFromTarget(manifest)).to.be.rejectedWith(FileNotFound);
            AWSMock.restore('S3');
            return;
        });

        it('should throw an error if the given file isn\'t deletable/accessible', async () => {
            AWSMock.mock('S3', 'deleteObject', (params, callback) => {
                callback({statusCode: 403}, null);
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConfig, s3Client);
            const manifest: IBackupManifest = {
                name: 'test.test',
                containerName: 'test',
                date: '',
                sourceName: '',
                path: 'test/test.test',
                steps: [],
            };
            return expect(instance.deleteBackupFromTarget(manifest)).to.be.rejectedWith(FilePermissionDenied);
        });
    });

    describe('#readManifestFromTarget', () => {
        const targetConfig: IBackupTargetS3Config = {
            type: 's3',
            name: 'test',
            bucket: 'test',
            s3Client: {},
        };
        const expectedManifest: IBackupTargetManifest = {
            target: {
                name: 's3',
                type: 's3',
            },
            backups: [],
            version: '0.0.1',
        };
        it('should read the manifest from the bucket', async () => {

            AWSMock.mock('S3', 'getObject', (params, callback) => {
                expect(params.Key).to.equal('manifest.json');
                callback(null, {Body: JSON.stringify(expectedManifest)});
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConfig, s3Client);
            expect(await instance.readManifestFromTarget()).to.deep.equal(expectedManifest);
            AWSMock.restore('S3');
            return;
        });

        it('should throw an error if the manifest doesn\'t exists on the bucket', async () => {
            AWSMock.mock('S3', 'getObject', (params, callback) => {
                callback({statusCode: 404}, null);
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConfig, s3Client);
            expect(instance.readManifestFromTarget()).to.be.rejectedWith(FileNotFound);
            AWSMock.restore('S3');
            return;
        });

        it('should throw an error if the manifest isn\'t accessible on the bucket', async () => {
            AWSMock.mock('S3', 'getObject', (params, callback) => {
                callback({statusCode: 403}, null);
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConfig, s3Client);
            return expect(instance.readManifestFromTarget()).to.be.rejectedWith(FilePermissionDenied);
        });
    });

    describe('#writeManifestToTarget', () => {
        const targetConfig: IBackupTargetS3Config = {
            type: 's3',
            name: 'test',
            bucket: 'test',
            s3Client: {},
        };
        const expectedManifest: IBackupTargetManifest = {
            target: {
                name: 's3',
                type: 's3',
            },
            backups: [],
            version: '0.0.1',
        };
        it('should write the manifest to the bucket', async () => {
            AWSMock.mock('S3', 'putObject', (params, callback) => {
                expect(params.Key).to.equal('manifest.json');
                expect(params.Body).to.equal(JSON.stringify(expectedManifest));
                callback(null, {});
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConfig, s3Client);
            // @ts-ignore
            instance.manifest = expectedManifest;
            await instance.writeManifestToTarget();
            AWSMock.restore('S3');
            return;
        });
        it('should throw an error if the manifest isn\'t writeable on the bucket', async () => {
            AWSMock.mock('S3', 'putObject', (params, callback) => {
                callback({statusCode: 403}, null);
            });

            const s3Client = new AWS.S3({});

            const instance = new BackupTargetS3(container.resolve('Logger'), targetConfig, s3Client);
            return expect(instance.writeManifestToTarget()).to.eventually.be.rejectedWith(FilePermissionDenied);
        });
    });
});
