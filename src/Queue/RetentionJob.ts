import {IBackupManifest} from '../IBackupManifest';
import {AJob} from './AJob';

export class RetentionJob extends AJob {

    public toJSON(): object {
        return {
            ...super.toJSON(),
            type: 'retention',
        };
    }

    /**
     * @todo add logging
     * @param manifest
     */
    protected async execute(manifest: IBackupManifest): Promise<IBackupManifest> {
        await this._mandate.enforceRetention();
        return manifest;
    }
}
