
export class RateLimiter {
    private requests: number[] = [];

    constructor(private max: number, private interval: number) {}

    public allow(): boolean {
        const now = Date.now();
        this.requests = this.requests.filter(t => now - t < this.interval);
        if (this.requests.length < this.max) {
            this.requests.push(now);
            return true;
        }
        return false;
    }
}
