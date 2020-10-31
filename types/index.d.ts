export function createSyncFn(filename: string, bufferSize?: number): (inputData?: {}) => any;
export function runAsWorker(workerAsyncFn: (inputData: any) => Promise<any>): Promise<void>;
