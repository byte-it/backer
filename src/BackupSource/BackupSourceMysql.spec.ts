import {expect} from 'chai';
import * as Path from 'path';
import {Config} from '../Config';
import {BackupSourceMysql} from './BackupSourceMysql';

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
        it('should extract the options', () => {
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
                        'backer.mysql.options.optionkey': 'Text:optionvalue',
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

            expect(source.options).to.include({
                optionkey: 'optionvalue',
            });
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
            const {cmd} = source.createDumpCmd('thedumpname.sql');
            const expectedCommand = `mysqldump --host="thedbhost" --user="$DB_USER" --password="$DB_PASSWORD" thedb > ${process.cwd()}/tmp/thedumpname.sql`;
            expect(cmd).to.equal(expectedCommand);
        });
        it('should handle multiple databases correctly', () => {
            const source = new BackupSourceMysql(
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                ['thedb1', 'thedb2'],
            );
            const {cmd} = source.createDumpCmd('thedumpname.sql');
            const expectedCommand = `mysqldump --host="thedbhost" --user="$DB_USER" --password="$DB_PASSWORD" --databases thedb1 thedb2 > ${process.cwd()}/tmp/thedumpname.sql`;
            expect(cmd).to.equal(expectedCommand);
        });
        it('should add the an absolute path to the command', () => {
            const source = new BackupSourceMysql(
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                ['thedb1', 'thedb2'],
            );
            const {cmd} = source.createDumpCmd('thedumpname.sql');
            const [, path] = cmd.match(/> (.*)$/);
            expect(Path.isAbsolute(path)).to.equal(true);
        });
        it('should include the secrets in the env', () => {
            const source = new BackupSourceMysql(
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                ['thedb1', 'thedb2'],
            );
            const {env} = source.createDumpCmd('thedumpname.sql');
            expect(env).to.include({DB_USER: 'thedbuser', DB_PASSWORD: 'thedbpassword'});
        });
        it('shouldn\'t write the secrets to the cmd string', () => {
            const source = new BackupSourceMysql(
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                ['thedb1', 'thedb2'],
            );
            const {cmd} = source.createDumpCmd('thedumpname.sql');
            expect(cmd).to.not.match(/(thedbuser|thedbpassword)/g);
        });
        it('should include the additional options', () => {
            const source = new BackupSourceMysql(
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                ['thedb1', 'thedb2'],
                {
                    optionkey: 'optionvalue',
                },
            );

            const {cmd} = source.createDumpCmd('thedumpname.sql');
            expect(cmd).to.match(/(--optionkey="optionvalue")/);
        });
        it('should set the ignored tables');
        it('should set the included tables');
        it('should skip the included tables if multiple databases set');
        it('should skip the included tables if ignored tables are set');
    });
});
