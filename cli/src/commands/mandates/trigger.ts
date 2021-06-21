import {flags} from '@oclif/command';
import {IBackupManifest} from 'backer';
import got from 'got';
import {BaseCommand} from '../../BaseCommand';

export default class MandatesTrigger extends BaseCommand {
    public static description = 'Triggers a backup for the selected backup';

    public static args = [
        {
            name: 'id',
            required: true,
        },
    ];
    public static flags = {
        message: flags.string({
            required: false,
            char: 'm',
            description: 'The message to be included in the manifest',
            multiple: false,
        }),
    };

    public async run() {
        const {args, flags: {message}} = this.parse(MandatesTrigger);
        const postBody: any = {
            trigger: 'cli',
        };

        if (message) {
            postBody.message = message;
        }

        const body = await got
            .post(`${this.getAPIHost()}/mandates/${args.id}/trigger`, {
                json: postBody,
            })
            .json<{ data: IBackupManifest }>();

        this.log(JSON.stringify(body.data, null, 2));

    }
}
