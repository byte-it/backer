# Queue

## Requirements
- Execute chained jobs with as little interruption as possible
- Allow parallel execution as configured
- Prevent resource over usage
- Handle job failures gracefully and in a senseabl manner

- \[Persist the queue and job states to the disk\]
- \[Start from existing state loaded from disk and resume job execution\]
- \[Allow gracefully termination of jobs\]

## Components

### Queue

### Job

### JobTrain

## Persistence
At this stage persistance isn't feasable. A pure container restart might work, but recreations and
updates could to harm. On recreation the tmp dir will be lost and all progress on backups will be lost,
so they need to start over anyway. Updates may break the compability between the persisted queueu data.


## Concurrency
