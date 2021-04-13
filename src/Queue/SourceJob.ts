import {IBackupSource} from '../BackupSource/IBackupSource';
import {IBackupManifest} from '../IBackupManifest';
import {Job} from './Job';
import {BackupMandate} from '../Backup/BackupMandate';
import {getLastStep} from '../Util';


export class SourceJob extends Job {

    /**
     * @todo add logging
     * @param manifest
     */
    public async execute(manifest): Promise<IBackupManifest> {
        this._mandate.logger.log({
            level: 'debug',
            message: `Start source '${this._mandate.source.name}'`
        });

        return await this._mandate.source.backup(manifest);

        this._mandate.logger.log({
            level: 'debug',
            message: `Finished source '${this._mandate.source.name}'`,
            step: getLastStep(manifest),
        });
    }
}
