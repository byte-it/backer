import {expect} from 'chai';
import {BackupSourceMysql} from './BackupSourceMysql';
import {Config} from '../Config';
import * as Path from 'path';

describe('BackupSourceMysql', () => {
    describe('#fromContainer()', () => {
        it('should throw an error if the mysql user is missing', () => {
            expect(() => BackupSourceMysql.fromContainer(null)).to.throw(Error);
        });
        it('should throw an error if the host can\'t be found', () => {
            expect(() => BackupSourceMysql.fromContainer(null)).to.throw(Error);
        });
        it('should throw an error if some required label is missing', () => {
            expect(() => BackupSourceMysql.fromContainer(null)).to.throw(Error);
        });
        it('should prefer blacklist over whitelist', () => {

            const testContainer = {
                Config: {
                    Labels: {
                        'backer.interval': '* * * * * *',
                        'backer.namePattern': 'test',
                        'backer.network': 'test',
                        'backer.retention': '10',
                        'backer.type': 'mysql',
                        'backer.mysql.user': 'root',
                        'backer.mysql.password': '1234',
                        'backer.mysql.database': 'test',
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
            const source = BackupSourceMysql.fromContainer(testContainer);
            // @ts-ignore
            expect(source.includeTablesList).to.equal(null);
        });
        it('should read all labels correctly', () => {

            const testContainer = {
                Config: {
                    Labels: {
                        'backer.interval': '* * * * * *',
                        'backer.namePattern': 'test',
                        'backer.network': 'test',
                        'backer.retention': '10',
                        'backer.type': 'mysql',
                        'backer.mysql.user': 'root',
                        'backer.mysql.password': '1234',
                        'backer.mysql.database': 'test',
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
            const source = BackupSourceMysql.fromContainer(testContainer);
            // @ts-ignore
            expect(source.includeTablesList).to.equal(null);
        });
    });
    describe('#constructor()', () => {
        it('should initialize correctly');
        it('should prefer blacklist over whitelist');
    });
    describe('#createDumpCmd()', () => {
        it('should include all basic options', () => {
            const source = new BackupSourceMysql(
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                'thedb',
            );
            const command = source.createDumpCmd('thedumpname.sql');
            const expectedCommand = `mysqldump --host="thedbhost" --user="thedbuser" --password="thedbpassword" thedb > ${process.cwd()}/tmp/thedumpname.sql`;
            expect(command).to.equal(expectedCommand);
        });
        it('should handle multiple databases correctly', () => {
            const source = new BackupSourceMysql(
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                ['thedb1', 'thedb2'],
            );
            const command = source.createDumpCmd('thedumpname.sql');
            const expectedCommand = `mysqldump --host="thedbhost" --user="thedbuser" --password="thedbpassword" --databases thedb1 thedb2 > ${process.cwd()}/tmp/thedumpname.sql`;
            expect(command).to.equal(expectedCommand);
        });
        it('should add the an absolute path to the command', () => {
            const source = new BackupSourceMysql(
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                ['thedb1', 'thedb2'],
            );
            const command = source.createDumpCmd('thedumpname.sql');
            const [, path] = command.match(/> (.*)$/);
            expect(Path.isAbsolute(path)).to.equal(true);
        });
        it('should include the additional options');
        it('should set the ignored tables');
        it('should set the included tables');
        it('should skip the included tables if multiple databases set');
        it('should skip the included tables if ignored tables are set');
    });
});
