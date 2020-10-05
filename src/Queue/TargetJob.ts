import {IConfig} from 'config';
import * as Path from 'path';
import {container} from 'tsyringe';
import {IBackupTarget} from '../BackupTarget/IBackupTarget';
import {IBackupManifestBackup} from '../IBackupManifest';
import {Job} from './Job';

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
        const tmpPath = container.resolve<IConfig>('config').get('tmpPath') as string;
        const tmpFile = Path.isAbsolute(tmpPath) ?
            Path.join(tmpPath, name) :
            Path.join(process.cwd(), tmpPath, this._name);
        return this._target.addBackup(tmpFile, this._name, this._manifest);
    }
}
