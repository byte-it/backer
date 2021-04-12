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
}
