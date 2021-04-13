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

    private _trainPromise: Promise<any>;

    private _jobPromise: Promise<any>;

    private _concurent: number = 1;

    constructor(@inject('Logger') private _logger: Logger) {
    }

    /**
     * Enqueues a train for processing
     * @param train
     */
    public enqueueTrain(train: JobTrain) {
        train.enqueued = true;
        this._logger.log({
            level: 'debug',
            message: `Enqueue Train ${train.uuid}`
        });
        return this._trains.push(train);
    }

    /**
     * Starts the queue processing
     * @return Promise The promise is resolved when the queue stops working. (If it is stopped)
     */
    public start(): Promise<null> {
        this._logger.info(`Starting queue`);
        this._working = true;
        this._workingPromise = this.work();
        return this._workingPromise;
    }

    /**
     * Stops the queue processing gracefully after the current job is finished.
     * @return Promise The promise is resolved when the queue stops after finishing the current job.
     */
    public stop(): Promise<null>{
        this._working = false;
        return this._workingPromise;
    }

    /**
     * @todo Handle concurrency > 1
     * @private
     */
    private async work(): Promise<null> {
        while (this._working) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (this._trains.length > 0) {
                const train = this._trains.shift();
                this._trainPromise = new Promise(async (resolve, reject) => {
                    train.started = true;
                    let failed = false;
                    this._logger.log({
                        level: 'debug',
                        message: `Start train ${train.uuid}`
                    });
                    while (this._working && train.peak() != null && failed == false) {
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
                                message: `Error in job ${job.uuid}. Train has been canceled`,
                                error: e.toString(),
                                containerName: train.manifest.containerName,
                            });
                            failed = true;
                        }
                    }
                    // Put the train back in queue if queue is stopped
                    if(!this._working && train.peak() != null){
                        this._trains.unshift(train);
                    }
                    resolve();
                });

                this._logger.log({
                    level: 'debug',
                    message: `Finished train ${train.uuid}`
                });
            }
        }
        return;
    }
}
