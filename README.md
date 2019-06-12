# WIP
This is a very early development version!
 
# Backer
Backer is a tool to backup multiple databases running in docker.
It has support for multiple backup sources (database servers) and multiple backup targets (storage like S3, minio or local filesystem).
Backer gets its configuration from the database containers itself by reading their labels.
This method requires Backer to have access to the docker daemon itself via socket. 

## Supported sources
- `mysql`

## Supported targets
- `S3` and compatible 
