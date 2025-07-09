import { EmailService } from './EmailService';
import { MockProviderA } from './providers/MockProviderA';
import { MockProviderB } from './providers/MockProviderB';
import { EmailRequest } from './types';
import { Logger } from './utils/Logger';

async function demo() {
    Logger.info('Starting Email Service Demo...');

    // Create email service with custom configuration
    const service = new EmailService([MockProviderA, MockProviderB], {
        maxRetries: 3,
        retryDelayMs: 100,
        rateLimitMax: 5,
        rateLimitWindowMs: 1000,
        circuitBreakerThreshold: 3,
        circuitBreakerTimeoutMs: 5000,
        queueMaxSize: 100,
        queueProcessIntervalMs: 200
    });

    // Example 1: Send email immediately
    Logger.info('\n=== Example 1: Immediate Email Sending ===');
    const email1: EmailRequest = {
        id: 'demo-email-1',
        to: 'user@example.com',
        subject: 'Welcome to our service!',
        body: 'Thank you for signing up.',
        priority: 'high'
    };

    const status1 = await service.sendEmail(email1);
    Logger.info(`Email 1 Status: ${status1.status}`);
    if (status1.provider) {
        Logger.info(`Sent via: ${status1.provider}`);
    }
    if (status1.attempts.length > 0) {
        Logger.info(`Attempts: ${status1.attempts.length}`);
    }

    // Example 2: Queue emails for processing
    Logger.info('\n=== Example 2: Queue Email Processing ===');
    const emails: EmailRequest[] = [
        {
            id: 'queued-email-1',
            to: 'user1@example.com',
            subject: 'Queued Email 1',
            body: 'This email was queued.',
            priority: 'normal'
        },
        {
            id: 'queued-email-2',
            to: 'user2@example.com',
            subject: 'Queued Email 2',
            body: 'This email was also queued.',
            priority: 'high'
        },
        {
            id: 'queued-email-3',
            to: 'user3@example.com',
            subject: 'Queued Email 3',
            body: 'Another queued email.',
            priority: 'low'
        }
    ];

    // Queue all emails
    for (const email of emails) {
        const status = await service.queueEmail(email, 
            email.priority === 'high' ? 10 : 
            email.priority === 'normal' ? 5 : 1
        );
        Logger.info(`Queued email ${email.id}: ${status.status}`);
    }

    // Start processing the queue
    service.startQueueProcessing();

    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Example 3: Check status and statistics
    Logger.info('\n=== Example 3: Status and Statistics ===');
    
    // Check individual email status
    const emailStatus = service.getStatus('demo-email-1');
    Logger.info(`Email 1 final status: ${emailStatus?.status}`);

    // Get service statistics
    const stats = service.getServiceStats();
    Logger.info(`Service Statistics:`);
    Logger.info(`  Total emails: ${stats.totalEmails}`);
    Logger.info(`  Sent emails: ${stats.sentEmails}`);
    Logger.info(`  Failed emails: ${stats.failedEmails}`);
    Logger.info(`  Success rate: ${stats.successRate.toFixed(1)}%`);

    // Get queue statistics
    const queueStats = service.getQueueStats();
    Logger.info(`Queue Statistics:`);
    Logger.info(`  Queue size: ${queueStats.size}`);
    Logger.info(`  Queue processing: ${queueStats.processing}`);

    // Example 4: Demonstrate idempotency
    Logger.info('\n=== Example 4: Idempotency Test ===');
    const duplicateEmail: EmailRequest = {
        id: 'demo-email-1', // Same ID as before
        to: 'user@example.com',
        subject: 'Duplicate Email',
        body: 'This should not be sent again.'
    };

    const duplicateStatus = await service.sendEmail(duplicateEmail);
    Logger.info(`Duplicate email status: ${duplicateStatus.status}`);
    Logger.info(`Idempotency check: ${duplicateStatus.status === emailStatus?.status ? 'PASSED' : 'FAILED'}`);

    // Example 5: Rate limiting demonstration
    Logger.info('\n=== Example 5: Rate Limiting Test ===');
    const rateLimitPromises = [];
    for (let i = 0; i < 10; i++) {
        rateLimitPromises.push(
            service.sendEmail({
                id: `rate-test-${i}`,
                to: `user${i}@example.com`,
                subject: `Rate Test ${i}`,
                body: `Rate limiting test email ${i}`
            })
        );
    }

    const rateLimitResults = await Promise.all(rateLimitPromises);
    const rateLimited = rateLimitResults.filter(r => r.status === 'rate_limited');
    Logger.info(`Rate limited emails: ${rateLimited.length} out of 10`);

    // Stop queue processing
    service.stopQueueProcessing();
    
    Logger.info('\n=== Demo Complete ===');
    Logger.info('Check the logs above to see how the resilient email service works!');
}

// Run the demo if this file is executed directly
if (require.main === module) {
    demo().catch(console.error);
}

export { demo }; 