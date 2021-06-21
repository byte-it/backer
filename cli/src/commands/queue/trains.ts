import {IJobTrainJSON} from 'backer';
import {cli} from 'cli-ux';
import got from 'got';
import {BaseCommand} from '../../BaseCommand';

export default class QueueTrains extends BaseCommand {
    public static description = 'Views and manages backup mandates';

    public async run() {
        const {args} = this.parse(QueueTrains);

        const body = await got(`${this.getAPIHost()}/queue/trains`).json<{ data: IJobTrainJSON[] }>();
        cli.table<IJobTrainJSON>(body.data, {
            id: {
                get: (row) => row.uuid,
            },
            name: {
                get: (row) => row.manifest.containerName,
            },

            status: {
                get: (row) => row.status,
            },
        });
    }
}
