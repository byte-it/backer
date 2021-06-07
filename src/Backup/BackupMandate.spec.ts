import {expect} from 'chai';
import {IConfig} from 'config';
import {mkdirSync} from 'fs';
import * as Path from 'path';
import {container} from 'tsyringe';
import {Logger} from 'winston';
import {BackupTargetLocal} from '../BackupTarget/BackupTargetLocal';
import {BackupTargetProvider} from '../BackupTarget/BackupTargetProvider';
import {BackupMandate} from './BackupMandate';
import {DateTime} from 'luxon';
import {Queue} from '../Queue/Queue';
import {IBackupManifest} from '../IBackupManifest';
import {IBackupTargetJSON} from '../BackupTarget/IBackupTarget';
import {IBackupSourceJSON} from '../BackupSource/IBackupSource';

beforeEach(async () => {
    mkdirSync(Path.join(process.cwd(), '.tmp/targets/local'), {recursive: true});
    await container.resolve<BackupTargetProvider>(BackupTargetProvider).init();

});
describe('BackupMandate', () => {
    describe('#fromContainer()', () => {
        it('should read the labels correctly', async () => {
            container.registerInstance('target.default', await BackupTargetLocal.createInstance({
                name: 'test',
                type: 'local',
                dir: Path.join(container.resolve<IConfig>('Config').get('tmpPath'), '/targets/default'),
            }));
            // @ts-ignore
            const testContainer = {
                Config: {
                    Labels: {
                        'backer.interval': '* * * * *',
                        'backer.mysql.database': 'test',
                        'backer.mysql.password': '1234',
                        'backer.mysql.user': 'root',
                        'backer.namePattern': 'test',
                        'backer.network': 'test',
                        'backer.retention': '10',
                        'backer.type': 'mysql',
                    },
                },
                Id: 'testId',
                Name: 'test',
                NetworkSettings: {
                    Networks: {
                        test: {
                            IPAddress: '1.1.1.1',
                        },
                    },
                },
            };
            // @ts-ignore
            const backup = BackupMandate.fromContainer(testContainer);

            expect(backup.containerName).to.equal('test');
            expect(backup.containerId).to.equal('testId');
            expect(backup.interval).to.equal('* * * * *');
            expect(backup.namePattern).to.equal('test');
            expect(backup.retention).to.equal(10);

            await backup.stop();
        });

        it('should apply the default labels correctly', async () => {
            container.registerInstance('target.default', await BackupTargetLocal.createInstance({
                name: 'test',
                type: 'local',
                dir: Path.join(container.resolve<IConfig>('Config').get('tmpPath'), '/targets/default'),
            }));
            const testContainer = {
                Config: {
                    Labels: {
                        'backer.mysql.database': 'test',
                        'backer.mysql.password': '1234',
                        'backer.mysql.user': 'root',
                        'backer.network': 'test',
                        'backer.type': 'mysql',
                    },
                },
                Name: 'test',
                NetworkSettings: {
                    Networks: {
                        test: {
                            IPAddress: '1.1.1.1',
                        },
                    },
                },
            };
            // @ts-ignore
            const backup = BackupMandate.fromContainer(testContainer);
            expect(backup.interval).to.equal('0 0 * * *');
            expect(backup.namePattern).to.equal('<DATE>-<CONTAINER_NAME>');
            expect(backup.retention).to.equal(10);

            await backup.stop();
        });
        it('should throw a validation error if the labels don\'t meet the schema', () => {
            const testContainer = {
                Config: {
                    Labels: {
                        'backer.mysql.database': 'test',
                        'backer.mysql.password': '1234',
                        'backer.mysql.user': 'root',
                        'backer.network': 'test',
                    },
                },
                Name: 'test',
                NetworkSettings: {
                    Networks: {
                        test: {
                            IPAddress: '1.1.1.1',
                        },
                    },
                },
            };
            // @ts-ignore
            expect(() => BackupMandate.fromContainer(testContainer)).to.throw(Error);
        });
        it('should throw a validation error if the rention isn\'t a number', () => {
            const testContainer = {
                Config: {
                    Labels: {
                        'backer.mysql.database': 'test',
                        'backer.mysql.password': '1234',
                        'backer.mysql.user': 'root',
                        'backer.network': 'test',
                        'backer.type': 'mysql',
                        'backer.retention': 'fail',
                    },
                },
                Name: 'test',
                NetworkSettings: {
                    Networks: {
                        test: {
                            IPAddress: '1.1.1.1',
                        },
                    },
                },
            };
            // @ts-ignore
            expect(() => BackupMandate.fromContainer(testContainer)).to.throw(Error);
        });
        it('should throw an error if the target doesn\'t exists', () => {
            const testContainer = {
                Config: {
                    Labels: {
                        'backer.mysql.database': 'test',
                        'backer.mysql.password': '1234',
                        'backer.mysql.user': 'root',
                        'backer.network': 'test',
                        'backer.type': 'mysql',
                        'backer.target': 'idonotexist',
                    },
                },
                Name: 'test',
                NetworkSettings: {
                    Networks: {
                        test: {
                            IPAddress: '1.1.1.1',
                        },
                    },
                },
            };
            // @ts-ignore
            expect(() => BackupMandate.fromContainer(testContainer)).to.throw(Error);
        });
    });
    describe('#createName()', () => {
        it('should replace DATE and CONTAINER_NAME correctly', async () => {
            const containerId = 'TheContainerId';
            const containerName = 'TheContainerName';
            const pattern = '<DATE>-<CONTAINER_NAME>';
            const date = DateTime.now();

            const backup = new BackupMandate(
                container.resolve('Config'),
                container.resolve('Logger'),
                container.resolve(Queue),
                containerId,
                containerName,
                // @ts-ignore
                {
                    name: '',
                    type: '',
                    backup(manifest: IBackupManifest): Promise<IBackupManifest> {
                        return Promise.resolve(undefined);
                    },
                    getFileSuffix() {
                        return '.sql';
                    },
                    toJSON(): IBackupSourceJSON {
                        // @ts-ignore
                        return {};
                    },
                },
                // @ts-ignore
                {
                    toJSON(): IBackupTargetJSON {
                        // @ts-ignore
                        return {}
                    }
                }, '0 0 * * *', '0', pattern);
            const expectedName = `${date.toFormat('yyyyMMdd-HH-mm')}-${containerName}`;
            expect(backup.createName(date)).to.equal(expectedName);

            await backup.stop();
        });
    });

    describe('#calculateRetention', () => {
        const createMandate = () => {
            const containerId = 'TheContainerId';
            const containerName = 'TheContainerName';
            const pattern = '<DATE>-<CONTAINER_NAME>';
            const date = DateTime.now();
            const backup = new BackupMandate(
                container.resolve('Config'),
                container.resolve('Logger'),
                container.resolve(Queue),
                containerId,
                containerName,
                // @ts-ignore
                {
                    name: '',
                    type: '',
                    backup(manifest: IBackupManifest): Promise<IBackupManifest> {
                        return Promise.resolve(undefined);
                    },
                    getFileSuffix() {
                        return '.sql';
                    },
                    toJSON(): IBackupSourceJSON {
                        // @ts-ignore
                        return {};
                    },
                },
                // @ts-ignore
                {
                    toJSON(): IBackupTargetJSON {
                        // @ts-ignore
                        return {}
                    }
                },
                '0 0 * * *',
                2,
                pattern);

            return backup;
        };

        it('should not return manifests if there are less then the maximum retention number', async () => {
            const backup = createMandate();

            // @ts-ignore
            const toDelete = backup.calculateRetention([{
                name: '1',
                containerName: 'test',
                sourceName: 'test',
                date: '20200101-00-00',
            }]);

            expect(toDelete).to.be.an('array').that.is.empty;


            await backup.stop();
        });

        it('should not return manifest if there are exact as much backups as the retention says', async () => {
            const backup = createMandate();


            // @ts-ignore
            const toDelete = backup.calculateRetention([
                {
                    name: '1',
                    containerName: 'test',
                    sourceName: 'test',
                    date: '20200101-00-00',
                    steps: []
                },
                {
                    name: '2',
                    containerName: 'test',
                    sourceName: 'test',
                    date: '20200102-00-00',
                    steps: []
                }
            ]);

            expect(toDelete).to.be.an('array').that.is.empty;

            await backup.stop();
        });

        it('should return 1 manifest if there are 3 manifest and retention is 2', async () => {
            const backup = createMandate();

            // @ts-ignore
            const toDelete = backup.calculateRetention([
                {
                    name: '1',
                    containerName: 'test',
                    sourceName: 'test',
                    date: '20200101-00-00',
                    steps: [],
                },
                {
                    name: '2',
                    containerName: 'test',
                    sourceName: 'test',
                    date: '20200102-00-00',
                    steps: [],
                },
                {
                    name: '3',
                    containerName: 'test',
                    sourceName: 'test',
                    date: '20200103-00-00',
                    steps: [],
                },
            ]);

            expect(toDelete).to.have.lengthOf(1);

            await backup.stop();
        });

        it('should return the oldest manifest', async () => {
            const backup = createMandate();
            const manifests = [
                {
                    name: '1',
                    containerName: 'test',
                    sourceName: 'test',
                    date: '20200101-00-00',
                    steps: [],
                },
                {
                    name: '2',
                    containerName: 'test',
                    sourceName: 'test',
                    date: '20200102-00-00',
                    steps: [],
                },
                {
                    name: '3',
                    containerName: 'test',
                    sourceName: 'test',
                    date: '20200103-00-00',
                    steps: [],
                },
            ];
            const toDelete = backup.calculateRetention(manifests);

            expect(toDelete).to.have.members([manifests[0]]);


            await backup.stop();
        });

        it('should return the oldest two manifests', async () => {
            const backup = createMandate();
            const manifests = [
                {
                    name: '1',
                    containerName: 'test',
                    sourceName: 'test',
                    date: '20200101-00-00',
                    steps: []
                },
                {
                    name: '2',
                    containerName: 'test',
                    sourceName: 'test',
                    date: '20200102-00-00',
                    steps: []
                },
                {
                    name: '3',
                    containerName: 'test',
                    sourceName: 'test',
                    date: '20200103-00-00',
                    steps: []
                },
                {
                    name: '4',
                    containerName: 'test',
                    sourceName: 'test',
                    date: '20200104-00-00',
                    steps: []
                },
            ];
            const toDelete = backup.calculateRetention(manifests);

            expect(toDelete).to.have.members([manifests[0], manifests[1]]);

            await backup.stop();
        });

    });
});
