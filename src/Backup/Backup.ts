import {IConfig} from 'config';
import {CronJob} from 'cron';
import {ContainerInspectInfo} from 'dockerode';
import * as Joi from 'joi';
import * as moment from 'moment';
import {container, inject} from 'tsyringe';
import {LogEntry, Logger} from 'winston';
import {BackupSourceProvider} from '../BackupSource/BackupSourceProvider';
import {IBackupSource} from '../BackupSource/IBackupSource';
import {BackupTargetProvider} from '../BackupTarget/BackupTargetProvider';
import {IBackupTarget} from '../BackupTarget/IBackupTarget';
import {IBackupManifestBackup} from '../IBackupManifest';
import {Queue} from '../Queue/Queue';
import {SourceJob} from '../Queue/SourceJob';
import {TargetJob} from '../Queue/TargetJob';
import {extractLabels} from '../Util';
import {ValidationError} from '../ValidationError';

/**
 * Backup class
 */
export class Backup {
    /**
     * The containerName
     * @type {string}
     */
    get containerName(): string {
        return this._containerName;
    }

    /**
     * The containerId
     * @type {string}
     */
    get containerId(): string {
        return this._containerId;
    }

    /**
     * The backup source
     * @type {IBackupSource}
     */
    get source(): IBackupSource {
        return this._source;
    }

    /**
     * The backup target
     * @type {IBackupTarget}
     */
    get target(): IBackupTarget {
        return this._target;
    }

    /**
     * The interval
     * @type {string}
     */
    get interval(): string {
        return this._interval;
    }

    /**
     * The retention
     * @type {string}
     */
    get retention(): string {
        return this._retention;
    }

    /**
     * The name pattern
     * @type {string}
     */
    get namePattern(): string {
        return this._namePattern;
    }

    /**
     *
     */
    public static getSchema() {
        return Joi.object().keys({
            target: Joi.string(),
            type: Joi.string().required(),
            interval: Joi.string(),
            retention: Joi.string(),
            namePattern: Joi.string(),
            network: Joi.string().required(),
        }).options({
            allowUnknown: true,
        });
    }

    /**
     * Factory to create a Backup from {@link Dockerode.ContainerInspectInfo}
     * @param {Dockerode.ContainerInspectInfo} inspectInfo
     * @return {Backup}
     */
    public static fromContainer(inspectInfo: ContainerInspectInfo): Backup {
        const logger: Logger = container.resolve<Logger>('Logger');
        const containerName = inspectInfo.Name.replace('/', '');

        const defaultLogMeta = {
            containerName,
            containerId: inspectInfo.Id,
        };

        logger.log({
            level: 'info',
            message: `Container ${containerName}: Create backup`,
            ...defaultLogMeta,
        });

        const sourceProvider = container.resolve<BackupSourceProvider>(BackupSourceProvider);
        const targetProvider = container.resolve<BackupTargetProvider>(BackupTargetProvider);

        const defaultLabels = {
            interval: '0 0 * * *',
            namePattern: '<DATE>-<CONTAINER_NAME>',
            retention: '10',
        };

        let labels = extractLabels(inspectInfo.Config.Labels);

        labels = Object.assign(defaultLabels, labels);

        const result = this.getSchema().validate(labels);

        if (result.hasOwnProperty('error')) {
            for (const error of result.error.details) {
                logger.log({
                    level: 'error',
                    message: `Container ${containerName}: ${error.message}`,
                    ...defaultLogMeta,
                });
            }
            throw new ValidationError('Validation failed', result.error);
        }

        let target: IBackupTarget;
        if (labels.target && labels.target !== '') {
            logger.log({
                level: 'info',
                message: `Container ${containerName}: Use "${labels.target}" as target`,
                ...defaultLogMeta,
            });
            target = container.resolve<IBackupTarget>(['target', labels.target].join('.'));
            if (target == null) {
                throw new Error(`Container ${containerName}: Validation: The target "${labels.target}" doesn't exist`);
            }
        } else {
            logger.log({
                level: 'info',
                message: `Container ${containerName}: Use default target`,
                ...defaultLogMeta,
            });
            target = container.resolve<IBackupTarget>('target.default');
        }

        const source = sourceProvider.createBackupSource(inspectInfo);

        logger.log({
            level: 'info',
            message: `Container ${containerName}: Created backup`,
            ...defaultLogMeta,
        });

        return new Backup(
            container.resolve('config'),
            container.resolve('Logger'),
            inspectInfo.Id,
            containerName,
            source,
            target,
            labels.interval,
            labels.retention,
            labels.namePattern,
        );
    }

