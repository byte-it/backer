import {BackupMandate} from '../Backup/BackupMandate';
import {IBackupManifest} from '../IBackupManifest';
import {AQueueable} from './AQueueable';
import {EStatus} from './Queue';

/**
 * The Job represents a single work step.
 */
export abstract class AJob extends AQueueable {

    protected readonly _mandate: BackupMandate;

    public constructor(mandate: BackupMandate) {
        super();
        this._mandate = mandate;
    }

    public async start(manifest: IBackupManifest): Promise<IBackupManifest> {
        this.status = EStatus.STARTED;
        try {
            manifest = await this.execute(manifest);
        } catch (e) {
            this.status = EStatus.FAILED;
            throw e;
        }
        this.status = EStatus.FINISHED;
        return manifest;
    }

    public toJSON(): object {
        return {
            uuid: this.uuid,
            status: this.status,
            timestamps: {
                enqueued: this.timestamps.enqueued?.toUTC(),
                started: this.timestamps.started?.toUTC(),
                finished: this.timestamps.finished?.toUTC(),
            },
            waiting: this.waitingDuration?.toMillis() / 1000,
            working: this.workingDuration?.toMillis() / 1000,
        };
    }

    protected abstract execute(manifest: IBackupManifest): Promise<IBackupManifest>;
}
