
import { EmailProvider, EmailRequest } from '../types';

export const MockProviderA: EmailProvider = {
    name: 'ProviderA',
    async send(email: EmailRequest): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        // 70% failure rate to test fallback
        if (Math.random() < 0.7) {
            throw new Error(`ProviderA failed to send email ${email.id}`);
        }
        
        // Simulate successful send
        console.log(`ProviderA successfully sent email ${email.id} to ${email.to}`);
    },
    
    isHealthy(): boolean {
        // Simulate provider health check
        return Math.random() > 0.1; // 90% healthy
    }
};
