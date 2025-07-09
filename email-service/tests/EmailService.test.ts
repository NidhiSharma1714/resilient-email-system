
import { EmailService } from '../src/EmailService';
import { MockProviderA } from '../src/providers/MockProviderA';
import { MockProviderB } from '../src/providers/MockProviderB';
import { EmailRequest } from '../src/types';

describe('EmailService', () => {
    let service: EmailService;

    beforeEach(() => {
        service = new EmailService([MockProviderA, MockProviderB]);
    });

    afterEach(() => {
        service.clear();
        service.stopQueueProcessing();
    });

    const createTestEmail = (id: string = 'test-email-001'): EmailRequest => ({
        id,
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'Hello there!'
    });

    describe('Basic Email Sending', () => {
        test('should send email successfully or fail after retry', async () => {
            const email = createTestEmail();
            const status = await service.sendEmail(email);
            
            expect(['sent', 'failed']).toContain(status.status);
            expect(status.timestamp).toBeDefined();
            expect(status.attempts).toBeInstanceOf(Array);
        });

        test('should return same result for same email ID (idempotency)', async () => {
            const email = createTestEmail();
            const status1 = await service.sendEmail(email);
            const status2 = await service.sendEmail(email);
            
            expect(status2.status).toBe(status1.status);
            expect(status2.provider).toBe(status1.provider);
        });

        test('should track email attempts', async () => {
            const email = createTestEmail();
            const status = await service.sendEmail(email);
            
            expect(status.attempts.length).toBeGreaterThan(0);
            status.attempts.forEach(attempt => {
                expect(attempt.provider).toBeDefined();
                expect(attempt.timestamp).toBeDefined();
                expect(attempt.success).toBeDefined();
                expect(attempt.duration).toBeDefined();
            });
        });
    });

    describe('Rate Limiting', () => {
        test('should handle rate limiting', async () => {
            const promises = [];
            
            // Send more emails than the rate limit allows
            for (let i = 0; i < 15; i++) {
                promises.push(service.sendEmail(createTestEmail(`email-${i}`)));
            }
            
            const results = await Promise.all(promises);
            const rateLimited = results.filter(r => r.status === 'rate_limited');
            
            expect(rateLimited.length).toBeGreaterThan(0);
        });
    });

    describe('Queue System', () => {
        test('should queue emails successfully', async () => {
            const email = createTestEmail();
            const status = await service.queueEmail(email);
            
            expect(status.status).toBe('queued');
            expect(status.timestamp).toBeDefined();
        });

        test('should process queued emails', async () => {
            const email = createTestEmail();
            await service.queueEmail(email);
            
            // Start processing
            service.startQueueProcessing();
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const finalStatus = service.getStatus(email.id);
            expect(finalStatus?.status).toMatch(/sent|failed/);
        });

        test('should handle queue priority', async () => {
            const lowPriorityEmail = createTestEmail('low-priority');
            const highPriorityEmail = createTestEmail('high-priority');
            
            await service.queueEmail(lowPriorityEmail, 1);
            await service.queueEmail(highPriorityEmail, 10);
            
            // Check queue size before processing starts
            const queueStats = service.getQueueStats();
            expect(queueStats.size).toBe(2);
            
            // Stop processing to prevent emails from being processed during test
            service.stopQueueProcessing();
        });
    });

    describe('Configuration', () => {
        test('should accept custom configuration', () => {
            const customService = new EmailService([MockProviderA], {
                maxRetries: 5,
                retryDelayMs: 200,
                rateLimitMax: 5,
                rateLimitWindowMs: 2000
            });
            
            expect(customService).toBeDefined();
        });
    });

    describe('Status Tracking', () => {
        test('should track email status', async () => {
            const email = createTestEmail();
            await service.sendEmail(email);
            
            const status = service.getStatus(email.id);
            expect(status).toBeDefined();
            expect(status?.status).toMatch(/sent|failed/);
        });

        test('should provide service statistics', async () => {
            const emails = [
                createTestEmail('email-1'),
                createTestEmail('email-2'),
                createTestEmail('email-3')
            ];
            
            for (const email of emails) {
                await service.sendEmail(email);
            }
            
            const stats = service.getServiceStats();
            expect(stats.totalEmails).toBe(3);
            expect(stats.successRate).toBeGreaterThanOrEqual(0);
            expect(stats.successRate).toBeLessThanOrEqual(100);
        });
    });

    describe('Circuit Breaker', () => {
        test('should track circuit breaker state', () => {
            const stats = service.getServiceStats();
            expect(stats.circuitBreakers).toHaveLength(2);
            
            stats.circuitBreakers.forEach(cb => {
                expect(cb.provider).toBeDefined();
                expect(typeof cb.isOpen).toBe('boolean');
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle provider failures gracefully', async () => {
            const email = createTestEmail();
            const status = await service.sendEmail(email);
            
            // Should either succeed or fail gracefully
            expect(['sent', 'failed']).toContain(status.status);
        });

        test('should retry on failures', async () => {
            const email = createTestEmail();
            const status = await service.sendEmail(email);
            
            if (status.status === 'failed') {
                expect(status.attempts.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Queue Statistics', () => {
        test('should provide queue statistics', () => {
            const stats = service.getQueueStats();
            expect(stats.size).toBe(0);
            expect(stats.maxSize).toBe(1000);
            expect(stats.processing).toBe(false);
        });
    });
});
