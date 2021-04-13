import { IBackupManifest } from "../IBackupManifest";
import {Job} from './Job';
import {BackupMandate} from '../Backup/BackupMandate';
import {IBackupMiddleware} from '../BackupMiddleware/IBackupMiddleware';
import {getLastStep} from '../Util';

export class MiddlewareJob extends Job {

    private _middleware: IBackupMiddleware;

    constructor(mandate: BackupMandate, middleware: IBackupMiddleware) {
        super(mandate);
        this._middleware = middleware;
    }
    protected async execute(manifest: IBackupManifest): Promise<IBackupManifest> {
        this._mandate.logger.log({
            level: 'debug',
            message: `Start middleware '${this._middleware.name}'`
        })
        await this._middleware.execute(manifest);

        this._mandate.logger.log({
            level: 'debug',
            message: `Finished middleware '${this._middleware.name}'`,
            step: getLastStep(manifest),
        });

        return manifest;
    }
}
