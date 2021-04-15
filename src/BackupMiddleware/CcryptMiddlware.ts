import {IBackupManifest, IBackupManifestStep} from '../IBackupManifest';
import {getLastStep} from '../Util';
import {IBackupMiddleware, IBackupMiddlewareConfig} from './IBackupMiddleware';
import ProcessEnv = NodeJS.ProcessEnv;
import {exec, ExecException} from 'child_process';
import * as md5 from 'md5-file';

export interface IBackupCcryptMiddlewareConfig extends IBackupMiddlewareConfig {
    key: string;
}

export class CcryptMiddlware implements IBackupMiddleware {

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
     * @param name
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
                (error?: ExecException) => {
                    if (error) {
                        reject(error);
                    } else {
                        const md5Hash = md5.sync(`${uri}${this.fileSuffix()}`);
                        const step: IBackupManifestStep = {
                            processor: `middleware.${this.name}`,
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

    /**
     * @return
     */
    public fileSuffix() {
        return '.cpt';
    }
}
