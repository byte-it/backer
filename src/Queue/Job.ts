import {IBackupManifest} from '../IBackupManifest';
import {BackupMandate} from '../Backup/BackupMandate';
import { v1 as uuid } from 'uuid';

/**
 * The Job represents a single work step.
 */
export abstract class Job {
    get uuid(): string {
        return this._uuid;
    }
    get enqueued(): boolean {
        return this._enqueued;
    }

    set enqueued(value: boolean) {
        this._enqueued = value;
    }

    get started(): boolean {
        return this._started;
    }

    protected readonly _mandate: BackupMandate;

    private _started: boolean;

    private _enqueued: boolean;

    private _uuid: string;

    public constructor(mandate: BackupMandate) {
        this._mandate = mandate;
        this._uuid = uuid();
    }

    public async start(manifest: IBackupManifest): Promise<IBackupManifest> {
        this._started = true;
        manifest = await this.execute(manifest);
        this._started = false;
        return manifest;
    }

    protected abstract execute(manifest: IBackupManifest): Promise<IBackupManifest>;
}
