import ProcessEnv = NodeJS.ProcessEnv;
import {exec, ExecException} from 'child_process';
import {promises as fs} from 'fs';
import * as md5 from 'md5-file';
import {IBackupManifest, IBackupManifestStep} from '../IBackupManifest';
import {getLastStep} from '../Util';
import {IBackupMiddleware, IBackupMiddlewareConfig} from './IBackupMiddleware';

export interface IBackupCcryptMiddlewareConfig extends IBackupMiddlewareConfig {
    key: string;
}

export class CcryptMiddleware implements IBackupMiddleware {

    get name(): string {
        return this._name;
    }

    get type(): string {
        return this._type;
    }

    private _type: string = 'ccrypt';

    private _name: string;

    private readonly _key: string;

    /**
     *
     */
    public constructor(config: IBackupCcryptMiddlewareConfig) {
        this._name = config.name;
        this._key = config.key;
    }

    public execute(manifest: IBackupManifest): Promise<any> {
        const {cmd, env} = this.buildCommand(manifest);
        const {uri, fileName} = getLastStep(manifest);

        return new Promise<IBackupManifest>((resolve, reject) => {
            exec(
                cmd,
                {env},
                async (error?: ExecException) => {
                    if (error) {
                        reject(error);
                    } else {
                        const tmpFile = `${uri}${this.fileSuffix()}`;
                        const md5Hash = await md5(tmpFile);
                        const {size} = await fs.stat(tmpFile);

                        const step: IBackupManifestStep = {
                            processor: `middleware.${this.name}`,
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
        return '.cpt';
    }

    /**
     *
     * @param manifest
     * @private
     */
    private buildCommand(manifest: IBackupManifest): { cmd: string, env: ProcessEnv } {
        const lastStep = getLastStep(manifest);
        const env = {
            key: this._key,
        };
        return {
            cmd: `ccencrypt -e -E key ${lastStep.uri}`,
            env,
        };
    }
}
