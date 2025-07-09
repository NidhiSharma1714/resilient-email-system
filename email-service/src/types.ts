
export interface EmailRequest {
    id: string;
    to: string;
    subject: string;
    body: string;
    from?: string;
    cc?: string[];
    bcc?: string[];
    priority?: 'low' | 'normal' | 'high';
    retryCount?: number;
}

export interface EmailStatus {
    status: 'pending' | 'sent' | 'failed' | 'rate_limited' | 'queued';
    provider?: string;
    error?: string;
    timestamp: number;
    retryCount: number;
    attempts: EmailAttempt[];
}

export interface EmailAttempt {
    provider: string;
    timestamp: number;
    success: boolean;
    error?: string;
    duration: number;
}

export interface EmailProvider {
    name: string;
    send(email: EmailRequest): Promise<void>;
    isHealthy(): boolean;
}

export interface EmailQueueItem {
    email: EmailRequest;
    priority: number;
    timestamp: number;
    retryCount: number;
}

export interface EmailServiceConfig {
    maxRetries: number;
    retryDelayMs: number;
    rateLimitMax: number;
    rateLimitWindowMs: number;
    circuitBreakerThreshold: number;
    circuitBreakerTimeoutMs: number;
    queueMaxSize: number;
    queueProcessIntervalMs: number;
}
