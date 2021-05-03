import * as express from 'express';
import {inject} from 'tsyringe';
import {IRoutes} from './IController';

export abstract class BaseController {

    get routes(): IRoutes {
        return this._routes;
    }

    protected _routes: IRoutes = {};
    protected _server: express.Application;

    constructor(@inject('Server') server: express.Application) {
        this._server = server;
    }

    protected registerRoutes() {
        for (const route in this._routes) {
            if (this._routes.hasOwnProperty(route)) {
                const router = this._server.route(route);
                for (const method in this._routes[route]) {
                    if (this._routes[route].hasOwnProperty(method)) {
                        router[method](this._routes[route][method].bind(this));
                    }
                }
            }
        }
    }
}
