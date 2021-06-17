import {exec, ExecException} from 'child_process';
import ProcessEnv = NodeJS.ProcessEnv;
import {ContainerInspectInfo} from 'dockerode';
import {promises as fs} from 'fs';
import * as Joi from 'joi';
import * as md5 from 'md5-file';
import * as Path from 'path';
import {container} from 'tsyringe';
import {Logger} from 'winston';
import {IBackupManifest, IBackupManifestStep} from '../IBackupManifest';
import {ILabels} from '../Interfaces';
import {TmpStorage} from '../TmpStorage';
import {getConfigFromLabel, getHostForContainer} from '../Util';
import {ValidationError} from '../ValidationError';
import {IBackupSource, IBackupSourceJSON} from './IBackupSource';

export interface IBackupSourceMysqlJSON extends IBackupSourceJSON {
    mysql: {
        database: string | string[],
        tableIgnoreList?: string | string[],
        tableIncludeList?: string | string[],
        dataIgnoreList?: string | string[],
        options?: object,
    };
}

export interface IMysqlLabels extends ILabels {
    mysql: {
        user: string,
        database: string,
        password: string,
        ignore_tables?: string,
        include_tables?: string,
        ignore_data?: string,
        options?: object,
    };
}

/**
 * This class provides backup functionality for mysql/mariadb
 *
 * @category BackupSource
 * @todo Add support for a partial data-exclude
 */
export class BackupSourceMysql implements IBackupSource {

    public static getSchema(): any {

        return Joi.object().keys({
            database: Joi.string().required(),
            options: Joi.object().unknown(true),
            password: Joi.string().required(),
            ignore_tables: Joi.string(),
            include_tables: Joi.string(),
            ignore_data: Joi.string(),
            user: Joi.string().required(),
        });
    }

    public static fromContainer(inspectInfo: ContainerInspectInfo, labels: IMysqlLabels): BackupSourceMysql {
        const logger = container.resolve<Logger>('Logger');
        const containerName = inspectInfo.Name.replace('/', '');

        const defaultLogMeta = {
            containerName,
            containerId: inspectInfo.Id,
        };

        if (!labels.hasOwnProperty('mysql')) {
            throw new Error('No mysql property found');
        }

        const result = this.getSchema().validate(labels.mysql);
        if (result.hasOwnProperty('error')) {
            for (const error of result.error.details) {
                logger.log({
                    level: 'error',
                    message: `Container ${containerName}: Validation for mysql ${error.message}`,
                    ...defaultLogMeta,
                });
            }
            throw new ValidationError('Validation failed', result.error);
        }

        const mysqlUser = getConfigFromLabel(labels.mysql.user, inspectInfo, 'root');

        if (mysqlUser === '') {
            throw new Error(`Container ${containerName}: No mysql user found!`);
        }

        const mysqlPassword = getConfigFromLabel(labels.mysql.password, inspectInfo);
        const db = getConfigFromLabel(labels.mysql.database, inspectInfo);

        const options: object = {};
        if (labels.mysql.options) {
            for (const optionKey of Object.keys(labels.mysql.options)) {
                options[optionKey] = getConfigFromLabel(labels.mysql.options[optionKey], inspectInfo);
            }
        }

        let tableIncludeList: string[] = null;
        if (labels.mysql.include_tables) {
            tableIncludeList = labels.mysql.include_tables.split(',').map((val) => val.trim());
        }

        let tableIgnoreList: string[] = null;
        if (labels.mysql.ignore_tables) {
            tableIgnoreList = labels.mysql.ignore_tables.split(',').map((val) => val.trim());
        }

        let dataIgnoreList: string[] = null;
        if (labels.mysql.ignore_data) {
            dataIgnoreList = labels.mysql.ignore_data.split(',').map((val) => val.trim());
        }

        if (
            tableIncludeList !== null &&
            tableIgnoreList !== null
        ) {
            logger.log({
                level: 'warning',
                message: `Container ${containerName}: Found ignore & include list, the ignorelist is preferred!`,
                ...defaultLogMeta,
            });
            tableIncludeList = null;
        }

        if (
            tableIncludeList !== null &&
            dataIgnoreList !== null
        ) {
            logger.log({
                level: 'warning',
                message: `Container ${containerName}: Found data ignore & table include list, the include list is preferred!`,
                ...defaultLogMeta,
            });
            dataIgnoreList = null;
        }

        const host = getHostForContainer(labels.network, inspectInfo);

        return new BackupSourceMysql(
            inspectInfo.Name,
            host,
            mysqlUser,
            mysqlPassword,
            db,
            options,
            tableIgnoreList,
            tableIncludeList,
            dataIgnoreList,
        );
    }

    get type() {
        return this._type;
    }

    get name() {
        return this._name;
    }

    private readonly _type: string = 'mysql';
    private readonly _name: string;
    private readonly _dbHost: string;
    private readonly _dbUser: string;
    private readonly _dbPassword: string;
    private readonly _db: string;
    private readonly _options: object;
    private readonly _ignoreTablesList?: string[];
    private readonly _includeTablesList?: string[];
    private readonly _ignoreDataList?: string[];

