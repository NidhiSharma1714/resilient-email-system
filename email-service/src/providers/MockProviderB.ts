
import { EmailProvider, EmailRequest } from '../types';

export const MockProviderB: EmailProvider = {
    name: 'ProviderB',
    async send(email: EmailRequest): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        
        // 30% failure rate (more reliable than ProviderA)
        if (Math.random() < 0.3) {
            throw new Error(`ProviderB failed to send email ${email.id}`);
        }
        
        // Simulate successful send
        console.log(`ProviderB successfully sent email ${email.id} to ${email.to}`);
    },
    
    isHealthy(): boolean {
        // Simulate provider health check
        return Math.random() > 0.05; // 95% healthy
    }
};
