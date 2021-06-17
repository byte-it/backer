import {BackupMandate} from '../Backup/BackupMandate';
import {IBackupMiddleware} from '../BackupMiddleware/IBackupMiddleware';
import {IBackupManifest} from '../IBackupManifest';
import {TmpStorage} from '../TmpStorage';
import {getLastStep} from '../Util';
import {AJob} from './AJob';
import {IQueueableJSON} from './AQueueable';

export class MiddlewareJob extends AJob {

    private _middleware: IBackupMiddleware;

    constructor(mandate: BackupMandate, tmp: TmpStorage, middleware: IBackupMiddleware) {
        super(mandate, tmp);
        this._middleware = middleware;
    }

    public type(): string {
        return 'middleware';
    }

    public toJSON(): IQueueableJSON & { middleware: { name: string; type: string } } {
        return {
            ...super.toJSON(),
            middleware: {
                name: this._middleware.name,
                type: this._middleware.type,
            },
        };
    }

    protected async execute(manifest: IBackupManifest): Promise<IBackupManifest> {
        this._mandate.logger.log({
            level: 'debug',
            message: `Start middleware '${this._middleware.name}'`,
        });

        await this._middleware.execute(manifest, this._tmp);

        this._mandate.logger.log({
            level: 'debug',
            message: `Finished middleware '${this._middleware.name}'`,
            step: getLastStep(manifest),
        });

        return manifest;
    }
}
