import {IBackupSource} from '../BackupSource/IBackupSource';
import {IBackupManifest} from '../IBackupManifest';
import {Job} from './Job';
import {BackupMandate} from '../Backup/BackupMandate';


export class SourceJob extends Job {

    /**
     * @todo add logging
     * @param manifest
     */
    public async execute(manifest): Promise<IBackupManifest> {
        return await this._mandate.source.backup(manifest);
    }
}
