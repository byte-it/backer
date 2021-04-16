import {ObjectSchema, object, string, array} from 'joi';

export interface IBackupManifestStep {
    /**
     * Identifier of the processor for this step
     */
    processor: string;

    /**
     * The name of the file produced by this step
     */
    fileName: string;

    /**
     * The full uri of the file produced by this step
     */
    uri: string;

    /**
     * The md5 of the file produced by this step
     */
    md5: string;

    /**
     * Contains optional metadata provided by the source or target
     */
    optional?: {
        [key: string]: any;
    };
}

export function getIBackupManifestStepSchema(): ObjectSchema {
    return object().keys({
        processor: string().required(),
        fileName: string().required(),
        uri: string().required(),
        md5: string().required(),
        optional: object()
    });
}

/**
 * Represents one backup in the manifest
 * @category BackupTarget
 */
export interface IBackupManifest {

    /**
     * The name of the backup it self defined by the used name pattern. The name excludes the file suffix.
     */
    name: string;
    /**
     * The name of the container the backup was created for
     */
    containerName: string;

    /**
     * The name of the source plugin
     */
    sourceName: string;

    /**
     * A list of all performend steps in the correct order
     */
    steps: IBackupManifestStep[];

    /**
     * Time of the creation of the backup
     */
    date: string | Date;

    /**
     * Path of the backup file relative to the manifest file on the target
     */
    path?: string;

    /**
     * The md5 of the stored backup file
     */
    md5?: string;

    /**
     * Contains optional metadata provided by the source or target
     */
    optional?: {
        [key: string]: any;
    };
}

export function getIBackupManifestSchema(): ObjectSchema {
    return object().keys({
        name: string().required(),
        containerName: string().required(),
        sourceName: string().required(),
        steps: array().required().items(getIBackupManifestStepSchema()),
        date: string().required(),
        md5: string(),
        path: string(),
        optional: object()
    });
}

/**
 * Contains information about the backup target
 * @category BackupTarget
 */
export interface IBackupManifestTarget {
    /**
     * The name of the target
     */
    name: string;

    /**
     * The type of the target
     */
    type: string;
}

export function getIBackupManifestTargetSchema(): ObjectSchema {
    return object().keys({
        name: string().required(),
        type: string().required(),
    });
}

/**
 * The backup manifest keeps information about all made backups for one target.
 * It ist saved alongside the backups itself.
 * @category BackupTarget
 */
export interface IBackupTargetManifest {
    /**
     * The TargetManifest
     */
    target: IBackupManifestTarget;

    /**
     * A list of all done backups by the target
     * @type {IBackupManifest[]}
     */
    backups: IBackupManifest[];

    /**
     * The version of backer that has written the manifest
     */
    version: string;
}

export function getIBackupTargetManifestSchema(): ObjectSchema {
    return object().keys({
        target: getIBackupManifestTargetSchema(),
        backups: array().items(getIBackupManifestSchema()),
        version: string().required(),
    });
}
