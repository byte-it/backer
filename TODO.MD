# TODO

## Basic features
- [x] Implement basic cron handling
- [x] Implement backup tasks (dump & copying to target in job queue)
- [ ] Implement s3 target
- [x] Implement mysql source
- [ ] Implement postgres source
- [ ] Implement retention with count or date
- [x] Use winston as logging framework
- [ ] Create compose test setup
- [x] Switch to dependency injection/service container lib
- [x] Configuration file -> implemented with 'config'
- [x] static configured targets
- [ ] replace moment
- [ ] Static pre configuration for sources
- [ ] Implement queue locking per source
- [ ] Switch to proper queue (Framework to be defined)
- [ ] Docs with Slate
- [x] js doc
- [x] Async factory with decorators and interface for Targets (Decorators cause jsdoc to fail with factory methods )

## Nice to have
- [ ] REST-API (express http/socket)
- [ ] CLI via socket (oclif)
- [ ] Web Interface (vue + tailwind)
- [ ] Custom compression (middleware stack for backups?)
- [ ] Encryption (middleware stack for backups?)
- [ ] Rollback (triggering via api)
- [ ] Rollback tests
- [ ] Integrity checks (File hash)
- [ ] Job queue priority
