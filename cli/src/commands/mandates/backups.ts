import {cli} from 'cli-ux';
import got from 'got';
// @ts-ignore
import {IBackupManifest} from '../../../../src/IBackupManifest';
import {BaseCommand} from '../../BaseCommand';

export default class MandatesBackups extends BaseCommand {
    public static description = 'Lists all backups for this mandate';

    public static args = [
        {
            name: 'id',
            required: true,
        },
    ];

    public async run() {
        const {args} = this.parse(MandatesBackups);

        const body = await got(`${this.getAPIHost()}/mandates/${args.id}/backups`).json<{ data: IBackupManifest[] }>();

        cli.table<IBackupManifest>(body.data, {

            name: {
                get: (row) => row.name,
            },
            date: {
                get: (row) => row.date,
            },
            md5: {
                get: (row) => row.md5,
            },
            path: {
                get: (row) => row.path,
            },
        });

    }
}
