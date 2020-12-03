import {expect, use} from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs';
import * as Path from 'path';
import * as rimraf from 'rimraf';
import {container} from 'tsyringe';
import {BackupTargetLocal} from './BackupTargetLocal';
import {BackupTargetS3, IBackupTargetS3Config} from './BackupTargetS3';

use(chaiAsPromised);

const testConfig = {type: 'local', name: 'test', dir: './.tmp/targets/test'};

// @todo Write the tests with a fixture
