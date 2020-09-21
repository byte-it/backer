import {ContainerInspectInfo} from 'dockerode';
import {object} from 'dot-object';
import {IMysqlLabels} from './BackupSource/BackupSourceMysql';
import {ILabels} from './Interfaces';

/**
 * Extract the labels beginning with `backer` and convert the dotted keys to nested objects
 *
 * @category Utility
 *
 * @param {object} labels The list of labels.
 * @return {object} An object containing all labels under the `backer.` prefix.
 */
export function extractLabels(labels: { [propName: string]: any; }): ILabels | IMysqlLabels {
    // Convert all doted keys to
    const clonedLabels = {};
    for (const key in labels) {
        if (key.startsWith('backer')) {
            clonedLabels[key] = labels[key];
        }

    }
    object(clonedLabels);
    return clonedLabels.hasOwnProperty('backer') ?
        // @ts-ignore
        clonedLabels.backer :
        {};
}

/**
 * Extract an environment variable from the container.
 *
 * @category Utility
 *
 * @param {string} env
 * @param {dockerode.ContainerInspectInfo} container
 *
 * @throws {Error} If the env isn't defined on the container
 */
export function getEnvFromContainer(env: string, container: ContainerInspectInfo) {
    const envVars = {};
    for (const envVar of container.Config.Env) {
        const name = envVar.substr(0, envVar.indexOf('='));
        envVars[name] = envVar.substr(envVar.indexOf('=') + 1).replace(/"/g, '');
    }
    if (!(envVars[env])) {
        throw new Error(`Container ${container.Name}: Can't find ENV ${env}`);
    }
    return envVars[env];
}

/**
 * Extract the value from a label and handles values that references environment variables.
 *
 * @category Utility
 *
 * @param {string} labelValue The value of the label to be evaluated.
 * @param {dockerode.ContainerInspectInfo} container The container to extract env vars from.
 * @param {string} defaultValue An optional default value.
 * @return {string} The configured value
 */
export function getConfigFromLabel(
    labelValue: string,
    container: ContainerInspectInfo,
    defaultValue?: string,
): string {
    if (labelValue.startsWith('Env:')) {
        return getEnvFromContainer(labelValue.substr(4), container);
    } else if (labelValue.startsWith('Text:')) {
        return labelValue.substr(5);
    } else if (defaultValue) {
        return defaultValue;
    }
    return '';
}

/**
 * Extracts the hostname for a given container in a given network
 *
 * @category Utility
 *
 * @todo improve to allow automatic detection if the db and backer are in the same network
 * @param network {string} The desired network
 * @param container {dockerode.ContainerInspectInfo}
 *
 * @throws {Error} Thrown if the network isn't found on the container
 */
export function getHostForContainer(network: string, container: ContainerInspectInfo): string {
    if (container.NetworkSettings.Networks[network]) {
        return container.NetworkSettings.Networks[network].IPAddress;
    } else {
        throw new Error(`Network ${network} not found on container ${container.Name}`);
    }
}
