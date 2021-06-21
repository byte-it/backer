import {IBackupManifest} from 'backer';
import {cli} from 'cli-ux';
import got from 'got';
import {BaseCommand} from '../../BaseCommand';

export default class MandatesBackups extends BaseCommand {
    public static description = 'Lists all backups for this mandate';

    public static args = [
        {
            name: 'id',
            required: true,
        },
        {
            name: 'manifest_id',
            required: false,
            default: null,
        },
    ];

    public async run() {
        const {args} = this.parse(MandatesBackups);

        if (args.hasOwnProperty('manifest_id') && args.manifest_id !== null) {
            const body = await got(`${this.getAPIHost()}/mandates/${args.id}/backups/${args.manifest_id}`)
                .json<{ data: IBackupManifest }>();
            this.log(JSON.stringify(body.data, null, 2));
        } else {
            const body = await got(`${this.getAPIHost()}/mandates/${args.id}/backups`)
                .json<{ data: IBackupManifest[] }>();

            cli.table<IBackupManifest>(body.data, {
                uuid: {
                    get: (row) => row.uuid,
                },
                name: {
                    get: (row) => row.name,
                },
                date: {
                    get: (row) => row.date,
                },
                size: {
                    get: (row) => row.filesize,
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
}
