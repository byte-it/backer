import {BackupMandate} from '../Backup/BackupMandate';
import {IBackupSource} from '../BackupSource/IBackupSource';
import {IBackupManifest} from '../IBackupManifest';
import {getLastStep} from '../Util';
import {AJob} from './AJob';

export class SourceJob extends AJob {

    /**
     * @todo add logging
     * @param manifest
     */
    public async execute(manifest): Promise<IBackupManifest> {
        this._mandate.logger.log({
            level: 'debug',
            message: `Start source '${this._mandate.source.name}'`,
        });

        return await this._mandate.source.backup(manifest);

        this._mandate.logger.log({
            level: 'debug',
            message: `Finished source '${this._mandate.source.name}'`,
            step: getLastStep(manifest),
        });
    }

    public toJSON(): object {
        return {
            ...super.toJSON(),
            type: 'source',
        };
    }
}
