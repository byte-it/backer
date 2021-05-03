import {BackupMandate} from '../Backup/BackupMandate';
import {IBackupMiddleware} from '../BackupMiddleware/IBackupMiddleware';
import {IBackupManifest} from '../IBackupManifest';
import {getLastStep} from '../Util';
import {AJob} from './AJob';

export class MiddlewareJob extends AJob {

    private _middleware: IBackupMiddleware;

    constructor(mandate: BackupMandate, middleware: IBackupMiddleware) {
        super(mandate);
        this._middleware = middleware;
    }

    public toJSON(): object {
        return {
            ...super.toJSON(),
            type: 'middleware',
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
        await this._middleware.execute(manifest);

        this._mandate.logger.log({
            level: 'debug',
            message: `Finished middleware '${this._middleware.name}'`,
            step: getLastStep(manifest),
        });

        return manifest;
    }
}
