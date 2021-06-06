import {IBackupManifest} from '../IBackupManifest';
import {AJob} from './AJob';

export class RetentionJob extends AJob {

    public type(): string {
        return 'retention';
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
