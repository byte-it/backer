# WIP
This is a very early development version!
 
# Backer
Backer is a tool to back up multiple databases running in docker.
It has support for multiple backup sources (database servers) and multiple backup targets (storage like S3, minio or local filesystem).
Backer gets its configuration from the database containers itself by reading their labels and a static configuration.
This method requires Backer to have access to the docker daemon itself via socket. 

## Supported sources
- `mysql`

## Supported targets
- Local filesystem
- `S3` and compatible (minio)

## Configuration

### Static

Basic configuration:
```yaml
tmpPath: '/var/tmp/backer'
socketPath: '/var/run/docker.sock'
targets: []
```

#### Targets
Backup targets must be configured statically.
Required configuration:
```yaml
targets:
  - name: 'default'
    type: 'local'
```

##### Local
Writes the backups to the local filesystem. Simple but not recommended.  
```yaml
targets:
  - name: 'default'
    type: 'local'
    default: true
    dir: '/var/opt/backer/local'
```

##### S3
Writes the backups to AWS S3 or any compatible service like minio. 
```yaml

targets:
  - name: 'default'
    type: 's3'
    bucket: 'test'
    s3Client:
        endpoint: 'http://minio:9000'
        accessKeyId: 'minio'
        secretAccessKey: 'minio123'
        s3ForcePathStyle: true
```

### Dynamic
The advantage of Backer is the dynamic configuration via docker labels. This behaviour is heavily inspired by Traefik.
A container that needs a database backup just needs to be created with some labels, then Backer picks it up and does
all the heavy lifting.

Some options can be hardcoded to the labels for example the database type. Other things like the database user and
password shouldn't be. With most database containers out there, the user and password are likely to be configured via
environment variables of the container. To use this already available information Backer can extract values from container 
environments. If the label value is prefixed with `Env:` Backer will look for the variable with name after the colon.
Example: The label `Env:MYSQL_ROOT_PASSWORD` will be replaced with the environment variable `MYSQL_ROOT_PASSWORD` of the 
container.

To enable Backer for a container the first label it needs is:
```yaml
backer.enabled: true
``` 

Additional:
```yaml
backer.target: 'default'
backer.type:  'mysql'
backer.interval: '0 0 * * *'
backer.retention: 10
backer.namePattern: '<DATE>-<CONTAINER_NAME>'
backer.network: 'test_default'
```

| Name | Description | Default value |
|---|---|---|
|`target`|The name of the target to use.|`default`|
|`type`|The type of the source plugin to use.||
|`interval`|The interval in wich to create the backups. Checkout [cron](https://www.npmjs.com/package/cron) for all supported values. |`0 0 * * *`|
|`retention`|Defines how many backups should be retained.|`10`|
|`namePattern`|The pattern used to generate the backup names|`<DATE>-<CONTAINER_NAME>`|
|`network`|The docker network to connect to the database container||

#### Sources
Each source plugin can define their own configuration in the labels. Every source configuration label must have 
`backer.PLUGIN_NAME.` as prefix. 

##### `mysql`
The mysql source uses `mysqldump` to create a dump of the database/s.
It supports:
- Dumping multiple databases
- Using table a include lists
- Using table a exclude lists
- Nearly every option `mysqldump` offers

Currently unsupported:
- Exclusion of data for some tables
- Multiple options of the same name

For security reasons, secrets like the user and password will be passed to `mysqldump` via environment variables.
This prevents them from leaking into the logs.

###### Labels
The `mysql` source supports following options via container labels:
- `user`: The database user
- `database`: A single database or multiple databases
- `password`: The database password
- `tableIgnoreList?`: A comma separated list of tables to ignore
- `tableIncludeList?`: A comma separated list tables to include
- `options?`: Each option must be a sub item to the `options` label. The key must be the full name of the option. 
    Each option will be printed in this format: `--OPTION_NAME="OPTION_VALUE"`. Options that don't use a value must use
    a boolean value (false won't be added to the command) 

###### Sample:
```yaml
labels:
    backer.type: mysql,
    backer.mysql.user: Text:root,
    backer.mysql.password: Env:MYSQL_ROOT_PASSWORD,
    backer.mysql.database: test,
    backer.mysql.tableIgnoreList: 'table1,table2',
    backer.mysql.options.no-data: true
    backer.mysql.options.default-auth: 'plugin'
```

As mentioned before, nearly every option of `mysqldump` can be used, some aren't supported because they are incompatible
or are managed by the source itself.
A list of unsupported options:
- `--all-databases`
- `--databases`
- `--ignore-table`
- `--host`
- `--user`
- `--password`
- `--result-file`

## Development
