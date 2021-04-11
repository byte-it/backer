import {IBackupManifest} from '../IBackupManifest';
import {Job} from './Job';
import {IBackupTarget} from '../BackupTarget/IBackupTarget';
import {BackupMandate} from '../Backup/BackupMandate';

export class RetentionJob extends Job {

    /**
     * @todo add logging
     * @param manifest
     */
    protected async execute(manifest: IBackupManifest): Promise<IBackupManifest> {
        await this._mandate.enforceRetention();
        return manifest;
    }
}
