# TODO

## Sublists
- [ ] [Queue](src/Queue/TODO.md)
- [ ] [API](src/API/TODO.md)
- [ ] [CLI](cli/TODO.md)

## Basic features
- [x] Implement basic cron handling
- [x] Implement backup tasks (dump & copying to target in job queue)
- [x] Implement s3 target
- [x] Implement mysql source
- [x] Implement retention with count
- [x] Use winston as logging framework
- [x] Switch to dependency injection/service container lib
- [x] Configuration file -> implemented with 'config'
- [x] static configured targets
- [x] replace moment
- [x] Switch to proper queue (self written) => **started**
- [x] js doc
- [x] Async factory with decorators and interface for Targets (Decorators cause jsdoc to fail with factory methods )
- [x] Add MD5 per step and final to manifest
- [x] Middleware Stack -> Compression (gzip), Encryption (ccrypt)
- [x] Static config for containers
- [ ] Automated docker build
- [x] Sentry Integration
- [ ] Debug strange queue behaviour if to many jobs triggert
- [ ] Properly build cli in container
- [ ] Use Mutex for all situations with race conditions
    - [x] manifest writes/reads
    - [x] Locks per container to prevent simultaneously reading
- [ ] Immutability for manifests and other object
### Manifest Housekeeping
- [x] Keep backer versions in manifests
- [x] Give backup manifest uuids via file hash or something
- [x] Ensure manifest validity and integrity
- [x] Add file sizes
- [x] Keep content type in manifest per step
- [ ] Differentiate between creation time meta and final meta  

### Testing
- [ ] Unify file access for testing
- [ ] Create compose test setup => **started**

### low prio
- [ ] Docs with Slate

## Realy Nice to have
- [ ] Improved queue parallelization and concurrence
- [ ] "File source" to backup Docker Volumes
- [ ] Static pre-configuration for sources
- [ ] Implement postgres sources
- [ ] Job queue priority
- [ ] Recover from failure
- [ ] Notification via Services (Mail/Slack/etc .. )
- [ ] S3 Target Path prefix
- [ ] More complex retention schedules

## Nice to have
- [ ] Web Interface (vue + tailwind)
- [ ] Rollback (triggering via api)
- [ ] Rollback tests
- [ ] Prometheus export
- [ ] GnuPG Encryption Middleware
