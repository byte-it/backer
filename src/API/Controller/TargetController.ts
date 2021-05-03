import * as express from 'express';
import {inject, injectable} from 'tsyringe';
import {BackupTargetProvider} from '../../BackupTarget/BackupTargetProvider';
import {BaseController} from './BaseController';
import {IRoutes} from './IController';

@injectable()
export class TargetController extends BaseController {
    protected _routes: IRoutes = {
        '/targets': {
            get: this.index,
        },
        '/targets/:id': {
            get: this.show,
        },
        '/targets/:id/backups': {
            get: this.backups,
        },
    };

    private targetProvider: BackupTargetProvider;

    constructor(
        @inject('Server') server: express.Application,
        @inject(BackupTargetProvider) backupTargetProvider?: BackupTargetProvider,
    ) {
        super(server);
        this.targetProvider = backupTargetProvider;

        this.registerRoutes();
    }

    public async index(request: express.Request, response: express.Response) {
        const targets = [];
        for (const target of this.targetProvider.getTargets()) {
            targets.push({
                name: target.name,
                type: target.type,
            });
        }
        response.status(200).send({data: targets});
    }

    public async show(request: express.Request, response: express.Response) {
        const target = this.targetProvider.getTarget(request.params.id);
        if (!target) {
            response.status(404).send({message: `Target ${request.params.id} not found.`});
        }
        response.status(200).send({
            data: {
                name: target.name,
                type: target.type,
            },
        });
    }

    public async backups(request: express.Request, response: express.Response) {
        const target = this.targetProvider.getTarget(request.params.id);
        if (!target) {
            response.status(404).send({message: `Target ${request.params.id} not found.`});
        }
        const backups = target.getAllBackups();

        response.status(200).send({data: backups});
    }
}
