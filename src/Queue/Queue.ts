import {SpanStatus} from '@sentry/tracing';
import {Mutex} from 'async-mutex';
import {inject, singleton} from 'tsyringe';
import {Logger} from 'winston';
import {Storage} from '../Storage';
import {AJob} from './AJob';
import {IQueueableJSON} from './AQueueable';
import {IJobTrainJSON, JobTrain} from './JobTrain';

export enum EStatus {
    CREATED,
    ENQUEUED,
    STARTED,
    FINISHED,
    FAILED,
}

export interface IStats {
    avg_waiting_time: number;
    total_trains: number;
    failed_trains: number;
    peak_waiting_time: number;
}

export type IFailedTrain =
    IJobTrainJSON &
    { finishedJobs: IQueueableJSON[], failedJob: IQueueableJSON & { error: any } };

/**
 * A Queue that works with concatenated jobs.
 *
 * @todo TEST
 */
@singleton()
export class Queue {
    get failedTrains(): IFailedTrain[] {
        return this._failedTrains;
    }

    get stats(): IStats & { enqueued: number } {
        return {
            ...this._stats, enqueued: this.trains.length,
        };
    }

    get trains(): JobTrain[] {
        return this._trains;
    }

    private _trains: JobTrain[] = [];

    private _failedTrains: IFailedTrain[] = [];

    private _working: boolean = false;

    private _workingPromise: Promise<any>;

    private _trainPromise: Promise<any>;

    private _jobPromise: Promise<any>;

    private _failedTrainsMutex: Mutex;

    private _concurent: number = 1;

    private _stats: IStats = {
        peak_waiting_time: 0,
        avg_waiting_time: 0,
        total_trains: 0,
        failed_trains: 0,
    };

    constructor(@inject('Logger') private _logger: Logger,  @inject(Storage) private _storage: Storage) {
        this._failedTrainsMutex = new Mutex();
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
     *
     * @param train
     * @private
     */
    private async addFailedTrain(train: IFailedTrain) {
        await this._failedTrainsMutex.runExclusive(async () => {
            this._failedTrains.push(train);
            await this._storage.writeFile('queue.json', this._failedTrains);
        });
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
                    train.getHub().pushScope();
                    train.status = EStatus.STARTED;
                    let failed = false;

                    this._logger.log({
                        level: 'debug',
                        message: `Start train ${train.uuid}. Waited for ${train.waitingDuration.as('seconds')} seconds.`,
                    });

                    const trainTransaction = train.getHub().startTransaction({
                        name: 'queue.job_train',
                        op: 'queue.work.train',
                        tags: {
                            container: train.manifest.containerName,
                        },
                    });

                    const finishedJobs: AJob[] = [];

                    while (this._working && train.peak() != null && failed === false) {
                        const job = train.dequeue();
                        train.getHub().setTag('job_type', job.type());
                        const jobTransaction = trainTransaction.startChild({
                            op: 'queue.work.job',
                            data: job.toJSON(),
                        });
                        try {
                            this._logger.log({
                                level: 'debug',
                                message: `Start job ${job.uuid}. Waited for ${job.waitingDuration.as('seconds')} seconds.`,
                            });
                            this._jobPromise = job.start(train.manifest);
                            await this._jobPromise;
                            jobTransaction.setStatus(SpanStatus.Ok);

                            finishedJobs.push(job);
                            this._logger.log({
                                level: 'debug',
                                message: `Finished job ${job.uuid}. Took  ${job.workingDuration.as('seconds')} seconds.`,
                            });
                        } catch (e) {
                            jobTransaction.setStatus(SpanStatus.InternalError);
                            trainTransaction.setStatus(SpanStatus.InternalError);
                            const eventId = train.getHub().captureException(e);
                            this._logger.log({
                                level: 'error',
                                message: `Error in job ${job.uuid}. Train has been canceled`,
                                errorMessage: e.toString(),
                                error: e,
                                containerName: train.manifest.containerName,
                                eventId,
                            });
                            failed = true;
                            job.status = EStatus.FAILED;
                            train.status = EStatus.FAILED;
                            this._stats.failed_trains++;

                            await this.addFailedTrain({
                                ...train.toJSON(),
                                finishedJobs: finishedJobs.map((finishedJob) => finishedJob.toJSON()),
                                failedJob: {...job.toJSON(), error: e},
                            });
                        }
                        jobTransaction.finish();
                    }
                    // Put the train back in queue if queue is stopped
                    if (!this._working && train.peak() != null) {
                        this._trains.unshift(train);
                    } else {
                        train.status = EStatus.FINISHED;
                    }
                    trainTransaction.setStatus(SpanStatus.Ok);
                    trainTransaction.finish();
                    train.getHub().popScope();
                    resolve(null);
                });

                await this._trainPromise;

                // Track the stats
                this._stats.total_trains++;
                const secondsWaited = train.waitingDuration.toMillis() / 1000;
                this._stats.avg_waiting_time = this._stats.avg_waiting_time === 0 ?
                    secondsWaited :
                    (this._stats.avg_waiting_time + (secondsWaited)) / 2;

                if (secondsWaited > this._stats.peak_waiting_time) {
                    this._stats.peak_waiting_time = secondsWaited;
                }

                this._logger.log({
                    level: 'debug',
                    message: `Finished train ${train.uuid}. Took  ${train.workingDuration.as('seconds')} seconds.`,
                });
            }
        }
        return;
    }
}
