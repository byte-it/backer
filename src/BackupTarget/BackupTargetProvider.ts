import {container, DependencyContainer, inject, singleton} from 'tsyringe';
import {Logger} from 'winston';
import {Config} from '../Config';
import './BackupTargetLocal';
import {BackupTargetLocal, IBackupTargetLocalConfig} from './BackupTargetLocal';
import {IBackupTarget, IBackupTargetConfig} from './IBackupTarget';
import {BackupTargetS3, IBackupTargetS3Config} from './BackupTargetS3';

/**
 * The BackupTargetProvider manages all available and configured BackupTargets.
 * BackupTargets need to be statically configured, as they may contain sensitive credentials or are reused by multiple
 * containers.
 *
 * @category BackupTarget
 */
@singleton()
export class BackupTargetProvider {

    /**
     * The default target to use when none is specified
     */
    private _defaultTarget: IBackupTarget;

    constructor(@inject(Config) private config: Config, @inject('Logger') private logger: Logger) {
    }

    public async init() {
        for (const target of this.config.get('targets') as IBackupTargetConfig[]) {
            try {
                let instance: IBackupTarget;
                switch (target.type) {
                    case 'local':
                        instance = await BackupTargetLocal.createInstance((target as IBackupTargetLocalConfig));
                        break;
                    case 's3':
                        instance = await BackupTargetS3.createInstance((target as IBackupTargetS3Config));
                        break;
                    default:
                        throw new Error(`Target ${target.type} not found.`);
                }

                container.registerInstance(['target', target.name].join('.'), instance);
                if (target.default === true) {
                    container.registerInstance(['target', 'default'].join('.'), instance);
                    console.log('Add default');
                }
                this.logger.log({
                    level: 'info',
                    message: `Registered ${['target', target.name].join('.')}. ${target.default ? 'Used as default.' : ''}`,
                });
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
}
