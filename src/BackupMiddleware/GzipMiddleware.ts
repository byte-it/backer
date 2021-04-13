import {exec, ExecException} from 'child_process';
import * as md5 from 'md5-file';
import {IBackupManifest, IBackupManifestStep} from '../IBackupManifest';
import { IBackupMiddleware } from './IBackupMiddleware';

export class GzipMiddleware implements IBackupMiddleware{


    get type(): string {
        return this._type;
    }

    get name(): string {
        return this._name;
    }

    protected _type = 'gzip';

    protected _name: string;

    public constructor(name: string) {
        this._name = name;
    }

    public async execute(manifest: IBackupManifest): Promise<any> {
        const cmd = this.buildCommand(manifest);
        const {uri, fileName} = manifest.steps[manifest.steps.length - 1];

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

    public fileSuffix() {
        return '.gz';
    }

    private buildCommand(manifest: IBackupManifest): string {
        const lastStep = manifest.steps[manifest.steps.length - 1];
        return `gzip ${lastStep.uri}`;
    }
}
