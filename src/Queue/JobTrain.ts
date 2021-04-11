import { v1 as uuid } from 'uuid';
import {IBackupManifest} from '../IBackupManifest';
import {Job} from './Job';

/**
 * A job train is a queued list of it self.
 * It executes a lists of sequential operations to complete the backup.
 */
export class JobTrain {
    get uuid(): string {
        return this._uuid;
    }
    set started(value: boolean) {
        this._started = value;
    }
    get started(): boolean {
        return this._started;
    }

    set enqueued(value: boolean) {
        this._enqueued = value;
    }

    get enqueued(): boolean {
        return this._enqueued;
    }

    get manifest(): IBackupManifest {
        return this._manifest;
    }

    /**
     * The list of jobs defined for this JobTrain
     * @private
     */
    private readonly _jobs: Job[];

    /**
     * The manifest that is kept across all jobs
     * @private
     */
    private readonly _manifest: IBackupManifest;

    private _started: boolean = false;

    private _enqueued: boolean = false;

    private _uuid: string;

    constructor(manifest: IBackupManifest, jobs?: Job[]) {
        this._manifest = manifest;
        if (Array.isArray(jobs)) {
            this._jobs = jobs;
        } else {
            this._jobs = [];
        }
        this._uuid = uuid();
    }

    public enqueue(job: Job): void {
        this._jobs.push(job);
    }

    public dequeue(): Job | null {
        return this._jobs.shift();
    }

    public peak(): Job | null {
        return this._jobs[0];
    }
}
