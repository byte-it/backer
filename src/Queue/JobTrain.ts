import {IBackupManifest} from '../IBackupManifest';
import {AJob} from './AJob';
import {AQueueable} from './AQueueable';
import {EStatus} from './Queue';

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

    constructor(manifest: IBackupManifest, jobs?: AJob[]) {
        super();
        this._manifest = manifest;
        if (Array.isArray(jobs)) {
            this._jobs = jobs;
        } else {
            this._jobs = [];
        }
    }

    public enqueue(job: AJob): void {
        this._jobs.push(job);
    }

    public dequeue(): AJob | null {
        return this._jobs.shift();
    }

    public peak(): AJob | null {
        return this._jobs[0];
    }

    public toJSON() {
        return {
            uuid: this.uuid,
            mandate: this._manifest,
            jobs: this._jobs.map((job) => job.toJSON()),
            timestamps: {
                enqueued: this.timestamps.enqueued?.toUTC(),
                started: this.timestamps.started?.toUTC(),
                finished: this.timestamps.finished?.toUTC(),
            },
            waiting: this.waitingDuration?.toMillis() / 1000,
            working: this.workingDuration?.toMillis() / 1000,
        };
    }
}
