// Simple example of using the Email Service
// Run with: node example.js

const { EmailService } = require('./dist/EmailService');
const { MockProviderA, MockProviderB } = require('./dist/providers/MockProviderA');

async function simpleExample() {
    console.log('🚀 Starting Simple Email Service Example...\n');

    // Create email service
    const service = new EmailService([MockProviderA, MockProviderB]);

    // Send a few emails
    const emails = [
        {
            id: 'welcome-001',
            to: 'user1@example.com',
            subject: 'Welcome!',
            body: 'Thank you for joining our service.'
        },
        {
            id: 'welcome-002',
            to: 'user2@example.com',
            subject: 'Welcome!',
            body: 'Thank you for joining our service.'
        },
        {
            id: 'welcome-003',
            to: 'user3@example.com',
            subject: 'Welcome!',
            body: 'Thank you for joining our service.'
        }
    ];

    console.log('📧 Sending emails...');
    
    for (const email of emails) {
        const status = await service.sendEmail(email);
        console.log(`Email ${email.id}: ${status.status}${status.provider ? ` (via ${status.provider})` : ''}`);
    }

    // Show statistics
    const stats = service.getServiceStats();
    console.log('\n📊 Statistics:');
    console.log(`Total emails: ${stats.totalEmails}`);
    console.log(`Sent: ${stats.sentEmails}`);
    console.log(`Failed: ${stats.failedEmails}`);
    console.log(`Success rate: ${stats.successRate.toFixed(1)}%`);

    console.log('\n✅ Example complete!');
}

// Run the example
simpleExample().catch(console.error); 