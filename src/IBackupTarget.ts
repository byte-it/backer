export interface IBackupTarget {

  /**
   * List all backups on the remote
   */
  getAllBackups(): Promise<string[]>;

  /**
   * Removes the named backup from the remote
   * @param name
   */
  removeBackup(name: string): Promise<void>;

  /**
   * Copy the named backup to a remote
   * @param name
   */
  addBackup(name: string): Promise<void>;
}
