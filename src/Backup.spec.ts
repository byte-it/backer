import {expect} from 'chai';
import {Backup} from './Backup';
import {ContainerInspectInfo} from 'dockerode';

describe('Backup', () => {
  it('should read the labels correctly', () => {
    // @ts-ignore
    const testContainer = {
      Config: {
        Labels: {
          'backer.interval': '* * * * * *',
          'backer.namePattern': 'test',
          'backer.network': 'test',
          'backer.retention': '10',
          'backer.type': 'mysql',
          'backer.mysql.user': 'root',
          'backer.mysql.password': '1234',
          'backer.mysql.database': 'test',
        },
      },
      Id: 'testId',
      Name: 'test',
      NetworkSettings: {
        Networks: {
          test: {
            IPAddress: '1.1.1.1',
          },
        },
      },
    };
    // @ts-ignore
    const backup = Backup.fromContainer(testContainer);

    expect(backup.containerId).to.equal('testId');
    expect(backup.interval).to.equal('* * * * * *');
    expect(backup.namePattern).to.equal('test');
    expect(backup.retention).to.equal('10');
  });

  it('should apply the default labels correctly', () => {
    const testContainer = {
      Config: {
        Labels: {
          'backer.interval': '* * * * * *',
          'backer.namePattern': 'test',
          'backer.network': 'test',
          'backer.retention': '10',
          'backer.type': 'mysql',
        },
      },
      Name: 'test',
      NetworkSettings: {
        Networks: {
          test: {
            IPAddress: '1.1.1.1',
          },
        },
      },
    };
    // @ts-ignore
    const backup = Backup.fromContainer(testContainer);
  });
});
