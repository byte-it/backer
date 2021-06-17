import {expect} from 'chai';
import {IConfig} from 'config';
import * as Path from 'path';
import {container} from 'tsyringe';
import {extractLabels} from '../Util';
import {BackupSourceMysql} from './BackupSourceMysql';

describe('BackupSourceMysql', () => {
    describe('#fromContainer()', () => {
        it('should throw an error if the mysql user is missing', () => {
            // @ts-ignore
            expect(() => BackupSourceMysql.fromContainer(null, {})).to.throw(Error);
        });
        it('should throw an error if the host can\'t be found', () => {
            // @ts-ignore
            expect(() => BackupSourceMysql.fromContainer(null, {})).to.throw(Error);
        });
        it('should throw an error if some required label is missing', () => {
            // @ts-ignore
            expect(() => BackupSourceMysql.fromContainer(null, {})).to.throw(Error);
        });
        it('should prefer ignore list over include list', () => {

            const testContainer = {
                Config: {
                    Labels: {
                        'backer.interval': '* * * * * *',
                        'backer.name_pattern': 'test',
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
            const source = BackupSourceMysql.fromContainer(testContainer, extractLabels(testContainer.Config.Labels));
            // @ts-ignore
            expect(source.includeTablesList).to.equal(null);
        });
        it('should read all labels correctly', () => {

            const testContainer = {
                Config: {
                    Labels: {
                        'backer.interval': '* * * * * *',
                        'backer.name_pattern': 'test',
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
            const source = BackupSourceMysql.fromContainer(testContainer,  extractLabels(testContainer.Config.Labels));
            // @ts-ignore
            expect(source.includeTablesList).to.equal(null);
        });
        it('should extract the options', () => {
            const testContainer = {
                Config: {
                    Labels: {
                        'backer.interval': '* * * * * *',
                        'backer.name_pattern': 'test',
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
            const source = BackupSourceMysql.fromContainer(testContainer, extractLabels(testContainer.Config.Labels));

            expect(source.options).to.include({
                optionkey: 'optionvalue',
            });
        });
        it('should extract the data ignore tables', () => {
            const testContainer = {
                Config: {
                    Labels: {
                        'backer.interval': '* * * * * *',
                        'backer.name_pattern': 'test',
                        'backer.network': 'test',
                        'backer.retention': '10',
                        'backer.type': 'mysql',
                        'backer.mysql.user': 'root',
                        'backer.mysql.password': '1234',
                        'backer.mysql.database': 'test',
                        'backer.mysql.ignore_data': 'ignore1, ignore2 ,ignore3 ',
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
            const source = BackupSourceMysql.fromContainer(testContainer, extractLabels(testContainer.Config.Labels));

            expect(source.ignoreDataTableList).to.include('ignore1');
            expect(source.ignoreDataTableList).to.include('ignore2');
            expect(source.ignoreDataTableList).to.include('ignore3');
        });
    });
    describe('#constructor()', () => {
        it('should prefer ignore over include list', () => {
            const source = new BackupSourceMysql(
                'test',
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                'thedb1',
                {},
                ['table1'],
                ['table1', 'table2'],
            );

            // tslint:disable-next-line:no-unused-expression
            expect(source.includeTablesList).to.be.null;
        });
    });
    describe('#createDumpCmd()', () => {
        it('should include all basic options', () => {
            const source = new BackupSourceMysql(
                'test',
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                'thedb',
            );
            const tmpPath = Path.join(process.cwd(), container.resolve<IConfig>('Config').get<string>('tmpPath'));
            const {cmd} = source.createDumpCmd('thedumpname', tmpPath);
            const expectedPath = Path.resolve(tmpPath, 'thedumpname.sql');
            const expectedCommand = `mysqldump --host="thedbhost" --user="$DB_USER" --password="$DB_PASSWORD" thedb > ${expectedPath}`;
            expect(cmd).to.equal(expectedCommand);
        });

        it('should add the an absolute path to the command', () => {
            const source = new BackupSourceMysql(
                'test',
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                'thedb1',
            );
            const tmpPath = Path.join(process.cwd(), container.resolve<IConfig>('Config').get<string>('tmpPath'));

            const {cmd} = source.createDumpCmd('thedumpname.sql', tmpPath);
            const [, path] = cmd.match(/> (.*)$/);
            expect(Path.isAbsolute(path)).to.equal(true);
        });
        it('should include the secrets in the env', () => {
            const source = new BackupSourceMysql(
                'test',
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                'thedb1',
            );
            const tmpPath = Path.join(process.cwd(), container.resolve<IConfig>('Config').get<string>('tmpPath'));

            const {env} = source.createDumpCmd('thedumpname.sql', tmpPath);
            expect(env).to.include({DB_USER: 'thedbuser', DB_PASSWORD: 'thedbpassword'});
        });
        it('shouldn\'t write the secrets to the cmd string', () => {
            const source = new BackupSourceMysql(
                'test',
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                'thedb1',
            );
            const tmpPath = Path.join(process.cwd(), container.resolve<IConfig>('Config').get<string>('tmpPath'));

            const {cmd} = source.createDumpCmd('thedumpname.sql', tmpPath);
            expect(cmd).to.not.match(/(thedbuser|thedbpassword)/g);
        });
        it('should include the additional options', () => {
            const source = new BackupSourceMysql(
                'test',
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                'thedb1',
                {
                    optionkey: 'optionvalue',
                },
            );
            const tmpPath = Path.join(process.cwd(), container.resolve<IConfig>('Config').get<string>('tmpPath'));

            const {cmd} = source.createDumpCmd('thedumpname.sql', tmpPath);
            expect(cmd).to.match(/(--optionkey="optionvalue")/);
        });
        it('should set one ignored table', () => {
            const source = new BackupSourceMysql(
                'test',
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                'thedb1',
                {},
                ['ignoredtable'],
            );
            const tmpPath = Path.join(process.cwd(), container.resolve<IConfig>('Config').get<string>('tmpPath'));

            const {cmd} = source.createDumpCmd('thedumpname.sql', tmpPath);
            expect(cmd).to.match(/(--ignore-table="thedb1.ignoredtable")/);
        });

        it('should set multiple ignored tables', () => {
            const source = new BackupSourceMysql(
                'test',
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                'thedb1',
                {},
                ['ignoredtable1', 'ignoredtable2'],
            );
            const tmpPath = Path.join(process.cwd(), container.resolve<IConfig>('Config').get<string>('tmpPath'));

            const {cmd} = source.createDumpCmd('thedumpname.sql', tmpPath);
            expect(cmd).to.match(/(--ignore-table="thedb1.ignoredtable1" --ignore-table="thedb1.ignoredtable2")/);
        });


        it('should set the included tables', () => {
            const source = new BackupSourceMysql(
                'test',
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                'thedb1',
                {},
                [],
                ['includetable1', 'includetable2'],
            );
            const tmpPath = Path.join(process.cwd(), container.resolve<IConfig>('Config').get<string>('tmpPath'));

            const {cmd} = source.createDumpCmd('thedumpname.sql', tmpPath);
            expect(cmd).to.match(/(thedb1 includetable1 includetable2)/);
        });

        it('should create two dump command if data for tables is ignored', () => {
            const source = new BackupSourceMysql(
                'test',
                'thedbhost',
                'thedbuser',
                'thedbpassword',
                'thedb',
                null,
                null,
                null,
                ['ignoredata'],
            );
            const tmpPath = Path.join(process.cwd(), container.resolve<IConfig>('Config').get<string>('tmpPath'));
            const {cmd} = source.createDumpCmd('thedumpname', tmpPath);
            const expectedPath = Path.resolve(tmpPath, 'thedumpname.sql');
            const expectedCommand = `mysqldump --host="thedbhost" --user="$DB_USER" --password="$DB_PASSWORD" --no-data thedb > ${expectedPath} && mysqldump --host="thedbhost" --user="$DB_USER" --password="$DB_PASSWORD" --no-create-info thedb >> ${expectedPath}`;
            expect(cmd).to.equal(expectedCommand);
        });
    });
});
