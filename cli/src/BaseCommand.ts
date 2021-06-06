import {Command} from '@oclif/command';

export abstract class BaseCommand extends Command {
    protected getAPIHost(): string {
        if (process.env.BACKER_HOST) {
            return process.env.BACKER_HOST;
        } else {
            return 'unix:/var/run/backer:';
        }
    }
}
