import {IBackupMandateJSON} from '../Backup/BackupMandate';
import {IBackupManifest} from '../IBackupManifest';
import {AJob} from './AJob';
import {AQueueable, IQueueableJSON} from './AQueueable';
import {EStatus} from './Queue';
import {getCurrentHub, Hub} from '@sentry/node';

export interface IJobTrainJSON extends IQueueableJSON {
    manifest: IBackupManifest;
    jobs: IQueueableJSON[];
}

/**
 * A job train is a queued list of it self.
 * It executes a lists of sequential operations to complete the backup.
 */
export class JobTrain extends AQueueable {

    /**
     * Sets the status and associated timestamps
     * @param value
     */
    set status(value: EStatus) {
        super.status = value;
        if (value === EStatus.ENQUEUED) {
            this._jobs.forEach((job) => job.status = EStatus.ENQUEUED);
        }
    }

    get manifest(): IBackupManifest {
        return this._manifest;
    }

    /**
     * The list of jobs defined for this JobTrain
     * @private
     */
    private readonly _jobs: AJob[];

    /**
     * The manifest that is kept across all jobs
     * @private
     */
    private readonly _manifest: IBackupManifest;

    constructor(manifest: IBackupManifest, jobs?: AJob[], hub?: Hub) {
        super(hub);
        this._manifest = manifest;
        if (Array.isArray(jobs)) {
            this._jobs = jobs;
        } else {
            this._jobs = [];
        }
    }

    public enqueue(job: AJob): void {
        job.setHub(this.getHub());
        this._jobs.push(job);
    }

    public dequeue(): AJob | null {
        return this._jobs.shift();
    }

    public peak(): AJob | null {
        return this._jobs[0];
    }

    public toJSON(): IJobTrainJSON {
        return {
            uuid: this.uuid,
            status: this.status,
            type: 'train',
            manifest: this._manifest,
            jobs: this._jobs.map((job) => job.toJSON()),
            timestamps: {
                enqueued: this.timestamps.enqueued?.toUTC().toString(),
                started: this.timestamps.started?.toUTC().toString(),
                finished: this.timestamps.finished?.toUTC().toString(),
            },
            waiting: this.waitingDuration?.toMillis() / 1000,
            working: this.workingDuration?.toMillis() / 1000,
        };
    }
}
