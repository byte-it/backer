export abstract class Job {
    public abstract execute(): Promise<any>;
}
