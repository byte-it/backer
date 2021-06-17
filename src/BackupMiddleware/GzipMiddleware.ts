import {exec, ExecException} from 'child_process';
import {promises as fs} from 'fs';
import * as md5 from 'md5-file';
import {IBackupManifest, IBackupManifestStep} from '../IBackupManifest';
import {getLastStep} from '../Util';
import {IBackupMiddleware} from './IBackupMiddleware';
import {TmpStorage} from '../TmpStorage';

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
     * @param tmp
     */
    public async execute(manifest: IBackupManifest, tmp: TmpStorage): Promise<any> {
        const cmd = this.buildCommand(manifest);
        const {uri, fileName} = getLastStep(manifest);

        return new Promise<IBackupManifest>((resolve, reject) => {
            exec(
                cmd,
                {},
                async (error?: ExecException) => {
                    if (error) {
                        reject(error);
                    } else {
                        const tmpFile = `${uri}${this.fileSuffix()}`;
                        const md5Hash = await md5(tmpFile);
                        const {size} = await fs.stat(tmpFile);
                        const step: IBackupManifestStep = {
                            processor: 'middleware.gzip',
                            fileName: `${fileName}${this.fileSuffix()}`,
                            uri: tmpFile,
                            md5: md5Hash,
                            filesize: size.toString(),
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
