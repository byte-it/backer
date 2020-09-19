/**
 * Represents one backup in the manifest
 */
export interface IBackupManifestBackup {

    /**
     * The name of the backup it self defined by the used name pattern. The name includes the file suffix.
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
     * Time of the creation of the backup
     */
    date: string|Date;

    /**
     * Path of the backup file relative to the manifest file
     */
    path?: string;

    /**
     * Contains optional metadata provided by the source or target
     */
    optional?: {
        [key: string]: any;
    };
}

/**
 * Contains information about the backup target
 */
export interface IBackupManifestTarget {
    name: string;
    type: string;
}

/**
 * The backup manifest keeps information about all made backups for one target.
 * It ist saved alongside the backups itself.
 */
export interface IBackupManifest {
    target: IBackupManifestTarget;
    backups: IBackupManifestBackup[];
}
