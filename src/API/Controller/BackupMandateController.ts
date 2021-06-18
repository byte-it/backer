import * as express from 'express';
import {inject, injectable} from 'tsyringe';
import {BackupManager} from '../../BackupManager';
import {BaseController} from './BaseController';
import {IRoutes} from './IController';

@injectable()
export class BackupMandateController extends BaseController {

    protected _routes: IRoutes = {
        '/mandates': {
            get: this.index,
        },
        '/mandates/:id': {
            get: this.show,
        },
        '/mandates/:id/trigger': {
            post: this.triggerBackup,
        },
        '/mandates/:id/backups': {
            get: this.backups,
        },
        '/mandates/:id/backups/:manifest_id': {
            get: this.showManifest,
        },
    };

    private backupManager: BackupManager;

    constructor(@inject('Server') server: express.Application, @inject(BackupManager) backupManager?: BackupManager) {
        super(server);
        this.backupManager = backupManager;

        this.registerRoutes();
    }

    public async index(request: express.Request, response: express.Response): Promise<any> {
        const mandates = [];

        for (const mandate of this.backupManager.getBackups()) {
            mandates.push(mandate.toJSON());
        }
        response.status(200).send({data: mandates});
    }

    public async show(request: express.Request, response: express.Response): Promise<any> {
        const mandate = this.backupManager.getBackup(request.params.id);
        if (!mandate) {
            response.status(404).send({message: `Mandate for ${request.params.id} not found.`});
            return;
        }
        response.status(200).send({
            data: mandate.toJSON(),
        });

    }

    public async backups(request: express.Request, response: express.Response): Promise<any> {
        const mandate = this.backupManager.getBackup(request.params.id);
        if (!mandate) {
            response.status(404).send({message: `Mandate for ${request.params.id} not found.`});
            return;
        }

        const backups = mandate.target.getAllBackups().filter((val) => {
            return val.containerName === mandate.containerName;
        });

        response.status(200).send({data: backups});
    }

    public async showManifest(request: express.Request, response: express.Response): Promise<any> {
        const mandate = this.backupManager.getBackup(request.params.id);
        const manifestId = request.params.manifest_id;
        if (!mandate) {
            response.status(404).send({message: `Mandate for ${request.params.id} not found.`});
            return;
        }
        const manifest = mandate.target.getAllBackups().find((value) => {
            return value.uuid === manifestId;
        });

        if (!manifest) {
            response.status(404).send({message: `Manifest for ${request.params.manifest_id} not found.`});
            return;
        }

        response.status(200).send({data: manifest});
    }

    public async triggerBackup(request: express.Request, response: express.Response): Promise<any> {
        const mandate = this.backupManager.getBackup(request.params.id);
        if (!mandate) {
            response.status(404).send({message: `Mandate for ${request.params.id} not found.`});
            return;
        }
        const meta = request.body;
        const manifest = mandate.backup({trigger: 'api', ...meta});

        response.status(200).send({message: 'Backup triggered', data: manifest});
    }
}
