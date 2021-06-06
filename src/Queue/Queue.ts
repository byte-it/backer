import * as Sentry from '@sentry/node';
import {inject, singleton} from 'tsyringe';
import {Logger} from 'winston';
import {JobTrain} from './JobTrain';

export enum EStatus {
    CREATED,
    ENQUEUED,
    STARTED,
    FINISHED,
    FAILED,
}

/**
 * A Queue that works with concatenated jobs.
 *
 * @todo TEST
 * @todo Some stats?
 */
@singleton()
export class Queue {
    get stats(): { avg_waiting_time: number; total_backups: number; peak_waiting_time: number } {
        return {...this._stats};
    }

    get trains(): JobTrain[] {
        return this._trains;
    }

    private _trains: JobTrain[] = [];

    private _working: boolean = false;

    private _workingPromise: Promise<any>;

    private _trainPromise: Promise<any>;

    private _jobPromise: Promise<any>;

    private _concurent: number = 1;

    private _stats = {
        peak_waiting_time: 0,
        avg_waiting_time: 0,
        total_backups: 0,
    };

    constructor(@inject('Logger') private _logger: Logger) {
    }

    /**
     * Enqueues a train for processing
     * @param train
     */
    public enqueueTrain(train: JobTrain) {
        train.status = EStatus.ENQUEUED;
        this._logger.log({
            level: 'debug',
            message: `Enqueue Train ${train.uuid}`,
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
    public stop(): Promise<null> {
        this._working = false;
        return this._workingPromise;
    }

    /**
     * @todo Handle concurrency > 1
     * @private
     */
    private async work(): Promise<null> {
        while (this._working) {
            await new Promise<void>((resolve) => setTimeout(resolve, 100));
            if (this._trains.length > 0) {

                const train = this._trains.shift();
                this._trainPromise = new Promise(async (resolve, reject) => {

                    train.status = EStatus.STARTED;
                    let failed = false;

                    this._logger.log({
                        level: 'debug',
                        message: `Start train ${train.uuid}. Waited for ${train.waitingDuration.as('seconds')} seconds.`,
                    });

                    const trainTransaction = Sentry.startTransaction({
                        op: 'queue.job_train',
                        name: train.uuid,
                        tags: {
                            container: train.manifest.containerName,
                        },
                    });

                    while (this._working && train.peak() != null && failed === false) {
                        const job = train.dequeue();
                        try {
                            this._logger.log({
                                level: 'debug',
                                message: `Start job ${job.uuid}. Waited for ${job.waitingDuration.as('seconds')} seconds.`,
                            });
                            const jobTransaction = trainTransaction.startChild({
                                tags: {
                                    type: job.type(),
                                },
                            });
                            this._jobPromise = job.start(train.manifest);
                            await this._jobPromise;
                            jobTransaction.finish();

                            this._logger.log({
                                level: 'debug',
                                message: `Finished job ${job.uuid}. Took  ${job.workingDuration.as('seconds')} seconds.`,
                            });
                        } catch (e) {
                            Sentry.captureException(e);
                            this._logger.log({
                                level: 'error',
                                message: `Error in job ${job.uuid}. Train has been canceled`,
                                error: e.toString(),
                                containerName: train.manifest.containerName,
                            });
                            failed = true;
                            job.status = EStatus.FAILED;
                            train.status = EStatus.FAILED;
                        }
                    }
                    // Put the train back in queue if queue is stopped
                    if (!this._working && train.peak() != null) {
                        this._trains.unshift(train);
                    } else {
                        train.status = EStatus.FINISHED;
                    }
                    trainTransaction.finish();
                    resolve(null);
                });
                await this._trainPromise;

                // Track the stats
                this._stats.total_backups++;
                const secondsWaited = train.waitingDuration.toMillis() / 1000;
                this._stats.avg_waiting_time = this._stats.avg_waiting_time === 0 ?
                    secondsWaited :
                    (this._stats.avg_waiting_time + (secondsWaited)) / 2;

                if (secondsWaited > this._stats.peak_waiting_time) {
                    this._stats.peak_waiting_time = secondsWaited;
                }

                // @todo: store failed trains or something
                this._logger.log({
                    level: 'debug',
                    message: `Finished train ${train.uuid}. Took  ${train.workingDuration.as('seconds')} seconds.`,
                });
            }
        }
        return;
    }
}
