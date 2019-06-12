/**
 * This interface the methods of all back sources
 * A backup source the create of the database dump to the
 * local filesystem
 */
import {Container, ContainerInspectInfo} from 'dockerode';

export interface IBackupSource {

  readonly name: string;

  /**
   *
   * @param name
   */
  backup(name: string): Promise<string>;
}
