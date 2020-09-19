import {IBackupTarget} from '../BackupTarget/IBackupTarget';
import {Config} from '../Config';
import {Job} from './Job';
import {container} from 'tsyringe';
import {IBackupManifestBackup} from '../IBackupManifest';

export class TargetJob extends Job {

    private readonly _target: IBackupTarget;

    private readonly _name: string;

    private readonly _manifest: IBackupManifestBackup;

    constructor(target: IBackupTarget, name: string, manifest: IBackupManifestBackup) {
        super();
        this._target = target;
        this._name = name;
        this._manifest = manifest;
    }

    public async execute() {
        const tmpPath = container.resolve(Config).get('tmpPath');
        return this._target.addBackup(`${tmpPath}/${this._name}`, this._name, this._manifest);
    }
}
