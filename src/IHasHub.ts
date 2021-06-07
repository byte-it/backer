import {Hub} from '@sentry/node';

export interface IHasHub {
    getHub(): Hub;
    setHub(hub: Hub): void;
}
