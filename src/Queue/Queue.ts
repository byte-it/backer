import {inject, singleton} from 'tsyringe';
import {Job} from './Job';
import {IBackupManifest} from '../IBackupManifest';
import {JobTrain} from './JobTrain';
import {Logger} from 'winston';
import {setInterval} from 'timers';

/**
 * A Queue that works with concatenated jobs.
 *
 * @todo TEST
 */
@singleton()
export class Queue {

    private _trains: JobTrain[] =  [];

    private _working: boolean = false;

    private _workingPromise: Promise<any>;

    private _jobPromise: Promise<any>;

    private _concurent: number = 1;

    constructor(@inject('Logger') private _logger: Logger) {
    }


    public enqueueTrain(train: JobTrain) {
        train.enqueued = true;
        this._logger.log({
            level: 'debug',
            message: `Enqueue Train ${train.uuid}`
        });
        return this._trains.push(train);
    }

    public start() {
        this._logger.info(`Starting queue`);
        this._working = true;
        this._workingPromise = this.work();
        return this._workingPromise;
    }

    public stop() {
        this._working = false;
    }

    /**
     * @todo Handle concurrency > 1
     * @private
     */
    private async work() {
        while (this._working) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (this._trains.length > 0) {
                const train = this._trains.shift();
                train.started = true;
                this._logger.log({
                    level: 'debug',
                    message: `Start train ${train.uuid}`
                });
                while (this._working && train.peak() != null) {
                    const job = train.dequeue();
                    try {
                        this._logger.log({
                            level: 'debug',
                            message: `Start job ${job.uuid}`
                        });

                        this._jobPromise = job.start(train.manifest);
                        await this._jobPromise;

                        this._logger.log({
                            level: 'debug',
                            message: `Finished job ${job.uuid}`
                        });
                    } catch (e) {
                        this._logger.log({
                            level: 'error',
                            message: `Error in job ${job.uuid}`,
                            error: e.toString(),
                            containerName: train.manifest.containerName,
                        });
                    }
                }

                this._logger.log({
                    level: 'debug',
                    message: `Finished train ${train.uuid}`
                });
            }
        }
    }
}
