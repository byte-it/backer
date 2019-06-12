import {expect} from 'chai';
import {BackupSourceMysql} from './BackupSourceMysql';

describe('BackupSourceMysql', () => {
  describe('fromContainer', () => {
    it('should throw an error if the mysql user is missing', () => {
      expect(() => BackupSourceMysql.fromContainer(null)).to.throw(Error);
    });
    it('should throw an error if the host can\'t be found', () => {
      expect(() => BackupSourceMysql.fromContainer(null)).to.throw(Error);
    });
    it('should throw an error if some required label is missing', () => {
      expect(() => BackupSourceMysql.fromContainer(null)).to.throw(Error);
    });
    it('should prefer blacklist over whitelist', async (done) => {

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
      const source = await BackupSourceMysql.fromContainer(testContainer);
      // @ts-ignore
      expect(source.whiteListTables).to.be.null;
      done();
    });
    it('should read all labels correctly', async (done) => {

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
      const source = await BackupSourceMysql.fromContainer(testContainer);
      // @ts-ignore
      expect(source.whiteListTables).to.be.null;
      done();
    });
  });
  describe('constructor', () => {
    it('should initialize correctly', () => {

    });
    it('should prefer blacklist over whitelist');
  });
});
