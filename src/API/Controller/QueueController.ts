import * as express from 'express';
import {inject, injectable} from 'tsyringe';
import {Queue} from '../../Queue/Queue';
import {BaseController} from './BaseController';
import {IRoutes} from './IController';

@injectable()
export class QueueController extends BaseController {
    protected _routes: IRoutes = {
        '/queue/trains': {
            get: this.trains,
        },
        '/queue/stats': {
            get: this.stats,
        },
    };

    private queue: Queue;

    constructor(@inject('Server') server: express.Application, @inject(Queue) queue?: Queue) {
        super(server);
        this.queue = queue;

        this.registerRoutes();
    }

    public async trains(request: express.Request, response: express.Response) {

        response.status(200).send({
            data: this.queue.trains.map((train) => train.toJSON()),
        });
    }

    public async stats(request: express.Request, response: express.Response) {
        response.status(200).send({
            data: {},
        });
    }
}
