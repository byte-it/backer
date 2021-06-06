import got from 'got';
import {BaseCommand} from '../../BaseCommand';

export default class QueueStats extends BaseCommand {
  public static description = 'describe the command here';

  public static args = [{name: 'id'}];

  public async run() {
    const {args} = this.parse(QueueStats);
    const body = await got(`${this.getAPIHost()}/queue/stats`).json<{data: QueueStats}>();
    this.log(JSON.stringify(body.data, null, 2));
  }
}
