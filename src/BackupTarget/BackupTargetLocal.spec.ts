import {expect, use} from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs';
import * as Path from 'path';
import * as rimraf from 'rimraf';
import {container} from 'tsyringe';
import {IBackupManifest} from '../IBackupManifest';
import {BackupTargetLocal} from './BackupTargetLocal';
import {FileNotFound} from './Exceptions/FileNotFound';
import {FileNotWriteable} from './Exceptions/FileNotWriteable';

use(chaiAsPromised);

const testConfig = {type: 'local', name: 'test', dir: './tmp/test/targets/test'};
const testTargetPath = Path.join(process.cwd(), testConfig.dir);
beforeEach(() => {
    fs.mkdirSync(testTargetPath, {recursive: true});
});
afterEach(() => {
    rimraf.sync(testTargetPath);
});
describe('BackupTargetLocal', () => {
    describe('#constructor()', () => {
        it('should be constructable', () => {
            const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);
        });

        describe('backup dir', () => {
            it('should handle no trailing slashes', () => {
                const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);
                expect(target.backupDir).to.equal(testTargetPath);
            });

            it('should handle trailing slashes', () => {
                const target = new BackupTargetLocal(container.resolve('Logger'), {
                    type: 'local',
                    name: 'test',
                    dir: './tmp/test/targets/test',
                });
                expect(target.backupDir).to.equal(testTargetPath);
            });

            it('should calculate the absolute path based on cwd if the localDir is relative', () => {
                const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);
                expect(target.backupDir).to.equal(testTargetPath);
            });

            it('should write the manifest to the fs', async () => {
                const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);
                await target.init();
                const readManifest = JSON.parse(fs.readFileSync(Path.join(testTargetPath, 'manifest.json'), {encoding: 'utf-8'}));

                expect(readManifest).to.deep.equal(target.getManifest());
            });

        });
    });
    describe('#init()', () => {
        it('should throw an error if the target dir doesn\'t exist', () => {
            const target = new BackupTargetLocal(container.resolve('Logger'), {
                type: 'local',
                name: 'test',
                dir: './.tmp/targets/idontexist',
            });
            expect(target.init()).to.be.rejectedWith(Error);
        });
    });
    describe('#addBackup()', () => {

        const createBackup = async () => {
            const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);
            await target.init();
            const tmpPath = Path.join(process.cwd(), '/test/empty');
            fs.writeFileSync(tmpPath, '');
            const manifest: IBackupManifest = {
                name: 'test',
                containerName: 'test',
                date: '',
                sourceName: '',
                steps: [
                    {
                        processor: 'test',
                        uri: tmpPath,
                        fileName: Path.basename(tmpPath),
                        md5: '',
                    },
                ],
            };

            await target.addBackup(manifest);

            return {
                target,
                manifest,
            };
        };

        it('should create the the directory for the container', async () => {
            await createBackup();
            expect(fs.existsSync(Path.join(process.cwd(), '.tmp/targets/test/test'))).to.equal(true);
        });

        it('should write the backup file into the container subdirectory', async () => {
            await createBackup();

            expect(fs.existsSync(Path.join(process.cwd(), '.tmp/targets/test/test/empty'))).to.equal(true);
        });

        it('should add the backup to the manifest', async () => {
            const {target} = await createBackup();
            const manifest = target.getManifest();

            // tslint:disable-next-line:no-unused-expression
            expect(manifest.backups).to.be.an('array').that.is.not.empty;
        });

        it('should use the relative path in the manifest', async () => {
            const {target} = await createBackup();
            const manifest = target.getManifest();

            expect(manifest.backups[0].path).to.equal('test/empty');
        });

        it('should write the updated manifest to the fs', async () => {
            const {target} = await createBackup();
            const readManifest = JSON.parse(fs.readFileSync(Path.join(testTargetPath, 'manifest.json'), {encoding: 'utf-8'}));

            expect(readManifest).to.deep.equal(target.getManifest());
        });

        it('should add the backup to the manifest', async () => {
            const {target} = await createBackup();
            const manifest = target.getManifest();

            // tslint:disable-next-line:no-unused-expression
            expect(manifest.backups).to.be.an('array').that.is.not.empty;
        });

        it('should throw an error if the tmpFile doesn\'t exist', async () => {
            const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);

            const manifest: IBackupManifest = {
                name: 'test',
                containerName: 'test',
                date: '',
                sourceName: '',
                steps: [{
                    processor: 'test',
                    uri: `${process.cwd()}/idonotexist`,
                    fileName: 'test',
                    md5: '',
                }],
            };

            return expect(target.addBackup(manifest)).to.be.rejectedWith(FileNotFound);
        });

        it('should throw an error if the target file already exists', async () => {
            const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);

            const tmpPath = Path.join(process.cwd(), '/test/empty');

            const manifest: IBackupManifest = {
                name: 'empty',
                containerName: 'test',
                date: '',
                sourceName: '',
                steps: [
                    {
                        processor: 'test',
                        uri: tmpPath,
                        fileName: 'test',
                        md5: '',
                    },
                ],
            };

            fs.writeFileSync(tmpPath, '');
            fs.mkdirSync(Path.join(process.cwd(), '.tmp/targets/test/test'), {recursive: true});
            fs.writeFileSync(Path.join(process.cwd(), '/.tmp/targets/test/test/empty'), '');
            expect(target.addBackup(manifest)).to.be.rejectedWith(FileNotWriteable);

        });
    });

    // describe('#getAllBackups()');
    // describe('#deleteBackup()');
});
