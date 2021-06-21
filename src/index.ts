import 'reflect-metadata';
import {Kernel} from './Kernel';

const kernel = new Kernel();
kernel.bootstrap().then((exitCode) => {
    process.exit(exitCode);
}).catch((err) => {
    process.exit(1);
});

// Export needed interfaces for subpackages
export * from './IBackupManifest';
export {IBackupMandateJSON} from './Backup/BackupMandate';
export {IJobTrainJSON} from './Queue/JobTrain';