    /**
     * The human readable name of the docker container to backup
     */
    private readonly _containerName: string;
    /**
     * The docker sha of the docker container to backup
     */
    private readonly _containerId: string;

    /**
     * The source entity of the backup
     */
    private readonly _source: IBackupSource;

    /**
     * The target entity of the backup
     */
    private readonly _target: IBackupTarget;

    /**
     * The backup interval in cron format (* * * * * *)
     */
    private readonly _interval: string;

    /**
     * How long the backups should be retained
     */
    private readonly _retention: string;

    /**
     * The format of the file name of the backups
     * @TODO define placeholder
     */
    private readonly _namePattern: string;

    /**
     * The cron instance that triggers the backup creation
     */
    private _cron: CronJob;

    private readonly _defaultMeta: object;

    /**
     * @param {IConfig} config
     * @param {winston.Logger} logger
     * @param {string} containerId
     * @param {string} containerName
     * @param {IBackupSource} source
     * @param {IBackupTarget} target
     * @param {string} interval
     * @param {string} retention
     * @param {string} namePattern
     */
    constructor(
        @inject('config') private config: IConfig,
        @inject('Logger') private logger: Logger,
        containerId: string,
        containerName: string,
        source: IBackupSource,
        target: IBackupTarget,
        interval: string,
        retention: string,
        namePattern: string,
    ) {
        this._containerId = containerId;
        this._containerName = containerName;
        this._source = source;
        this._target = target;
        this._interval = interval;
        this._retention = retention;
        this._namePattern = namePattern;

        this._defaultMeta = {
            containerId: this._containerId,
            containerName: this._containerName,
        };

        this._cron = new CronJob(this._interval, this.backup.bind(this));
        this._cron.start();
    }

    /**
     * Stops the backup and its cron
     */
    public async stop() {
        this._cron.stop();
        this.log(`Stop backup`);
    }

    /**
     * Generate a backup name derived from the name pattern
     * @todo TEST
     */
    public createName(currentTime?: moment.Moment): string {
        if (typeof currentTime === 'undefined') {
            currentTime = moment();
        }
        const replacements = {
            '<DATE>': currentTime.format('YYYYMMDD-hh-mm'),
            '<CONTAINER_NAME>': this._containerName,
        };
        let name = this._namePattern;

        // tslint:disable-next-line:forin
        for (const placeholder in replacements) {
            const replacement = replacements[placeholder];
            name = name.replace(placeholder, replacement);
        }
        name += this._source.getFileSuffix();
        return name;
    }

    //
    /**
     * @param log
     * @protected
     */
    protected log(log: string | LogEntry) {
        if (typeof log === 'string') {
            this.logger.info(log, this.containerId, this.containerName);
        } else {
            log.containerId = this.containerId;
            log.containerName = this.containerName;
            this.logger.log(log);
        }
    }

    //
    /**
     * Start a single backup process
     */
    private async backup() {
        const backupName = this.createName();

        const backupMeta = {
            ...this._defaultMeta,
            backupName,
            sourceName: this._source.name,
            targetName: this._target.name,
        };

        this.log({
            level: 'info',
            message: `Backup ${backupName} started`,
            ...backupMeta,
        });

        const manifest: IBackupManifestBackup = {
            name: backupName,
            containerName: this._containerName,
            sourceName: this._source.name,
            date: moment().format('YYYYMMDD-hh-mm'),
        };

        const queue = container.resolve<Queue>(Queue);

        try {
            await queue.enqueue(new SourceJob(this._source, backupName, manifest));
        } catch (e) {
            this.log({
                level: 'error',
                message: 'Backup source encountered an error',
                error: e.message,
                ...backupMeta,
            });
            return;
        }
        this.log(`Backup ${backupName} created`);
        try {
            await queue.enqueue(new TargetJob(this._target, backupName, manifest));
        } catch (e) {
            this.log({
                level: 'error',
                message: 'Backup target encountered an error',
                error: e,
                ...backupMeta,
            });
        }

        this.log(`Backup ${backupName} transferred to target`);
        return;
    }
}
