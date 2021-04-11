import {IConfig} from 'config';
import * as Path from 'path';
import {container} from 'tsyringe';
import {BackupMandate} from '../Backup/BackupMandate';
import {IBackupTarget} from '../BackupTarget/IBackupTarget';
import {IBackupManifest, IBackupManifestStep} from '../IBackupManifest';
import {Job} from './Job';


export class TargetJob extends Job {

    /**
     * @todo add logging
     * @param manifest
     */
    public async execute(manifest): Promise<IBackupManifest> {
        await this._mandate.target.addBackup(manifest);
        return manifest;
    }
}
