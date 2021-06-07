import 'reflect-metadata';
import {Kernel} from './Kernel';

const kernel = new Kernel();
kernel.bootstrap().then(() => {
    process.exit(0);
});
