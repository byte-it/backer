import {cli} from 'cli-ux';
import got from 'got';
import {IBackupMandateJSON} from '../../../../src/Backup/BackupMandate';
import {BaseCommand} from '../../BaseCommand';

export default class Index extends BaseCommand {
    public static description = 'Views and manages backup mandates';

    public async run() {
        const {args} = this.parse(Index);

        const body = await got(`${this.getAPIHost()}/mandates`).json<{ data: IBackupMandateJSON[] }>();
        cli.table<IBackupMandateJSON>(body.data, {
            id: {
                get: (row) => row.id,
            },
            name: {
                get: (row) => row.name,
            },
            target: {
                get: (row) => row.target.name,
            },
            source: {
                get: (row) => row.source.type,
            },
        });
    }
}
