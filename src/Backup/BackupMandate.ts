import {IConfig} from 'config';
import {CronJob} from 'cron';
import {ContainerInspectInfo} from 'dockerode';
import * as Joi from 'joi';
import {container, inject} from 'tsyringe';
import {LogEntry, Logger} from 'winston';
import {BackupSourceFactory} from '../BackupSource/BackupSourceFactory';
import {IBackupSource} from '../BackupSource/IBackupSource';
import {BackupTargetProvider} from '../BackupTarget/BackupTargetProvider';
import {IBackupTarget} from '../BackupTarget/IBackupTarget';
import {IBackupManifest} from '../IBackupManifest';
import {Queue} from '../Queue/Queue';
import {SourceJob} from '../Queue/SourceJob';
import {TargetJob} from '../Queue/TargetJob';
import {extractLabels} from '../Util';
import {ValidationError} from '../ValidationError';
import {JobTrain} from '../Queue/JobTrain';
import {RetentionJob} from '../Queue/RetentionJob';
import {IBackupMiddleware} from '../BackupMiddleware/IBackupMiddleware';
import {MiddlewareJob} from '../Queue/MiddlewareJob';
import {DateTime} from 'luxon';
import {ILabels} from '../Interfaces';

/**
 * The BackupMandate represents the mandate to create and manage backups for 1 container.
 */
export class BackupMandate {

