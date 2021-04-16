# TODO

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
- [ ] Static config for containers

### Manifest Housekeeping
- [x] Keep backer versions in manifests
- [ ] Give backup manifest uuids via file hash or something
- [x] Ensure manifest validity and integrity

### Testing
- [ ] Unify file access for testing
- [ ] Create compose test setup => **started**

### low prio
- [ ] Docs with Slate

## Realy Nice to have
- [ ] Improved queque parallelity and concurence
- [ ] "File source" to backup Docker Volumes
- [ ] Static pre configuration for sources
- [ ] Implement postgres source
- [ ] REST-API (express http/socket)
- [ ] CLI via socket (oclif)
- [ ] Job queue priority
- [ ] Recover from failure
- [ ] Failure Reporting
- [ ] S3 Target Path prefix
- [ ] More complex retention schedules
- [ ] Implement queue locking per source

## Nice to have
- [ ] Web Interface (vue + tailwind)
- [ ] Rollback (triggering via api)
- [ ] Rollback tests
- [ ] Prometheus export
- [ ] GnuPG Encryption Middleware
