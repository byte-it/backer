import {IConfig} from 'config';
import {promises as fs} from 'fs';
import * as Path from 'path';
import rimraf = require('rimraf');
import {inject, injectable} from 'tsyringe';

@injectable()
export class TmpStorage {

    private _dirCreated: boolean = false;
    private readonly _basePath: string;
    private readonly _dir: string;
    private readonly _path: string;

    constructor(@inject('Config') config: IConfig, uuid: string) {
        const path = config.get<string>('tmpPath');
        this._basePath = Path.isAbsolute(path) ? path : Path.join(process.cwd(), path);
        this._dir = uuid;
        this._path = Path.join(this._basePath, this._dir);

    }

    /**
     * Creates the tmp dir on the fly on the first call
     */
    public async getPath(): Promise<string> {
        if (!this._dirCreated) {
            await fs.mkdir(this._path);
        }
        return this._path;
    }

    /**
     * Removes the tmp dir with all contents
     */
    public async clean() {
        if (!this._dirCreated) {
            return null;
        }
        return new Promise<void>((resolve, reject) => {
            rimraf(this._path, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
