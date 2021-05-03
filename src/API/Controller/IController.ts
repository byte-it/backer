import * as express from 'express';

export type IRouteMethod = 'all' | 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

export type IRouteHandler = (request: express.Request, response: express.Response) => Promise<any>;

export interface IRoutes {
    [routeName: string]: {
        [noun in IRouteMethod]?: IRouteHandler
    };
}

export interface IController {
    routes: IRoutes;
}
