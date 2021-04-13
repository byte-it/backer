import {IConfig} from 'config';
import * as Path from 'path';
import {container} from 'tsyringe';
import {BackupMandate} from '../Backup/BackupMandate';
import {IBackupTarget} from '../BackupTarget/IBackupTarget';
import {IBackupManifest, IBackupManifestStep} from '../IBackupManifest';
import {Job} from './Job';
import {getLastStep} from '../Util';


export class TargetJob extends Job {

    /**
     * @todo add logging
     * @param manifest
     */
    public async execute(manifest): Promise<IBackupManifest> {

        this._mandate.logger.log({
            level: 'debug',
            message: `Start target '${this._mandate.target.name}'`
        });

        await this._mandate.target.addBackup(manifest);

        this._mandate.logger.log({
            level: 'debug',
            message: `Finished target '${this._mandate.target.name}'`,
            step: getLastStep(manifest),
        });

        return manifest;
    }
}
