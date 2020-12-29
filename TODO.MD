# TODO

## Basic features
- [x] Implement basic cron handling
- [x] Implement backup tasks (dump & copying to target in job queue)
- [x] Implement s3 target
- [x] Implement mysql source
- [x] Implement retention with count
- [x] Use winston as logging framework
- [ ] Create compose test setup
- [x] Switch to dependency injection/service container lib
- [x] Configuration file -> implemented with 'config'
- [x] static configured targets
- [ ] replace moment
- [ ] Implement queue locking per source
- [ ] Switch to proper queue (Framework to be defined)
- [ ] Docs with Slate
- [x] js doc
- [x] Async factory with decorators and interface for Targets (Decorators cause jsdoc to fail with factory methods )
- [ ] Give backup manifest uuids via file hash or something
- [ ] Unify file access for testing

## Nice to have
- [ ] "File source" to backup Docker Volumes
- [ ] Static pre configuration for sources
- [ ] Implement postgres source
- [ ] REST-API (express http/socket)
- [ ] CLI via socket (oclif)
- [ ] Web Interface (vue + tailwind)
- [ ] Custom compression (middleware stack for backups?)
- [ ] Encryption (middleware stack for backups?)
- [ ] Rollback (triggering via api)
- [ ] Rollback tests
- [ ] Integrity checks (File hash) -> write hash to manifest
- [ ] Job queue priority
- [ ] Recover from failure
- [ ] Prometheus export
- [ ] Failure Reporting
- [ ] S3 Target Path prefix
- [ ] More complex retention schedules
