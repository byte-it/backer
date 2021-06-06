import got from 'got';
// @ts-ignore
import {IBackupMandateJSON} from '../../../src/Backup/BackupMandate';
import {BaseCommand} from '../../BaseCommand';

export default class MandatesShow extends BaseCommand {
    public static description = 'Shows full info about the mandate';

    public static args = [
        {
            name: 'id',
            required: true,
        },
    ];

    public async run() {
        const {args} = this.parse(MandatesShow);

        const body = await got(`${this.getAPIHost()}/mandates/${args.id}`).json<{ data: IBackupMandateJSON[] }>();

        this.log(JSON.stringify(body.data, null, 2));

    }
}
