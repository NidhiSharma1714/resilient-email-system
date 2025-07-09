import { EmailQueueItem, EmailRequest } from '../types';
import { Logger } from './Logger';

export class EmailQueue {
    private queue: EmailQueueItem[] = [];
    private processing = false;
    private maxSize: number;
    private processCallback?: (email: EmailRequest) => Promise<void>;

    constructor(maxSize: number = 1000) {
        this.maxSize = maxSize;
    }

    /**
     * Add an email to the queue
     */
    public enqueue(email: EmailRequest, priority: number = 0): boolean {
        if (this.queue.length >= this.maxSize) {
            Logger.warn(`Queue is full, rejecting email ${email.id}`);
            return false;
        }

        const item: EmailQueueItem = {
            email,
            priority,
            timestamp: Date.now(),
            retryCount: 0
        };

        // Insert based on priority (higher priority first)
        const insertIndex = this.queue.findIndex(qItem => qItem.priority < priority);
        if (insertIndex === -1) {
            this.queue.push(item);
        } else {
            this.queue.splice(insertIndex, 0, item);
        }

        Logger.info(`Email ${email.id} queued with priority ${priority}`);
        return true;
    }

    /**
     * Remove and return the next email from the queue
     */
    public dequeue(): EmailQueueItem | undefined {
        return this.queue.shift();
    }

    /**
     * Get the current queue size
     */
    public get size(): number {
        return this.queue.length;
    }

    /**
     * Check if queue is empty
     */
    public get isEmpty(): boolean {
        return this.queue.length === 0;
    }

    /**
     * Check if queue is full
     */
    public get isFull(): boolean {
        return this.queue.length >= this.maxSize;
    }

    /**
     * Set the callback function for processing emails
     */
    public setProcessCallback(callback: (email: EmailRequest) => Promise<void>): void {
        this.processCallback = callback;
    }

    /**
     * Start processing the queue
     */
    public async startProcessing(intervalMs: number = 100): Promise<void> {
        if (this.processing) {
            Logger.warn('Queue processing already started');
            return;
        }

        this.processing = true;
        Logger.info('Starting email queue processing');

        while (this.processing) {
            if (!this.isEmpty && this.processCallback) {
                const item = this.dequeue();
                if (item) {
                    try {
                        await this.processCallback(item.email);
                    } catch (error) {
                        Logger.error(`Failed to process email ${item.email.id}: ${error}`);
                        
                        // Re-queue with increased retry count if under max retries
                        if (item.retryCount < 3) {
                            item.retryCount++;
                            this.enqueue(item.email, item.priority);
                        }
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }

    /**
     * Stop processing the queue
     */
    public stopProcessing(): void {
        this.processing = false;
        Logger.info('Stopping email queue processing');
    }

    /**
     * Clear the queue
     */
    public clear(): void {
        this.queue = [];
        Logger.info('Email queue cleared');
    }

    /**
     * Get queue statistics
     */
    public getStats() {
        return {
            size: this.queue.length,
            maxSize: this.maxSize,
            processing: this.processing,
            oldestItem: this.queue[0]?.timestamp,
            newestItem: this.queue[this.queue.length - 1]?.timestamp
        };
    }
} 