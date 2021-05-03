import {expect, use} from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {TestJob} from './Job.spec';
import {JobTrain} from './JobTrain';
import {EStatus} from './Queue';

use(chaiAsPromised);

describe('JobTrain', () => {
    describe('#set status', () => {
        it('should set all jobs as enqueued', () => {
            // @ts-ignore
            const train = new JobTrain({});
            // @ts-ignore
            train.enqueue(new TestJob({}));

            train.status = EStatus.ENQUEUED;

            expect(train.peak().status).to.equal(EStatus.ENQUEUED);
        });
    });

});
