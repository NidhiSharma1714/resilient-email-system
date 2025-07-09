
# Resilient Email Service

A production-ready, resilient email sending service implemented in TypeScript with comprehensive error handling, retry logic, and fallback mechanisms.

## 🚀 Features

### Core Requirements ✅
- **EmailService class** with multiple mock email providers
- **Retry logic** with exponential backoff
- **Fallback mechanism** to switch providers on failure
- **Idempotency** to prevent duplicate sends
- **Rate limiting** to prevent service overload
- **Status tracking** for all email sending attempts

### Bonus Features ✅
- **Circuit breaker pattern** to prevent cascading failures
- **Simple logging** for monitoring and debugging
- **Basic queue system** for handling high-volume email processing
- **Priority-based queuing** for different email types
- **Comprehensive statistics** and monitoring
- **Configurable settings** for all resilience parameters

## 📦 Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 🎯 Usage

### Basic Usage

```typescript
import { EmailService } from './src/EmailService';
import { MockProviderA, MockProviderB } from './src/providers';

// Create service with default configuration
const service = new EmailService([MockProviderA, MockProviderB]);

// Send email immediately
const email = {
    id: 'unique-email-id',
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Thank you for signing up.'
};

const status = await service.sendEmail(email);
console.log(`Email status: ${status.status}`);
```

### Advanced Configuration

```typescript
// Custom configuration
const service = new EmailService([MockProviderA, MockProviderB], {
    maxRetries: 5,
    retryDelayMs: 200,
    rateLimitMax: 20,
    rateLimitWindowMs: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeoutMs: 15000,
    queueMaxSize: 500,
    queueProcessIntervalMs: 100
});
```

### Queue System

```typescript
// Queue emails for processing
await service.queueEmail(email, 10); // High priority
await service.queueEmail(email2, 5);  // Normal priority
await service.queueEmail(email3, 1);  // Low priority

// Start processing the queue
service.startQueueProcessing();

// Stop processing when done
service.stopQueueProcessing();
```

### Status Tracking

```typescript
// Get individual email status
const status = service.getStatus('email-id');

// Get service statistics
const stats = service.getServiceStats();
console.log(`Success rate: ${stats.successRate}%`);
console.log(`Total emails: ${stats.totalEmails}`);

// Get queue statistics
const queueStats = service.getQueueStats();
console.log(`Queue size: ${queueStats.size}`);
```

## 🏗️ Architecture

### Components

1. **EmailService**: Main orchestrator class
2. **EmailQueue**: Priority-based queue for email processing
3. **RateLimiter**: Token bucket rate limiting
4. **CircuitBreaker**: Prevents cascading failures
5. **MockProviders**: Simulated email providers for testing

### Resilience Patterns

- **Retry with Exponential Backoff**: Automatically retries failed requests with increasing delays
- **Circuit Breaker**: Opens circuit after threshold failures, prevents overwhelming failing services
- **Fallback Providers**: Automatically switches to backup providers when primary fails
- **Rate Limiting**: Prevents service overload with configurable limits
- **Idempotency**: Ensures duplicate requests don't cause duplicate sends

## 📊 Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxRetries` | 3 | Maximum retry attempts per provider |
| `retryDelayMs` | 100 | Base delay for exponential backoff |
| `rateLimitMax` | 10 | Maximum emails per time window |
| `rateLimitWindowMs` | 1000 | Time window for rate limiting (ms) |
| `circuitBreakerThreshold` | 3 | Failures before opening circuit |
| `circuitBreakerTimeoutMs` | 10000 | Circuit breaker timeout (ms) |
| `queueMaxSize` | 1000 | Maximum emails in queue |
| `queueProcessIntervalMs` | 100 | Queue processing interval (ms) |

## 🎮 Demo

Run the interactive demo to see all features in action:

```bash
npm run dev
```

This will demonstrate:
- Immediate email sending
- Queue-based processing
- Rate limiting
- Idempotency
- Status tracking
- Service statistics

## 🧪 Mock Providers

The service includes two mock providers for testing:

- **MockProviderA**: 70% failure rate (simulates unreliable provider)
- **MockProviderB**: 30% failure rate (simulates more reliable provider)

Both providers simulate network delays and random failures to test resilience features.

## 📈 Monitoring

The service provides comprehensive monitoring capabilities:

```typescript
// Service statistics
const stats = service.getServiceStats();
// {
//   totalEmails: 150,
//   sentEmails: 120,
//   failedEmails: 30,
//   successRate: 80.0,
//   queueStats: { size: 5, processing: true },
//   circuitBreakers: [
//     { provider: 'ProviderA', isOpen: false },
//     { provider: 'ProviderB', isOpen: false }
//   ]
// }
```

## 🔧 Extending the Service

### Adding New Providers

```typescript
import { EmailProvider, EmailRequest } from './src/types';

export const MyCustomProvider: EmailProvider = {
    name: 'MyProvider',
    async send(email: EmailRequest): Promise<void> {
        // Your email sending logic here
        await sendViaMyService(email);
    },
    isHealthy(): boolean {
        // Health check logic
        return checkMyServiceHealth();
    }
};
```

### Custom Logging

```typescript
import { Logger } from './src/utils/Logger';

// Extend or replace the Logger class for custom logging
class CustomLogger extends Logger {
    static info(msg: string) {
        // Custom logging logic
        console.log(`[CUSTOM] ${msg}`);
    }
}
```

## 🚨 Error Handling

The service handles various error scenarios:

- **Provider failures**: Automatic retry with exponential backoff
- **Rate limiting**: Graceful degradation with queue system
- **Circuit breaker**: Prevents overwhelming failing services
- **Queue overflow**: Rejects new emails when queue is full
- **Network timeouts**: Configurable retry mechanisms

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📚 Additional Resources

- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
- [Rate Limiting](https://en.wikipedia.org/wiki/Rate_limiting)
- [Idempotency](https://en.wikipedia.org/wiki/Idempotence)
