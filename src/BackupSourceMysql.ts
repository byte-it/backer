import * as Joi from '@hapi/Joi';
import {ContainerInspectInfo} from 'dockerode';
import {IBackupSource} from './IBackupSource';
import {ILabels} from './Interfaces';
import {extractLabels, getConfigFromLabel, getHostForContainer} from './Util';
import {ValidationError} from './ValidationError';

export interface IMysqlLabels extends ILabels {
  mysql: {
    user: string,
    database: string,
    password: string,
    tableBlackList?: string,
    tableWhiteList?: string,
    options?: string,
  };
}

/**
 * This class provides backup functionality for mysql/mariadb
 */
export class BackupSourceMysql implements IBackupSource {

  public static getSchema(): any {

    return Joi.object().keys({
      database: Joi.string().required(),
      options: Joi.string(),
      password: Joi.string().required(),
      tableBlackList: Joi.string(),
      tableWhiteList: Joi.string(),
      user: Joi.string().required(),
    });
  }

  public static fromContainer(container: ContainerInspectInfo): BackupSourceMysql {
    const labels: IMysqlLabels = extractLabels(container.Config.Labels) as IMysqlLabels;
    console.debug(labels);

    if (!labels.hasOwnProperty('mysql')) {
      throw new Error('No mysql property found');
    }

    const result = Joi.validate(labels.mysql, this.getSchema());
    if (result.error !== null) {
      for (const error of result.error.details) {
        console.log(`Container ${container.Name}: Validation for mysql ${error.message}`);
      }
      throw new ValidationError('Validation failed', result.error);
    }

    const mysqlUser = getConfigFromLabel(labels.mysql.user, container, 'root');

    if (mysqlUser === '') {
      throw new Error(`Container ${container.Name}: No mysql user found!`);
    }

    const mysqlPassword = getConfigFromLabel(labels.mysql.user, container);
    const db = getConfigFromLabel(labels.mysql.database, container);

    let options: string = null;
    if (labels.mysql.options) {
      options = getConfigFromLabel(labels.mysql.options, container);
    }

    let tableWhiteList: string[] = null;
    if (labels.mysql.tableWhiteList) {
      tableWhiteList = labels.mysql.tableWhiteList.split(',');
    }

    let tableBlackList: string[] = null;
    if (labels.mysql.tableWhiteList) {
      tableBlackList = labels.mysql.tableBlackList.split(',');
    }

    if (
      tableWhiteList !== null &&
      tableBlackList !== null
    ) {
      console.warn(`Container ${container.Name}: Found black&white list, the blacklist is preferred!`);
      tableWhiteList = null;
    }

    const host = getHostForContainer(labels.network, container);

    return new BackupSourceMysql(
      host, mysqlUser, mysqlPassword, db, options, tableBlackList, tableWhiteList,
    );
  }

  public readonly name: string = 'mysql';
  private readonly _dbHost: string;
  private readonly _dbUser: string;
  private readonly _dbPassword: string;
  private readonly _db: string | string[];
  private readonly _options: string;
  private readonly _blackListTables?: string[];
  private readonly _whiteListTables?: string[];

  /**
   * @param dbHost The host (e.g IP-address of the host )
   * @param dbUser The database user to access the db
   * @param dbPassword The database user password to access the db
   * @param db The database to backup, either a single string or an array of databases
   * @param options Optional options directly passed to mysqldump
   * @param tablesBlackList An array of tables exclude from the dump
   * @param tablesWhiteList An array of table to include in the dump.
   *         Note that only black or whitelist can be used. The blacklist will be prioritised above the whitelist
   */
  public constructor(
    dbHost: string,
    dbUser: string,
    dbPassword: string,
    db: string | string[],
    options?: string,
    tablesBlackList?: string[],
    tablesWhiteList?: string[]) {
    this._dbHost = dbHost;
    this._dbUser = dbUser;
    this._dbPassword = dbPassword;
    this._db = db;
    this._options = options;
    this._blackListTables = tablesBlackList;
    this._whiteListTables = tablesWhiteList;
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
   * Get the blacklist
   */
  get blackListTables(): string[] | null {
    return this._blackListTables;
  }

  /**
   * Get the whitelist
   */
  get whiteListTables(): string[] | null {
    return this._whiteListTables;
  }

  /**
   * Create a backup
   * @param name
   */
  public async backup(name: string): Promise<string> {
    return new Promise<string>(() => {
      return '';
    });
  }

  /**
   * Generate the dump command for `mysqldump`
   * @param name
   */
  public createDumpCmd(name: string) {
    let cmd = `mysqldump --host=${this._dbHost} --user=${this._dbUser} --password=${this._dbPassword}`;

    if (this._options) {
      cmd += ` ${this._options}`;
    }

    if (this._blackListTables) {
      for (const table of this._blackListTables) {
        cmd += ` --ignore-table=${table}`;
      }
    }

    cmd += ` ${this._db}`;

    if (this._whiteListTables) {
      for (const table of this._whiteListTables) {
        cmd += ` ${table}`;
      }
    }
  }
}
