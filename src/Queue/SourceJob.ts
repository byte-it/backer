import {IBackupSource} from '../BackupSource/IBackupSource';
import {Job} from './Job';
import {IBackupManifestBackup} from '../IBackupManifest';

/**
 * @todo TEST!
 */
export class SourceJob extends Job {

    private readonly _source: IBackupSource;

    private readonly _name: string;

    constructor(source: IBackupSource, name: string, manifest: IBackupManifestBackup) {
        super();
        this._source = source;
        this._name = name;
    }

    public async execute() {
        return await this._source.backup(this._name);
    }
}
