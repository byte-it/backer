import {expect} from 'chai';
import {Backup} from './Backup';
import moment = require('moment');

describe('Backup', () => {
    describe('#fromContainer()', () => {
        it('should read the labels correctly', () => {
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
            const backup = Backup.fromContainer(testContainer);

            expect(backup.containerName).to.equal('test');
            expect(backup.containerId).to.equal('testId');
            expect(backup.interval).to.equal('* * * * *');
            expect(backup.namePattern).to.equal('test');
            expect(backup.retention).to.equal('10');
        });

        it('should apply the default labels correctly', () => {
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
            const backup = Backup.fromContainer(testContainer);
            expect(backup.interval).to.equal('0 0 * * *');
            expect(backup.namePattern).to.equal('<DATE>-<CONTAINER_NAME>');
            expect(backup.retention).to.equal('10');
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
            expect(() => Backup.fromContainer(testContainer)).to.throw(Error);
        });
    });
    describe('#createName()', () => {
        it('should replace DATE and CONTAINER_NAME correctly', () => {
            const containerId = 'TheContainerId';
            const containerName = 'TheContainerName';
            const pattern = '<DATE>-<CONTAINER_NAME>';
            const date = moment();

            // @ts-ignore
            const backup = new Backup(containerId, containerName, {
                getFileSuffix() {
                    return '.sql';
                },
            }, null, '0 0 * * *', '0', pattern);
            const expectedName = `${date.format('YYYYMMDD-hh-mm')}-${containerName}.sql`;
            expect(backup.createName(date)).to.equal(expectedName);
        });
    });
});
