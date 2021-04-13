# TODO

## Basic features
- [x] Implement basic cron handling
- [x] Implement backup tasks (dump & copying to target in job queue)
- [x] Implement s3 target
- [x] Implement mysql source
- [x] Implement retention with count
- [x] Use winston as logging framework
- [ ] Create compose test setup => **started**
- [x] Switch to dependency injection/service container lib
- [x] Configuration file -> implemented with 'config'
- [x] static configured targets
- [x] replace moment
- [ ] Switch to proper queue (self written) => **started**
- [x] js doc
- [x] Async factory with decorators and interface for Targets (Decorators cause jsdoc to fail with factory methods )
- [ ] Give backup manifest uuids via file hash or something
- [ ] Unify file access for testing
- [x] Add MD5 per step and final to manifest
- [ ] Keep backer versions in manifests
- [ ] Middleware Stack -> ~~Compression~~, Encryption (PGP)
- [ ] Ensure manifest validity and integrity

### low prio
- [ ] Docs with Slate

## Realy Nice to have
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
