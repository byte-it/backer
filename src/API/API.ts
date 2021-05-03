import {IConfig} from 'config';
import * as express from 'express';
import {inject, singleton} from 'tsyringe';
import {container} from 'tsyringe';
import {Logger} from 'winston';
import {BackupMandateController} from './Controller/BackupMandateController';
import {IController} from './Controller/IController';
import {QueueController} from './Controller/QueueController';
import {TargetController} from './Controller/TargetController';

interface IAPIConfig {
    socket: boolean;
    web: boolean;
}

@singleton()
export class API {

    private readonly _server: express.Application;

    private _controller: Array<new(server: express.Application) => IController> = [
        BackupMandateController,
        TargetController,
        QueueController,
    ];

    public constructor(@inject('Config') config: IConfig, @inject('Logger') private _logger: Logger) {
        this._server = express();

        container.registerInstance<express.Application>('Server', this._server);

        const apiConfig = config.get<IAPIConfig>('api');
        for (const controllerConstructor of this._controller) {
            container.resolve<IController>(controllerConstructor);
        }

        if (apiConfig.web) {
            _logger.info('Start express on port 8080');
            this._server.listen(8080);
        }

        if (apiConfig.socket) {
            _logger.info('Start express on socket');
            this._server.listen('/var/run/backer');
        }
    }
}
