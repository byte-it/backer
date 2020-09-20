# TODO

## Basic features
- [x] Implement basic cron handling
- [x] Implement backup tasks (dump & copying to target in job queue)
- [ ] Implement s3 target
- [ ] Implement mysql source
- [ ] Implement postgres source
- [ ] Implement retention with count or date
- [x] Use winston as logging framework
- [ ] Create compose test setup
- [x] Switch to dependency injection/service container lib
- [ ] Configuration file
- [ ] static configured targets
- [ ] replace moment
- [ ] Static pre configuration for sources
- [ ] Implement queue locking per source

## Nice to have
- [ ] REST-API
- [ ] Web Interface
- [ ] Custom compression
- [ ] Encryption
- [ ] Rollback 
- [ ] Rollback tests
- [ ] Integrity checks (File hash)
- [ ] Job queue priority