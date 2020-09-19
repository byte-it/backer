import * as path from 'path';
import {singleton} from 'tsyringe';

/**
 * Config is global singleton that provides all configurations
 */
@singleton()
export class Config {

    private readonly _config: object;

    constructor() {
        this._config = {
            tmpPath: process.env.TMP_DIR ? process.env.TMP_DIR : path.join(process.cwd(), 'tmp/'),
            defaultTarget: process.env.DEFAULT_TARGET ? process.env.DEFAULT_TARGET : 'local',
            socketPath: process.env.SOCKET_PATH ? process.env.SOCKET_PATH : '/var/run/docker.sock',
            targets: [
                {
                    name: 'default',
                    type: 'local',
                    dir: './tmp/local',
                },
            ],
        };
    }

    public get(key: string): any {
        return this._config[key];
    }
}
