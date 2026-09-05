/**
 * BatchProcessor.ts - Concurrency-Controlled Asynchronous Batch Image Processing Engine
 * Manages parallel worker queues, per-image optimization, cancellation, progress, and error containment.
 */

import {
  BatchItem,
  BatchProgressCallback,
  OptimizationRequest,
  OptimizationReport
} from './types';
import { ImageOptimizerEngine } from './index';

export class BatchProcessor {
  private queue: BatchItem[] = [];
  private concurrency: number = 3;
  private abortController: AbortController | null = null;
  private isProcessing: boolean = false;

  constructor(concurrency: number = 3) {
    this.concurrency = concurrency;
  }

  /**
   * Add files to batch queue
   */
  public addFiles(files: File[], defaultRequest?: Partial<OptimizationRequest>): BatchItem[] {
    const newItems: BatchItem[] = files.map((file, idx) => {
      const previewUrl = URL.createObjectURL(file);
      return {
        id: `batch-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        previewUrl,
        status: 'idle',
        progress: 0,
        request: {
          source: file,
          fileName: file.name,
          fileSizeBytes: file.size,
          mode: 'smart',
          ...defaultRequest
        }
      };
    });

    this.queue.push(...newItems);
    return newItems;
  }

  /**
   * Remove item from queue
   */
  public removeItem(id: string) {
    const item = this.queue.find(q => q.id === id);
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    this.queue = this.queue.filter(q => q.id !== id);
  }

  /**
   * Clear all items in queue
   */
  public clearQueue() {
    this.queue.forEach(q => {
      if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
      if (q.report?.output.dataUrl) URL.revokeObjectURL(q.report.output.dataUrl);
    });
    this.queue = [];
  }

  public getQueue(): BatchItem[] {
    return this.queue;
  }

  /**
   * Cancel currently running batch processing
   */
  public cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isProcessing = false;
  }

  /**
   * Start processing all idle or failed items in queue
   */
  public async processBatch(onProgress?: BatchProgressCallback): Promise<OptimizationReport[]> {
    if (this.isProcessing) return [];
    this.isProcessing = true;
    this.abortController = new AbortController();

    const pendingItems = this.queue.filter(item => item.status === 'idle' || item.status === 'failed');
    const total = pendingItems.length;
    let completedCount = 0;
    const reports: OptimizationReport[] = [];

    let currentIndex = 0;

    // Worker pool
    const runWorker = async () => {
      while (currentIndex < pendingItems.length) {
        if (this.abortController?.signal.aborted) break;

        const item = pendingItems[currentIndex++];
        item.status = 'processing';
        item.progress = 10;
        if (onProgress) onProgress(completedCount, total, item);

        try {
          // Execute individual image optimization pipeline
          const report = await ImageOptimizerEngine.optimize({
            ...item.request,
            source: item.file,
            fileName: item.file.name,
            fileSizeBytes: item.file.size
          });

          item.status = 'completed';
          item.progress = 100;
          item.report = report;
          reports.push(report);
        } catch (err: any) {
          item.status = 'failed';
          item.error = err.message || 'Processing failed';
        }

        completedCount++;
        if (onProgress) onProgress(completedCount, total, item);
      }
    };

    const workers = Array.from(
      { length: Math.min(this.concurrency, pendingItems.length) },
      () => runWorker()
    );

    await Promise.all(workers);
    this.isProcessing = false;

    return reports;
  }
}
