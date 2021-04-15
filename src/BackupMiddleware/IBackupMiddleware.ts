import {IBackupManifest} from '../IBackupManifest';
import {IProvideable} from '../IProvideable';

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
     */
    execute(manifest: IBackupManifest): Promise<any>;
}
