
import { EmailProvider, EmailRequest, EmailStatus, EmailAttempt, EmailServiceConfig } from './types';
import { RateLimiter } from './utils/RateLimiter';
import { Logger } from './utils/Logger';
import { CircuitBreaker } from './utils/CircuitBreaker';
import { EmailQueue } from './utils/EmailQueue';

export class EmailService {
    private providers: EmailProvider[];
    private statusMap: Map<string, EmailStatus> = new Map();
    private rateLimiter: RateLimiter;
    private sentEmails: Set<string> = new Set();
    private breakerMap: Map<string, CircuitBreaker> = new Map();
    private queue: EmailQueue;
    private config: EmailServiceConfig;
    private processing = false;

    constructor(
        providers: EmailProvider[], 
        config: Partial<EmailServiceConfig> = {}
    ) {
        this.providers = providers;
        
        // Default configuration
        this.config = {
            maxRetries: 3,
            retryDelayMs: 100,
            rateLimitMax: 10,
            rateLimitWindowMs: 1000,
            circuitBreakerThreshold: 3,
            circuitBreakerTimeoutMs: 10000,
            queueMaxSize: 1000,
            queueProcessIntervalMs: 100,
            ...config
        };

        this.rateLimiter = new RateLimiter(this.config.rateLimitMax, this.config.rateLimitWindowMs);
        this.queue = new EmailQueue(this.config.queueMaxSize);
        
        // Initialize circuit breakers for each provider
        for (const provider of providers) {
            this.breakerMap.set(provider.name, new CircuitBreaker(
                this.config.circuitBreakerThreshold, 
                this.config.circuitBreakerTimeoutMs
            ));
        }

        // Set up queue processing callback
        this.queue.setProcessCallback(async (email: EmailRequest) => {
            await this.processEmail(email);
        });
    }

    /**
     * Send an email with immediate processing
     */
    public async sendEmail(email: EmailRequest): Promise<EmailStatus> {
        // Check idempotency
        if (this.sentEmails.has(email.id)) {
            Logger.info(`Idempotent request: Email ${email.id} already sent.`);
            return this.statusMap.get(email.id)!;
        }

        // Check rate limiting
        if (!this.rateLimiter.allow()) {
            const status: EmailStatus = {
                status: 'rate_limited',
                error: 'Rate limit exceeded',
                timestamp: Date.now(),
                retryCount: 0,
                attempts: []
            };
            this.statusMap.set(email.id, status);
            Logger.warn(`Rate limit exceeded for email ${email.id}.`);
            return status;
        }

        return await this.processEmail(email);
    }

    /**
     * Queue an email for processing
     */
    public async queueEmail(email: EmailRequest, priority: number = 0): Promise<EmailStatus> {
        // Check idempotency
        if (this.sentEmails.has(email.id)) {
            Logger.info(`Idempotent request: Email ${email.id} already sent.`);
            return this.statusMap.get(email.id)!;
        }

        const status: EmailStatus = {
            status: 'queued',
            timestamp: Date.now(),
            retryCount: 0,
            attempts: []
        };
        this.statusMap.set(email.id, status);

        const success = this.queue.enqueue(email, priority);
        if (!success) {
            status.status = 'failed';
            status.error = 'Queue is full';
            Logger.error(`Failed to queue email ${email.id}: queue is full`);
        }

        // Start processing if not already running
        if (!this.processing) {
            this.startQueueProcessing();
        }

        return status;
    }

