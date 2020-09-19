import {expect, use} from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs';
import * as Path from 'path';
import * as rimraf from 'rimraf';
import {BackupTargetLocal} from './BackupTargetLocal';
import {container} from 'tsyringe';

use(chaiAsPromised);

const testConfig = {type: 'local', name: 'test', dir: './.tmp/targets/test'};
beforeEach(() => {
    fs.mkdirSync(Path.join(process.cwd(), '.tmp/targets/test'), {recursive: true});
});
afterEach(() => {
    rimraf.sync(`${process.cwd()}/.tmp/`);
});
describe('BackupTargetLocal', () => {
    describe('#constructor()', () => {
        it('should be constructable', () => {
            const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);
        });

        describe('backup dir', () => {
            it('should handle no trailing slashes', () => {
                const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);
                expect(target.backupDir).to.equal(Path.join(process.cwd(), '.tmp/targets/test'));
            });

            it('should handle trailing slashes', () => {
                const target = new BackupTargetLocal(container.resolve('Logger'), {
                    type: 'local',
                    name: 'test',
                    dir: './.tmp/targets/test/'
                });
                expect(target.backupDir).to.equal(Path.join(process.cwd(), '.tmp/targets/test'));
            });

            it('should calculate the absolute path based on cwd if the localDir is relative', () => {
                const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);
                expect(target.backupDir).to.equal(Path.join(process.cwd(), '.tmp/targets/test'));
            });

            it('should write the manifest to the fs', () => {
                const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);

                const readManifest = JSON.parse(fs.readFileSync(Path.join(process.cwd(), '.tmp/targets/test/manifest.json'), {encoding: 'utf-8'}));

                expect(readManifest).to.deep.equal(target.getManifest());
            });

            it('should throw an error if the target dir doesn\'t exist', () => {
                expect(
                    () => new BackupTargetLocal(container.resolve('Logger'), {
                        type: 'local',
                        name: 'test',
                        dir: './.tmp/targets/idontexist'
                    }),
                ).to.throw(Error);
            });
        });
    });

    describe('#addBackup()', () => {

        const createBackup = async () => {
            const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);

            const manifest = {
                name: 'test',
                containerName: 'test',
                date: '',
                sourceName: '',
            };

            const tmpPath = Path.join(process.cwd(), '/test/empty');
            fs.writeFileSync(tmpPath, '');
            await target.addBackup(tmpPath, 'empty', manifest);

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

            expect(manifest.backups).to.be.an('array').that.is.not.empty;
        });

        it('should use the relative path in the manifest', async () => {
            const {target} = await createBackup();
            const manifest = target.getManifest();

            expect(manifest.backups[0].path).to.equal('test/empty');
        });

        it('should write the updated manifest to the fs', async () => {
            const {target} = await createBackup();
            const readManifest = JSON.parse(fs.readFileSync(Path.join(process.cwd(), '.tmp/targets/test/manifest.json'), {encoding: 'utf-8'}));

            expect(readManifest).to.deep.equal(target.getManifest());
        });

        it('should add the backup to the manifest', async () => {
            const {target} = await createBackup();
            const manifest = target.getManifest();

            expect(manifest.backups).to.be.an('array').that.is.not.empty;
        });

        it('should throw an error if the tmpFile doesn\'t exist', async () => {
            const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);

            const manifest = {
                name: 'test',
                containerName: 'test',
                date: '',
                sourceName: '',
            };

            return expect(target.addBackup(`${process.cwd()}/idonotexist`, 'test', manifest)).to.be.rejectedWith(Error);
        });

        it('should throw an error if the target file already exists', async () => {
            const target = new BackupTargetLocal(container.resolve('Logger'), testConfig);

            const manifest = {
                name: 'test',
                containerName: 'test',
                date: '',
                sourceName: '',
            };

            const tmpPath = Path.join(process.cwd(), '/test/empty');
            fs.writeFileSync(tmpPath, '');
            fs.mkdirSync(Path.join(process.cwd(), '.tmp/targets/test/test'), {recursive: true});
            fs.writeFileSync(Path.join(process.cwd(), '/.tmp/targets/test/test/empty'), '');
            expect(target.addBackup(tmpPath, 'empty', manifest)).to.be.rejectedWith(Error);

        });
    });

    // describe('#getAllBackups()');
    // describe('#deleteBackup()');
});
