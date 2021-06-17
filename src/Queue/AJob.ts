import {BackupMandate} from '../Backup/BackupMandate';
import {IBackupManifest} from '../IBackupManifest';
import {TmpStorage} from '../TmpStorage';
import {AQueueable, IQueueableJSON} from './AQueueable';
import {EStatus} from './Queue';

/**
 * The Job represents a single work step.
 */
export abstract class AJob extends AQueueable {

    protected readonly _mandate: BackupMandate;
    protected readonly _tmp: TmpStorage;

    public constructor(mandate: BackupMandate, tmp: TmpStorage) {
        super();
        this._mandate = mandate;
        this._tmp = tmp;
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

    public toJSON(): IQueueableJSON {
        return {
            uuid: this.uuid,
            status: this.status,
            type: this.type(),
            timestamps: {
                enqueued: this.timestamps.enqueued?.toUTC().toString(),
                started: this.timestamps.started?.toUTC().toString(),
                finished: this.timestamps.finished?.toUTC().toString(),
            },
            waiting: this.waitingDuration?.toMillis() / 1000,
            working: this.workingDuration?.toMillis() / 1000,
        };
    }
    public abstract type(): string;

    protected abstract execute(manifest: IBackupManifest): Promise<IBackupManifest>;
}
