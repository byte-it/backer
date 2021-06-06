import * as bodyParser from 'body-parser';
import {IConfig} from 'config';
import * as express from 'express';
import * as http from 'http';
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

    private readonly _app: express.Application;

    private readonly _servers: {
        socket: http.Server,
        http: http.Server,
    } = {
        socket: null,
        http: null,
    };

    private _controller: Array<new(server: express.Application) => IController> = [
        BackupMandateController,
        TargetController,
        QueueController,
    ];

    public constructor(@inject('Config') config: IConfig, @inject('Logger') private _logger: Logger) {
        this._app = express();
        this._app.use(bodyParser.json({}));
        container.registerInstance<express.Application>('Server', this._app);

        const apiConfig = config.get<IAPIConfig>('api');
        for (const controllerConstructor of this._controller) {
            container.resolve<IController>(controllerConstructor);
        }

        try {
            if (apiConfig.web) {
                _logger.info('Start express on port 8080');
                this._servers.http = this._app.listen(8080);
            }
        } catch (e) {
            this._logger.error(e);
        }

        try {
            if (apiConfig.socket) {
                _logger.info('Start express on socket');
                this._servers.socket = this._app.listen('/var/run/backer');
            }
        } catch (e) {
            this._logger.error(e);
        }
    }

    public async stop() {
        this._servers.http?.close();
        this._servers.socket?.close();
    }
}
