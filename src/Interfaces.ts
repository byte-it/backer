export interface ILabels extends Object {
  'type': string;
  'target'?: string;
  'interval': string;
  'retention'?: string;
  'namePattern'?: string;
  'network': string;
  'middleware': string;
}

export interface IDockerEvent {
  'Action': string;
  'Type': 'container' | 'images' | 'volumes' | 'network' | 'daemon'
    | 'plugin' | 'node' | 'service' | 'secret' | 'config';
  'Actor': {
    'ID': string;
    'Attributes': {
      [key: string]: string;
    }
  };
  'time': number;
  'timeNano': number;
}

export interface IDockerContainerEvent extends IDockerEvent {
  'Action': 'attach' | 'commit' | 'copy' | 'create' | 'destroy' | 'detach' | 'die' | 'exec_create' | 'exec_detach'
    | 'exec_start' | 'exec_die' | 'export' | 'health_status' | 'kill' | 'oom' | 'pause' | 'rename' | 'resize'
    | 'restart' | 'start' | 'stop' | 'top' | 'unpause' | 'update';
  'Type': 'container';
  'Actor': {
    'ID': string;
    'Attributes': {
      image: string;
      name: string;
      [key: string]: string;
    },
  };
}