    /**
     * Process an email through all available providers with retry logic
     */
    private async processEmail(email: EmailRequest): Promise<EmailStatus> {
        const status: EmailStatus = {
            status: 'pending',
            timestamp: Date.now(),
            retryCount: 0,
            attempts: []
        };
        this.statusMap.set(email.id, status);

        // Try each provider with retry logic
        for (const provider of this.providers) {
            const breaker = this.breakerMap.get(provider.name)!;
            
            // Check circuit breaker
            if (breaker.isOpen()) {
                Logger.warn(`${provider.name} is in circuit breaker state.`);
                continue;
            }

            // Check provider health
            if (!provider.isHealthy()) {
                Logger.warn(`${provider.name} is unhealthy.`);
                continue;
            }

            let attempt = 0;
            while (attempt < this.config.maxRetries) {
                const attemptStart = Date.now();
                
                try {
                    Logger.info(`Attempt ${attempt + 1} via ${provider.name} for email ${email.id}...`);
                    
                    await provider.send(email);
                    
                    const attemptDuration = Date.now() - attemptStart;
                    const emailAttempt: EmailAttempt = {
                        provider: provider.name,
                        timestamp: Date.now(),
                        success: true,
                        duration: attemptDuration
                    };
                    
                    status.attempts.push(emailAttempt);
                    status.status = 'sent';
                    status.provider = provider.name;
                    status.retryCount = attempt;
                    
                    this.sentEmails.add(email.id);
                    Logger.info(`Email ${email.id} sent successfully via ${provider.name}`);
                    
                    return status;
                    
                } catch (error) {
                    const attemptDuration = Date.now() - attemptStart;
                    const emailAttempt: EmailAttempt = {
                        provider: provider.name,
                        timestamp: Date.now(),
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                        duration: attemptDuration
                    };
                    
                    status.attempts.push(emailAttempt);
                    breaker.recordFailure();
                    
                    Logger.error(`Error from ${provider.name} for email ${email.id}: ${error}`);
                    
                    attempt++;
                    
                    // Exponential backoff
                    if (attempt < this.config.maxRetries) {
                        const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
                        await this.sleep(delay);
                    }
                }
            }
        }

        // All providers failed
        status.status = 'failed';
        status.error = 'All providers failed after retries';
        Logger.error(`All providers failed for email ${email.id}`);
        
        return status;
    }

    /**
     * Start processing the email queue
     */
    public async startQueueProcessing(): Promise<void> {
        if (this.processing) {
            Logger.warn('Queue processing already started');
            return;
        }

        this.processing = true;
        await this.queue.startProcessing(this.config.queueProcessIntervalMs);
    }

    /**
     * Stop processing the email queue
     */
    public stopQueueProcessing(): void {
        this.processing = false;
        this.queue.stopProcessing();
    }

    /**
     * Get the status of an email
     */
    public getStatus(emailId: string): EmailStatus | undefined {
        return this.statusMap.get(emailId);
    }

    /**
     * Get all email statuses
     */
    public getAllStatuses(): Map<string, EmailStatus> {
        return new Map(this.statusMap);
    }

    /**
     * Get queue statistics
     */
    public getQueueStats() {
        return this.queue.getStats();
    }

    /**
     * Get service statistics
     */
    public getServiceStats() {
        const totalEmails = this.statusMap.size;
        const sentEmails = Array.from(this.statusMap.values()).filter(s => s.status === 'sent').length;
        const failedEmails = Array.from(this.statusMap.values()).filter(s => s.status === 'failed').length;
        const queuedEmails = Array.from(this.statusMap.values()).filter(s => s.status === 'queued').length;

        return {
            totalEmails,
            sentEmails,
            failedEmails,
            queuedEmails,
            successRate: totalEmails > 0 ? (sentEmails / totalEmails) * 100 : 0,
            queueStats: this.queue.getStats(),
            circuitBreakers: Array.from(this.breakerMap.entries()).map(([name, breaker]) => ({
                provider: name,
                isOpen: breaker.isOpen()
            }))
        };
    }

    /**
     * Clear all stored data (useful for testing)
     */
    public clear(): void {
        this.statusMap.clear();
        this.sentEmails.clear();
        this.queue.clear();
        for (const breaker of this.breakerMap.values()) {
            breaker.reset();
        }
        Logger.info('EmailService data cleared');
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
