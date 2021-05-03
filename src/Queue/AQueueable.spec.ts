import {expect, use} from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {EStatus} from './Queue';
import {DateTime, Duration} from 'luxon';
import {AQueueable} from './AQueueable';

use(chaiAsPromised);

class TestQueueable extends AQueueable {
    public toJSON() {
        return {};
    }
}

describe('AQueueable', () => {
    describe('#status', () => {
        it('should have CREATED as default status', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            expect(job.status).to.equal(EStatus.CREATED);
        });
    });

    describe('#set status', () => {
        it('should set the enqueued timestamp', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            expect(DateTime.isDateTime(job.timestamps.enqueued)).to.be.true;
        });
        it('should set the started timestamp', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            expect(DateTime.isDateTime(job.timestamps.started)).to.be.true;
        });

        it('should set the finished timestamp', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            job.status = EStatus.FINISHED;
            expect(DateTime.isDateTime(job.timestamps.finished)).to.be.true;
        });

        it('should set the finished timestamp on fail', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            job.status = EStatus.FAILED;
            expect(DateTime.isDateTime(job.timestamps.finished)).to.be.true;
        });

        it('shouldn\'t downgrade the status', () => {
            // @ts-ignore
            const job = new TestQueueable({});

            job.status = EStatus.ENQUEUED;
            job.status = EStatus.CREATED;
            expect(job.status).to.equal(EStatus.ENQUEUED);
        });
    });

    describe('#waitingDuration', () => {
        it('should be null for created jobs', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            expect(job.workingDuration).to.be.null;
        });
        it('should be a Duration for enqueued jobs', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            expect(Duration.isDuration(job.waitingDuration)).to.be.true;
        });
        it('should be a Duration for started jobs', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            expect(Duration.isDuration(job.waitingDuration)).to.be.true;
        });
        it('should be a Duration for finished jobs', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            job.status = EStatus.FINISHED;
            expect(Duration.isDuration(job.waitingDuration)).to.be.true;
        });
        it('should be a Duration for failed jobs', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            job.status = EStatus.FAILED;
            expect(Duration.isDuration(job.waitingDuration)).to.be.true;
        });

        it('should be a positiv duration when enqueued and keep growing', async () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(null);
                }, 6);
            });
            expect(job.waitingDuration.toMillis()).to.be.above(5);

            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(null);
                }, 5);
            });
            expect(job.waitingDuration.toMillis()).to.be.above(10);

        });

        it('should be a positiv duration when started', async () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(null);
                }, 5);
            });
            job.status = EStatus.FINISHED;
            expect(job.workingDuration.toMillis()).to.be.above(4);
        });
    });


    describe('#workingDuration', () => {
        it('should be null for created jobs', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            expect(job.workingDuration).to.be.null;
        });
        it('should be null for enqueued jobs', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            expect(job.workingDuration).to.be.null;
        });
        it('should be a Duration for started jobs', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            expect(Duration.isDuration(job.workingDuration)).to.be.true;
        });
        it('should be a Duration for finished jobs', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            job.status = EStatus.FINISHED;
            expect(Duration.isDuration(job.workingDuration)).to.be.true;
        });
        it('should be a Duration for failed jobs', () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            job.status = EStatus.FAILED;
            expect(Duration.isDuration(job.workingDuration)).to.be.true;
        });

        it('should be a positiv duration when started and keep growing', async () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(null);
                }, 6);
            });
            expect(job.workingDuration.toMillis()).to.be.above(5);

            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(null);
                }, 5);
            });
            expect(job.workingDuration.toMillis()).to.be.above(10);

        });

        it('should be a positiv duration when finished', async () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(null);
                }, 5);
            });
            job.status = EStatus.FINISHED;
            expect(job.workingDuration.toMillis()).to.be.above(4);
        });


        it('should be a positiv duration when failed', async () => {
            // @ts-ignore
            const job = new TestQueueable({});
            job.status = EStatus.ENQUEUED;
            job.status = EStatus.STARTED;
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(null);
                }, 5);
            });
            job.status = EStatus.FAILED;
            expect(job.workingDuration.toMillis()).to.be.above(4);
        });

    });
});
