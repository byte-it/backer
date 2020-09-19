import {container, DependencyContainer, inject, singleton} from 'tsyringe';
import {Logger} from 'winston';
import {Config} from '../Config';
import './BackupTargetLocal';
import {BackupTargetLocal, IBackupTargetLocalConfig} from './BackupTargetLocal';
import {IBackupTarget, IBackupTargetConfig} from './IBackupTarget';

/**
 * The BackupTargetProvider manages all available and configured BackupTargets.
 * BackupTargets need to be statically configured, as they may contain sensitive credentials or are reused by multiple
 * containers.
 */
@singleton()
export class BackupTargetProvider {

    private readonly _config: Config;

    /**
     * The default target to use when none is specified
     */
    private _defaultTarget: IBackupTarget;

    constructor(@inject(Config) config: Config, @inject('Logger') private logger: Logger) {
        this._config = config;

        for (const target of config.get('targets') as IBackupTargetConfig[]) {
            try {
                let instance: IBackupTarget;
                switch (target.type) {
                    case 'local':
                        instance = BackupTargetLocal.createInstance((target as IBackupTargetLocalConfig));
                        break;
                    default:
                        throw new Error(`Target ${target.type} not found.`);
                }
                container.registerInstance(['target', target.name].join('.'), instance);
                if (target.default === true) {
                    container.registerInstance(['target', 'default'].join('.'), instance);
                }
            } catch (e) {
            }

        }
    }

    /**
     * Returns the default backup target
     * @return IBackupTarget
     */
    public getDefaultBackupTarget(): IBackupTarget {
        return this._defaultTarget;
    }

    /**
     * Returns the named target or null if the target name doesn't exist
     * @param name
     */
    public getBackupTarget(name: string): IBackupTarget | null {
        return null;
    }
}
