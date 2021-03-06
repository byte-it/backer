import {IBackupManifest} from '../IBackupManifest';
import {getLastStep} from '../Util';
import {AJob} from './AJob';


export class TargetJob extends AJob {

    /**
     * @todo add logging
     * @param manifest
     */
    public async execute(manifest): Promise<IBackupManifest> {

        this._mandate.logger.log({
            level: 'debug',
            message: `Start target '${this._mandate.target.name}'`,
        });

        await this._mandate.target.addBackup(manifest);

        // After transferring to the target, cleanup
        await this._tmp.clean();

        this._mandate.logger.log({
            level: 'debug',
            message: `Finished target '${this._mandate.target.name}'`,
            step: getLastStep(manifest),
        });

        return manifest;
    }

    public type(): string {
        return 'target';
    }
}
