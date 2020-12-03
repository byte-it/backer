import {singleton} from 'tsyringe';
import {Job} from './Job';

/**
 * Dead simple queue
 * Just execute the incoming tasks
 * @todo TEST
 */
@singleton()
export class Queue {

    public async enqueue(job: Job) {
        return job.execute();
    }
}
