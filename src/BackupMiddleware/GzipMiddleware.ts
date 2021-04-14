import {exec, ExecException} from 'child_process';
import * as md5 from 'md5-file';
import {IBackupManifest, IBackupManifestStep} from '../IBackupManifest';
import {IBackupMiddleware} from './IBackupMiddleware';
import {getLastStep} from '../Util';

/**
 * Compresses the backup with gzip.
 */
export class GzipMiddleware implements IBackupMiddleware {

    get type(): string {
        return this._type;
    }


    get name(): string {
        return this._name;
    }

    protected _type = 'gzip';

    protected _name: string;

    /**
     *
     * @param name
     */
    public constructor(name: string) {
        this._name = name;
    }

    /**
     *
     * @param manifest
     */
    public async execute(manifest: IBackupManifest): Promise<any> {
        const cmd = this.buildCommand(manifest);
        const {uri, fileName} = getLastStep(manifest);

        return new Promise<IBackupManifest>((resolve, reject) => {
            exec(
                cmd,
                {},
                (error?: ExecException) => {
                    if (error) {
                        reject(error);
                    } else {
                        const md5Hash = md5.sync(`${uri}${this.fileSuffix()}`);
                        const step: IBackupManifestStep = {
                            processor: 'middleware.gzip',
                            fileName: `${fileName}${this.fileSuffix()}`,
                            uri: `${uri}${this.fileSuffix()}`,
                            md5: md5Hash,
                        };
                        manifest.steps.push(step);
                        resolve(manifest);
                    }
                },
            );
        });
    }

    /**
     * @return
     */
    public fileSuffix() {
        return '.gz';
    }

    /**
     *
     * @param manifest
     * @private
     */
    private buildCommand(manifest: IBackupManifest): string {
        const lastStep = getLastStep(manifest);
        return `gzip ${lastStep.uri}`;
    }
}
