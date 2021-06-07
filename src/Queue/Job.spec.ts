import {expect, use} from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {IBackupManifest} from '../IBackupManifest';
import {AJob} from './AJob';
import {EStatus} from './Queue';

use(chaiAsPromised);

export class TestJob extends AJob {
    public type(): string {
        return 'test';
    }

    protected execute(manifest: IBackupManifest): Promise<IBackupManifest> {
        return Promise.resolve(undefined);
    }
}

describe('AJob', () => {

    describe('#start', () => {
        it('should set the started status', () => {
            // tslint:disable-next-line:max-classes-per-file
            const job = new class NotFinishingTestJob extends AJob {
                public type(): string {
                    return 'test';
                }

                protected execute(manifest: IBackupManifest): Promise<IBackupManifest> {
                    return new Promise((resolve, reject) => {
                    });
                }

                // @ts-ignore
            }({});

            // @ts-ignore
            job.start({});
            expect(job.status).to.equal(EStatus.STARTED);
        });

        it('should set the finished status', async () => {
            // tslint:disable-next-line:max-classes-per-file
            const job = new class NotFinishingTestJob extends TestJob {
                protected execute(manifest: IBackupManifest): Promise<IBackupManifest> {
                    return Promise.resolve(null);
                }

                // @ts-ignore
            }({});
            job.status = EStatus.ENQUEUED;
            // @ts-ignore
            await job.start({});
            expect(job.status).to.equal(EStatus.FINISHED);
        });

        it('should set the failed status', async () => {
            // tslint:disable-next-line:max-classes-per-file
            const job = new class NotFinishingTestJob extends TestJob {
                protected execute(manifest: IBackupManifest): Promise<IBackupManifest> {
                    return Promise.reject(null);
                }

                // @ts-ignore
            }({});

            try {
                // @ts-ignore
                await job.start({});
            } catch (e) {
            }
            expect(job.status).to.equal(EStatus.FAILED);
        });
    });
});
