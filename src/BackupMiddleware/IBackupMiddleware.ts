import {IBackupManifest} from '../IBackupManifest';
import {IProvideable} from '../IProvideable';
import {TmpStorage} from '../TmpStorage';

/**
 *
 */
export interface IBackupMiddlewareConfig {
    /**
     * The type of target.
     */
    type: string;

    /**
     * The name the target should be used under.
     */
    name: string;
}

/**
 *
 */
export interface IBackupMiddleware extends IProvideable {

    /**
     *
     * @param manifest
     * @param tmp
     */
    execute(manifest: IBackupManifest, tmp: TmpStorage): Promise<any>;
}