    /**
     * The logger preloaded with meta about the backedup container
     */
    get logger(): Logger {
        return this._logger;
    }

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
    get retention(): number {
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
            retention: Joi.number(),
            namePattern: Joi.string(),
            network: Joi.string().required(),
            middleware: Joi.string().regex(/^(\w|\d|-|_)+(,( )?(\w|\d|-|_)+)*$/)
        }).options({
            allowUnknown: true,
        });
    }

    /**
     * Factory to create a Backup from {@link Dockerode.ContainerInspectInfo}
     * @param {Dockerode.ContainerInspectInfo} inspectInfo
     * @return {BackupMandate}
     */
    public static fromContainer(inspectInfo: ContainerInspectInfo): BackupMandate {
        const containerName = inspectInfo.Name.replace('/', '');
        let labels = extractLabels(inspectInfo.Config.Labels);
        return this.fromStatic(containerName, labels, inspectInfo);
    }

    public static fromStatic(containerName: string, labels: ILabels, inspectInfo: ContainerInspectInfo): BackupMandate {

        const logger: Logger = container.resolve<Logger>('Logger');

        const defaultLogMeta = {
            containerName,
            containerId: inspectInfo.Id,
        };

        logger.log({
            level: 'info',
            message: `Container ${containerName}: Create backup mandate`,
            ...defaultLogMeta,
        });

        const sourceProvider = container.resolve<BackupSourceFactory>(BackupSourceFactory);
        const targetProvider = container.resolve<BackupTargetProvider>(BackupTargetProvider);

        const defaultLabels = {
            interval: '0 0 * * *',
            namePattern: '<DATE>-<CONTAINER_NAME>',
            retention: '10',
        };

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
                level: 'debug',
                message: `Container ${containerName}: Use "${labels.target}" as target`,
                ...defaultLogMeta,
            });
            target = container.resolve<IBackupTarget>(['target', labels.target].join('.'));
            if (target == null) {
                throw new Error(`Container ${containerName}: Validation: The target "${labels.target}" doesn't exist`);
            }
        } else {
            logger.log({
                level: 'debug',
                message: `Container ${containerName}: Use default target`,
                ...defaultLogMeta,
            });
            target = container.resolve<IBackupTarget>('target.default');
        }

        const source = sourceProvider.createBackupSource(inspectInfo, labels);

        const middlewareStack = [];

        if (labels.middleware && labels.middleware !== '') {
            const middlewareNames = labels.middleware.split(',');
            for (let middlewareName of middlewareNames) {
                middlewareName = middlewareName.trim();

                const middleware = container.resolve<IBackupMiddleware>(`middleware.${middlewareName}`);

                if (middleware == null) {
                    throw new Error(`Container ${containerName}: Validation: The middleware "${middlewareName}" doesn't exist`);
                }
                middlewareStack.push(middleware);
            }
            logger.log({
                level: 'debug',
                message: `Container ${containerName}: Use "${middlewareNames.join(',')}" as middlewares`,
                ...defaultLogMeta,
            });
        }

        logger.log({
            level: 'info',
            message: `Container ${containerName}: Created backup mandate`,
            ...defaultLogMeta,
        });

        return new BackupMandate(
            container.resolve('Config'),
            container.resolve('Logger'),
            container.resolve(Queue),
            inspectInfo.Id,
            containerName,
            source,
            target,
            labels.interval,
            parseInt(labels.retention),
            labels.namePattern,
            middlewareStack,
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
     * The source instance for the backup mandate
     */
    private readonly _source: IBackupSource;

    /**
     * The target instance for the backup mandate
     */
    private readonly _target: IBackupTarget;

    /**
     * The middleware stack for the backup mandate
     */
    private readonly _middlewareStack: IBackupMiddleware[] = [];

    /**
     * The backup interval in cron format (* * * * * *)
     */
    private readonly _interval: string;

    /**
     * How long the backups should be retained
     */
    private readonly _retention: number;

    /**
     * The format of the file name of the backups
     * @TODO define placeholder
     */
    private readonly _namePattern: string;

    /**
     * The cron instance that triggers the backup creation
     */
    private _cron: CronJob;

    private _logger: Logger;

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
        @inject('Config') private config: IConfig,
        @inject('Logger') logger: Logger,
        @inject(Queue) private queue: Queue,
        containerId: string,
        containerName: string,
        source: IBackupSource,
        target: IBackupTarget,
        interval: string,
        retention: number,
        namePattern: string,
        middlewareStack?: IBackupMiddleware[],
    ) {

        this._logger = logger.child({
            containerId: this._containerId,
            containerName: this._containerName,
        })

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
        }

        if (Array.isArray(middlewareStack)) {
            this._middlewareStack = middlewareStack;
        }

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
    public createName(currentTime?: DateTime): string {
        if (typeof currentTime === 'undefined') {
            currentTime = DateTime.now();
        }
        const replacements = {
            '<DATE>': currentTime.toFormat('yyyyMMdd-HH-mm'),
            '<CONTAINER_NAME>': this._containerName,
        };
        let name = this._namePattern;

        // tslint:disable-next-line:forin
        for (const placeholder in replacements) {
            const replacement = replacements[placeholder];
            name = name.replace(placeholder, replacement);
        }
        return name;
    }

    /**
     * Calculates which backups can be delete with the current retention settings.
     * @param manifests A list of the all backup manifest currently stored on the target for this backup.
     * @return A list of all backups
     */
    public calculateRetention(manifests: IBackupManifest[]): IBackupManifest[] {
        if (manifests.length <= this.retention) {
            return [];
        }
        // Create a copy to prevent changes to the input array
        const sortedManifests = [...manifests];
        // Sort by increasing date
        sortedManifests.sort((a, b) => {
            return a.date < b.date ? 1 : -1;
        });
        // Return the oldest
        return sortedManifests.splice(this._retention);
    }

    /**
     * Enforces the retention limit by deleting old backups
     */
    public async enforceRetention() {
        const manifests = this._target.getAllBackups().filter(
            (manifest) => manifest.containerName === this._containerName,
        );
        for (const manifestToDelete of this.calculateRetention(manifests)) {
            try {
                await this._target.deleteBackup(manifestToDelete);
                this.log({
                    level: 'info',
                    message: `Backup ${manifestToDelete.name} deleted due to retention limitation`,
                    backupName: manifestToDelete.name,
                    ...this._defaultMeta,
                });
            } catch (e) {
                this.log({
                    level: 'error',
                    message: `Deletion of backup ${manifestToDelete.name} failed`,
                    error: e,
                    errorMessage: e.message,
                    ...manifestToDelete,
                });
            }
        }
    }

    /**
     * Start a single backup process
     *
     * @todo TEST!
     */
    public async backup() {
        const backupName = this.createName();

        const backupMeta = {
            ...this._defaultMeta,
            backupName,
            sourceName: this._source.name,
            targetName: this._target.name,
        };


        const manifest: IBackupManifest = {
            name: backupName,
            containerName: this._containerName,
            sourceName: this._source.name,
            date: DateTime.now().toFormat('yyyyMMdd-HH-mm'),
            steps: [],
        };

        const train = new JobTrain(manifest);
        train.enqueue(new SourceJob(this));

        if (this._middlewareStack.length > 0) {
            for (const middleware of this._middlewareStack) {
                train.enqueue(new MiddlewareJob(this, middleware));
            }
        }

        train.enqueue(new TargetJob(this));
        train.enqueue(new RetentionJob(this));

        this.queue.enqueueTrain(train);

        this.log({
            level: 'info',
            message: `Backup ${backupName} enqueued`,
            ...backupMeta,
        });
    }

    /**
     * @param log
     * @protected
     */
    protected log(log: string | LogEntry) {
        if (typeof log === 'string') {
            this._logger.info(log, this.containerId, this.containerName);
        } else {
            this._logger.log(log);
        }
    }
}
