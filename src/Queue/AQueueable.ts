import {getCurrentHub, Hub} from '@sentry/node';
import {DateTime, Duration} from 'luxon';
import {v1 as uuid} from 'uuid';
import {IJsonable} from '../API/IJsonable';
import {IHasHub} from '../IHasHub';
import {EStatus} from './Queue';

export interface IQueueTimeStamps {
    enqueued: DateTime;
    started: DateTime;
    finished: DateTime;
}

export interface IQueueableJSON {
    uuid: string;
    status: number;
    type: string;
    timestamps: {
        enqueued: string;
        started: string;
        finished: string;
    };
    waiting: number;
    working: number;
}

export abstract class AQueueable implements IJsonable, IHasHub {
    set status(value: EStatus) {
        if (this._status >= value) {
            return;
        }
        switch (value) {
            case EStatus.ENQUEUED:
                this._timestamps.enqueued = DateTime.now();
                this.getHub().getScope().addBreadcrumb({
                    message: `Enqueued ${this.uuid} ${this.toJSON().type}`,
                    category: 'queue',
                });
                break;
            case EStatus.STARTED:
                this._timestamps.started = DateTime.now();
                this.getHub().getScope().addBreadcrumb({
                    message: `Started ${this.uuid} ${this.toJSON().type}`,
                    category: 'queue',
                });
                break;
            case EStatus.FINISHED:
                this.getHub().getScope().addBreadcrumb({
                    message: `Finished ${this.uuid} ${this.toJSON().type}`,
                    category: 'queue',
                });
            case EStatus.FAILED:
                this._timestamps.finished = DateTime.now();
                break;
        }
        this._status = value;
    }

    get status(): EStatus {
        return this._status;
    }

    get timestamps(): IQueueTimeStamps {
        return this._timestamps;
    }

    /**
     * The duration the job has been waiting in queue for processing
     */
    get waitingDuration(): Duration {
        switch (this._status) {
            case EStatus.CREATED:
                return null;
            case EStatus.ENQUEUED:
                return DateTime.now().diff(this._timestamps.enqueued);
            case EStatus.STARTED:
            case EStatus.FAILED:
            case EStatus.FINISHED:
                return this._timestamps.started.diff(this._timestamps.enqueued);
        }
    }

    /**
     * The duration the job has been working
     */
    get workingDuration(): Duration {
        switch (this._status) {
            case EStatus.CREATED:
            case EStatus.ENQUEUED:
                return null;
            case EStatus.STARTED:
                return DateTime.now().diff(this._timestamps.started);
            case EStatus.FAILED:
            case EStatus.FINISHED:
                return this._timestamps.finished.diff(this._timestamps.started);
        }
    }

    get uuid(): string {
        return this._uuid;
    }

    private _status: EStatus = EStatus.CREATED;

    private readonly _uuid: string;

    private _timestamps: IQueueTimeStamps = {
        enqueued: null,
        started: null,
        finished: null,
    };

    private _hub: Hub;

    protected constructor(hub?: Hub) {
        this._uuid = uuid();

        this._hub = typeof hub  !== 'undefined' ? hub : getCurrentHub();
    }

    public abstract toJSON(): IQueueableJSON;

    public getHub(): Hub {
        return typeof this._hub  !== 'undefined' ? this._hub : getCurrentHub();
    }

    public setHub(hub: Hub): void {
        this._hub = hub;
    }
}
