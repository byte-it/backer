import {ContainerInspectInfo} from 'dockerode';
import {object} from 'dot-object';
import {IMysqlLabels} from './BackupSourceMysql';
import {ILabels} from './Labels';

/**
 * Extract the labels beginning with `backer` and convert the dotted keys to nested objects
 * @param labels
 */
export const extractLabels = (labels: { [propName: string]: any; }): ILabels | IMysqlLabels => {
  // Convert all doted keys to
  const clonedLabels = Object.assign({}, labels);
  object(clonedLabels);
  return clonedLabels.hasOwnProperty('backer') ?
    clonedLabels.backer :
    {};
};

/**
 *
 * @param env
 * @param container
 *
 * @throws Error If the env isn't defined on the container
 */
export const getEnvFromContainer = (env: string, container: ContainerInspectInfo) => {
  const envVars = {};
  for (const envVar of container.Config.Env) {
    const name = envVar.substr(0, envVar.indexOf('='));
    envVars[name] = envVar.substr(envVar.indexOf('=') + 1).replace(/"/g, '');
  }
  if (!(envVars[env])) {
    throw new Error(`Container ${container.Name}: Can't find ENV ${env}`);
  }
  return envVars[env];
};

/**
 *
 * @param label
 * @param container
 * @param defaultValue
 */

export function getConfigFromLabel(
  label: string,
  container: ContainerInspectInfo,
  defaultValue?: string,
): string {
  if (label.startsWith('Env:')) {
      return getEnvFromContainer(label.substr(4), container);
  } else if (label.startsWith('Text:')) {
    return label.substr(5);
  } else if (defaultValue) {
    return defaultValue;
  }
  return '';
}

/**
 *
 * @param network
 * @param container
 *
 * @throws Error Thrown if the network isn't found on the container
 */
export function getHostForContainer(network: string, container: ContainerInspectInfo): string {
  if (container.NetworkSettings.Networks[network]) {
    return container.NetworkSettings.Networks[network].IPAddress;
  } else {
    throw new Error(`Network ${network} not found on container ${container.Name}`);
  }
}
