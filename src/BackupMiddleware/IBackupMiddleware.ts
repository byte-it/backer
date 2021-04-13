import {IBackupManifest} from '../IBackupManifest';

export interface IBackupMiddlewareConfig {
    /**
     * The type of target.
     */
    type: string;

    /**
     * The name the target should be used under.
     */
    name: string;

    /**
     * Indicates that the target should be default and used for all undefined targets.
     */
    default?: boolean;
}


export interface IBackupMiddleware{
    type: string;
    name: string;
    execute(manifest: IBackupManifest): Promise<any>;
}
