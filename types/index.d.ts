export type CreateFnOptionsRaw = {
    bufferSize?: number | undefined;
    maxBufferSize?: number | undefined;
    timeout?: number | undefined;
};
export type CreateFnOptions = {
    bufferSize: number;
    maxBufferSize: number;
    timeout?: number | undefined;
};
export function createSyncFn(filename: string, bufferSizeOrOptions?: number | CreateFnOptionsRaw | undefined): (...args: any) => any;
export function runAsWorker(workerAsyncFn: (...inputData: any) => Promise<any>): Promise<void>;
