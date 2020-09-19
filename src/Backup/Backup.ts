import {CronJob} from 'cron';
import {ContainerInspectInfo} from 'dockerode';
import * as moment from 'moment';
import {container} from 'tsyringe';
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
import * as Joi from 'joi';

/**
 * Backup represents a backup for one container. It manages the source and the target
 */
export class Backup {

    get containerName(): string {
        return this._containerName;
    }

    get containerId(): string {
        return this._containerId;
    }

    get source(): IBackupSource {
        return this._source;
    }

    get target(): IBackupTarget {
        return this._target;
    }

    get interval(): string {
        return this._interval;
    }

    get retention(): string {
        return this._retention;
    }

    get namePattern(): string {
        return this._namePattern;
    }

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
     * Factory to create a Backup from {@link ContainerInspectInfo}
     * @param inspectInfo ContainerInspectInfo
     * @return Backup
     */
    public static fromContainer(inspectInfo: ContainerInspectInfo): Backup {
        const containerName = inspectInfo.Name.replace('/', '');

        console.log(`Container ${containerName}: Create backup`);

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
                console.log(`Container ${containerName}: ${error.message}`);
            }
            throw new ValidationError('Validation failed', result.error);
        }

        let target: IBackupTarget;
        if (labels.target && labels.target !== '') {
            console.log(`Container ${containerName}: Use "${labels.target}" as target`);
            target = targetProvider.getBackupTarget(labels.target);
            if (target == null) {
                throw new Error(`Container ${containerName}: Validation: The target "${labels.target}" doesn't exist`);
            }
        } else {
            console.log(`Container ${containerName}: Use default target`);
            target = targetProvider.getDefaultBackupTarget();
        }

        const source = sourceProvider.createBackupSource(inspectInfo);

        console.log(`Container ${containerName}: Created backup`);
        return new Backup(
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
     * @TODO: define placeholder
     */
    private readonly _namePattern: string;

    /**
     * The cron instance that triggers the backup creation
     * @private
     */
    private _cron: CronJob;

    /**
     * @param containerId
     * @param containerName
     * @param source
     * @param target
     * @param interval
     * @param retention
     * @param namePattern
     */
    constructor(
        containerId: string,
        containerName: string,
        source: IBackupSource,
        target: IBackupTarget,
        interval: string,
        retention: string,
        namePattern: string) {
        this._containerId = containerId;
        this._containerName = containerName;
        this._source = source;
        this._target = target;
        this._interval = interval;
        this._retention = retention;
        this._namePattern = namePattern;

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

    /**
     * @todo replace with winston
     * @param log
     * @protected
     */
    protected log(log: string) {
        console.log(`Backup ${this.containerName} ${this.containerId}: ${log}`);
    }

    /**
     * Start a single backup process
     */
    private async backup() {
        const backupName = this.createName();

        this.log(`Backup ${backupName} started`);

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
            this.log('Backup creation error out');
            console.error(e);
            return;
        }
        this.log(`Backup ${backupName} created`);
        try {
            await queue.enqueue(new TargetJob(this._target, backupName, manifest));
        } catch (e) {
            this.log('Backup storage errored out');
        }

        this.log(`Backup ${backupName} transferred to target`);
        return;
    }
}
