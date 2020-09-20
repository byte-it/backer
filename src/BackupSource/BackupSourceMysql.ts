import {exec, ExecException} from 'child_process';
import {ContainerInspectInfo} from 'dockerode';
import * as Joi from 'joi';
import * as path from 'path';
import {container, registry} from 'tsyringe';
import {Logger} from 'winston';
import {Config} from '../Config';
import {ILabels} from '../Interfaces';
import {extractLabels, getConfigFromLabel, getHostForContainer} from '../Util';
import {ValidationError} from '../ValidationError';
import {IBackupSource} from './IBackupSource';
import ProcessEnv = NodeJS.ProcessEnv;

export interface IMysqlLabels extends ILabels {
    mysql: {
        user: string,
        database: string,
        password: string,
        tableIgnoreList?: string,
        tableIncludeList?: string,
        options?: object,
    };
}

/**
 * This class provides backup functionality for mysql/mariadb
 */
export class BackupSourceMysql implements IBackupSource {

    public static getSchema(): any {

        return Joi.object().keys({
            database: Joi.string().required(),
            options: Joi.object().unknown(true),
            password: Joi.string().required(),
            tableIgnoreList: Joi.string(),
            tableIncludeList: Joi.string(),
            user: Joi.string().required(),
        });
    }

    public static fromContainer(inspectInfo: ContainerInspectInfo): BackupSourceMysql {
        const logger = container.resolve<Logger>('Logger');
        const labels: IMysqlLabels = extractLabels(inspectInfo.Config.Labels) as IMysqlLabels;
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

        const mysqlPassword = getConfigFromLabel(labels.mysql.user, inspectInfo);
        const db = getConfigFromLabel(labels.mysql.database, inspectInfo);

        const options: object = {};
        if (labels.mysql.options) {
            for (const optionKey of Object.keys(labels.mysql.options)) {
                options[optionKey] = getConfigFromLabel(labels.mysql.options[optionKey], inspectInfo);
            }
        }

        let tableIncludeList: string[] = null;
        if (labels.mysql.tableIncludeList) {
            tableIncludeList = labels.mysql.tableIncludeList.split(',');
        }

        let tableIgnoreList: string[] = null;
        if (labels.mysql.tableIncludeList) {
            tableIgnoreList = labels.mysql.tableIgnoreList.split(',');
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
        if (Array.isArray(db) && Array.isArray(tableIncludeList)) {
            logger.log({
                level: 'warning',
                message: `Container ${containerName}: Found include list & multiple databases, the include list will be ignored`,
                ...defaultLogMeta,
            });
        }

        const host = getHostForContainer(labels.network, inspectInfo);

        return new BackupSourceMysql(
            host, mysqlUser, mysqlPassword, db, options, tableIgnoreList, tableIncludeList,
        );
    }

    public readonly name: string = 'mysql';
    private readonly _dbHost: string;
    private readonly _dbUser: string;
    private readonly _dbPassword: string;
    private readonly _db: string | string[];
    private readonly _options: object;
    private readonly _ignoreTablesList?: string[];
    private readonly _includeTablesList?: string[];

    /**
     * @param dbHost The host (e.g IP-address of the host )
     * @param dbUser The database user to access the db
     * @param dbPassword The database user password to access the db
     * @param db The database to backup, either a single string or an array of databases
     * @param options Optional options directly passed to mysqldump
     * @param ignoreTablesList An array of tables exclude from the dump
     * @param includeTablesList An array of table to include in the dump.
     *         Note that only black or whitelist can be used. The blacklist will be prioritised above the whitelist
     */
    public constructor(
        dbHost: string,
        dbUser: string,
        dbPassword: string,
        db: string | string[],
        options?: object,
        ignoreTablesList?: string[],
        includeTablesList?: string[]) {
        this._dbHost = dbHost;
        this._dbUser = dbUser;
        this._dbPassword = dbPassword;
        this._db = db;
        this._options = options;
        this._ignoreTablesList = ignoreTablesList;

        if (
            Array.isArray(db)
            && db.length > 1
            && Array.isArray(includeTablesList)
        ) {
            throw new Error('Simultaneous usage of multiple databases and ignored databases is disallowed');
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
     * Create a backup
     * @param name {string} The name of the backup file to be created.
     */
    public async backup(name: string): Promise<string> {
        const {cmd, env} = this.createDumpCmd(name);
        return new Promise<string>((resolve, reject) => {
            exec(
                cmd,
                {env},
                (error?: ExecException) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
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
     */
    public createDumpCmd(name: string): { cmd: string, env: ProcessEnv } {
        const env = {
            DB_USER: this._dbUser,
            DB_PASSWORD: this._dbPassword,
        };

        let cmd = `mysqldump --host="${this._dbHost}" --user="$DB_USER" --password="$DB_PASSWORD"`;

        if (this._options) {
            for (const optionName of Object.keys(this._options)) {
                cmd += ` --${optionName}="${this._options[optionName]}"`;
            }
        }

        if (this._ignoreTablesList) {
            if (!Array.isArray(this._db)) {
                for (const table of this._ignoreTablesList) {
                    cmd += ` --ignore-table="${this._db}.${table}"`;
                }
            } else {
                for (const db of this._db) {
                    for (const table of this._ignoreTablesList) {
                        cmd += ` --ignore-table="${db}.${table}"`;
                    }
                }
            }
        }
        if (Array.isArray(this._db)) {
            cmd += ' --databases';
            for (const db of this._db) {
                cmd += ` ${db}`;
            }
        } else {
            cmd += ` ${this._db}`;
        }

        if (!Array.isArray(this._db)) {
            if (this._includeTablesList) {
                for (const table of this._includeTablesList) {
                    cmd += ` ${table}`;
                }
            }
        }
        const tmpPath = container.resolve(Config).get('tmpPath');
        const tmpFile = path.join(tmpPath, name);
        cmd += ` > ${tmpFile}`;

        return {
            cmd,
            env,
        };
    }

    /**
     *  @inheritdoc
     */
    public getFileSuffix(): string {
        return '.sql';
    }
}
