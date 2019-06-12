import {expect} from 'chai';
import {extractLabels, getConfigFromLabel, getHostForContainer} from './Util';

describe('Util', () => {
  describe('extractLabels', () => {
    it('should return an empty object if the KEY is missing', () => {
      const testLabels = {
        test: '',
      };
      const extracted = extractLabels(testLabels);
      expect(extracted).to.be.a('object');
    });
    it('should have all siblings to the given key', () => {
      const testLabels = {
        'backer.test': '',
        'backer.test2': '',
      };
      const extracted = extractLabels(testLabels);
      expect(extracted).to.deep.equal({
        test: '',
        test2: '',
      });
    });
    it('should de dot all objects', () => {
      const testLabels = {
        'backer.test': '',
        'backer.test2.test': '',
      };
      const extracted = extractLabels(testLabels);
      expect(extracted).to.deep.equal({
        test: '',
        test2: {
          test: '',
        },
      });
    });
  });
  describe('getHostForContainer', () => {
    it('should throw an error if the host isn\'t in the given network', () => {
      const container = {
          NetworkSettings: {
            Networks: {},
          },
      };
      // @ts-ignore Ignore typing here to not have provide a full container status
      expect(() => getHostForContainer('test', container)).to.throw(Error);
    });

    it('should get the network correctly', () => {
      const container = {
          NetworkSettings: {
            Networks: {
              test: {
                IPAddress: 'test',
              },
            },
          },
      };

      // @ts-ignore Ignore typing here to not have provide a full container status
      const host = getHostForContainer('test', container);
      expect(host).to.equal('test');
    });
  });
  describe('getConfigFromLabel', () => {
    it('should return the value without the \'Text:\' prefix', () => {
      expect(getConfigFromLabel('Text:test', null)).to.equal('test');
    });
    it('should return the value from the env', () => {
      const testContainer = {
        Config: {
          Env: [
            'TEST=test',
          ],
        },
      };
      // @ts-ignore
      expect(getConfigFromLabel('Env:TEST', testContainer)).to.equal('test');
    });
    it('should return the value from the env', () => {
      const testContainer = {
        Config: {
          Env: [
            'TEST=test',
          ],
        },
      };
      // @ts-ignore
      expect(getConfigFromLabel('Env:TEST', testContainer)).to.equal('test');
    });
    it('should return the value from the env without quotes', () => {
      const testContainer = {
        Config: {
          Env: [
            'TEST="test=test"',
          ],
        },
      };
      // @ts-ignore
      expect(getConfigFromLabel('Env:TEST', testContainer)).to.equal('test=test');
    });
    it('should throw an error if the given env isn\'t defined on the container', () => {
      const testContainer = {
        Config: {
          Env: [],
        },
      };
      // @ts-ignore
      expect(() => getConfigFromLabel('Env:TEST', testContainer)).to.throw();
    });
    it('should return the default value if no label is found', () => {
      expect(getConfigFromLabel('', null, 'test')).to.equal('test');
    });
    it('should return an empty string if no label is found and no default value is provided', () => {
      expect(getConfigFromLabel('', null)).to.equal('');
    });
  });
});
