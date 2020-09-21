import * as path from 'path';
import {singleton} from 'tsyringe';

/**
 * Config is global singleton that provides all configurations
 * @category Config
 */
@singleton()
export class Config {

    private readonly _config: object;

    /**
     * @constructor
     * @todo Allow injection of config
     */
    constructor() {
        this._config = {
            tmpPath: process.env.TMP_DIR ? process.env.TMP_DIR : path.join(process.cwd(), 'tmp/'),
            defaultTarget: process.env.DEFAULT_TARGET ? process.env.DEFAULT_TARGET : 'local',
            socketPath: process.env.SOCKET_PATH ? process.env.SOCKET_PATH : '/var/run/docker.sock',
            targets: [
                {
                    name: 'default',
                    type: 'local',
                    dir: './.tmp/targets/local',
                    default: true,
                },
            ],
        };
    }

    /**
     * Get a config parameter
     * @param key
     * @todo Implement deep retrieval
     */
    public get(key: string): any {
        return this._config[key];
    }
}