    /**
     * @param name The name for this backup instance (e.g. the container name)
     * @param dbHost The host (e.g IP-address of the host)
     * @param dbUser The database user to access the db
     * @param dbPassword The database user password to access the db
     * @param db The database to backup
     * @param options Optional options directly passed to mysqldump
     * @param ignoreTablesList An array of tables exclude from the dump
     * @param includeTablesList An array of table to include in the dump.
     *         Note that only black or whitelist can be used. The blacklist will be prioritised above the whitelist
     * @param ignoreDataList
     */
    public constructor(
        name: string,
        dbHost: string,
        dbUser: string,
        dbPassword: string,
        db: string,
        options?: object,
        ignoreTablesList?: string[],
        includeTablesList?: string[],
        ignoreDataList?: string[],
    ) {
        this._name = name;
        this._dbHost = dbHost;
        this._dbUser = dbUser;
        this._dbPassword = dbPassword;
        this._db = db;
        this._options = options;
        this._ignoreTablesList = ignoreTablesList;
        this._ignoreDataList = ignoreDataList;

        if (
            Array.isArray(includeTablesList)
            && Array.isArray(ignoreDataList)
        ) {
            throw new Error('Simultaneous usage of included tables and ignored data for tables is disallowed');
        }

        if (!(Array.isArray(ignoreTablesList) && ignoreTablesList.length > 0)) {
            this._includeTablesList = includeTablesList;
        }
    }

    /**
     * Get the db host
     */
    get dbHost(): string {
        return this._dbHost;
    }

    /**
     * Get the db user
     */
    get dbUser(): string {
        return this._dbUser;
    }

    /**
     * Get the db password
     */
    get dbPassword(): string {
        return this._dbPassword;
    }

    /**
     * Get the db[s]
     */
    get db(): string | string[] {
        return this._db;
    }

    /**
     * Get the options
     */
    get options(): object {
        return this._options;
    }

    /**
     * Get the blacklist
     */
    get ignoreTablesList(): string[] | null {
        return this._ignoreTablesList;
    }

    /**
     * Get the whitelist
     */
    get includeTablesList(): string[] | null {
        if (typeof this._includeTablesList === 'undefined') {
            return null;
        }
        return this._includeTablesList;
    }

    /**
     * Get the whitelist
     */
    get ignoreDataTableList(): string[] | null {
        if (typeof this._ignoreDataList === 'undefined') {
            return null;
        }
        return this._ignoreDataList;
    }

    /**
     * {@inheritDoc}
     */
    public async backup(manifest: IBackupManifest, tmp: TmpStorage): Promise<IBackupManifest> {
        const tmpPath = await tmp.getPath();
        const {cmd, env, tmpFile, tmpFileName} = this.createDumpCmd(manifest.name, tmpPath);
        return new Promise<IBackupManifest>((resolve, reject) => {
            exec(
                cmd,
                {env},
                async (error?: ExecException) => {
                    if (error) {
                        reject(error);
                    } else {
                        const md5Hash = await md5(tmpFile);
                        const {size} = await fs.stat(tmpFile);
                        const step: IBackupManifestStep = {
                            processor: 'source.mysql',
                            fileName: tmpFileName,
                            uri: tmpFile,
                            md5: md5Hash,
                            filesize: size.toString(),
                        };
                        manifest.steps.push(step);
                        resolve(manifest);
                    }
                },
            );
        });
    }

    /**
     * Generate the dump command for `mysqldump`.
     * {@link https://linux.die.net/man/1/mysqldump}
     * The secrets user and password will be injected via the process env to prevent them from being leaked via logs.
     *
     * @param name {string} The name of the backup file to be created.
     * @param tmpPath
     */
    public createDumpCmd(name: string, tmpPath: string):
        { cmd: string, env: ProcessEnv, tmpFile: string, tmpFileName: string } {
        const env = {
            DB_USER: this._dbUser,
            DB_PASSWORD: this._dbPassword,
        };

        const ignoreDataForTables = Array.isArray(this._ignoreDataList);
        const cmd = [];
        const mysqlBase = `mysqldump --host="${this._dbHost}" --user="$DB_USER" --password="$DB_PASSWORD"`;

        cmd.push(mysqlBase);

        // If data for some tables should be ignored we need to create 2 dumps, one with only schemas,
        // an one with actual data.
        if (ignoreDataForTables) {
            cmd.push(`--no-data`);
        }

        this.addOptions(cmd);

        if (this._ignoreTablesList) {
            for (const table of this._ignoreTablesList) {
                cmd.push(`--ignore-table="${this._db}.${table}"`);
            }
        }

        cmd.push(`${this._db}`);

        if (this._includeTablesList && !ignoreDataForTables) {
            for (const table of this._includeTablesList) {
                cmd.push(`${table}`);
            }
        }

        const tmpFileName = `${name}${this.getFileSuffix()}`;
        const tmpFile = Path.join(tmpPath, tmpFileName);

        cmd.push(`> ${tmpFile}`);

        if (ignoreDataForTables) {
            cmd.push('&&');
            cmd.push(mysqlBase);

            // The second dump only includes the data, no schema definitions
            cmd.push('--no-create-info');

            this.addOptions(cmd);

            if (this._ignoreTablesList) {
                for (const table of this._ignoreTablesList) {
                    cmd.push(`--ignore-table="${this._db}.${table}"`);
                }
                // Add the data ignore tables
                for (const table of this._ignoreDataList) {
                    cmd.push(`--ignore-table="${this._db}.${table}"`);
                }
            }

            cmd.push(`${this._db}`);

            // Append the second dump to the first
            cmd.push(`>> ${tmpFile}`);
        }

        return {
            cmd: cmd.join(' '),
            env,
            tmpFile,
            tmpFileName,
        };
    }

    /**
     *  @inheritdoc
     */
    public getFileSuffix(): string {
        return '.sql';
    }

    public toJSON(): IBackupSourceMysqlJSON {
        return {
            type: this.type,
            mysql: {
                database: this._db,
                tableIgnoreList: this._ignoreTablesList,
                tableIncludeList: this._includeTablesList,
                options: this._options,
            },
        };
    }

    private addOptions(cmd: string[]) {
        if (this._options) {
            for (const optionName of Object.keys(this._options)) {
                cmd.push(`--${optionName}="${this._options[optionName]}"`);
            }
        }
    }
}
