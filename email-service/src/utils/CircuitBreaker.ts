
export class CircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;

    constructor(private threshold: number, private timeout: number) {}

    isOpen(): boolean {
        const now = Date.now();
        if (this.failures >= this.threshold) {
            if (now - this.lastFailureTime < this.timeout) return true;
            this.reset();
        }
        return false;
    }

    recordFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();
    }

    reset(): void {
        this.failures = 0;
    }
}
