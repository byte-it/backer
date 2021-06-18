import {IConfig} from 'config';
import {BaseEncodingOptions, existsSync, Mode, OpenMode, promises as fs} from 'fs';
import * as makeDir from 'make-dir';
import * as Path from 'path';
import {inject, singleton} from 'tsyringe';

@singleton()
export class Storage {

    private readonly _path: string;

    constructor(@inject('Config') config: IConfig) {
        if (Path.isAbsolute(config.get('storagePath'))) {
            this._path = config.get('storagePath');
        } else {
            this._path = Path.normalize(Path.join(process.cwd(), config.get('storagePath')));
        }
    }

    public getPath() {
        return this._path;
    }

    /**
     *
     */
    public async writeFile(
        path: string,
        data: string | object | Uint8Array,
        options?: BaseEncodingOptions & { mode?: Mode, flag?: OpenMode } | BufferEncoding | null,
    ): Promise<void> {
        if (typeof data !== 'string') {
            data = JSON.stringify(data);
        }
        if (Path.isAbsolute(path)) {
            throw new Error('Absolute paths aren\'t allowed');
        }
        const absolutePath = Path.join(this._path, path);

        if (!existsSync(absolutePath)) {
            await makeDir(absolutePath);
        }

        return fs.writeFile(absolutePath, data, options);
    }

}
