
import { DailyUsageStats } from "../types";

// Current Gemini Pricing (Per 1 Million Tokens)
// Adjust these as Google updates pricing.
const PRICING = {
  'gemini-3-flash-preview': { input: 0.075, output: 0.30 },
  'gemini-2.5-flash-image': { input: 0.075, output: 0.30 }, // Assuming similar to flash
  'gemini-3-pro-preview': { input: 1.25, output: 5.00 },
  // Fallback
  'default': { input: 0.10, output: 0.40 }
};

const STORAGE_KEY = 'sales_sidekik_usage_stats';

export class UsageService {
  
  private getStats(): Record<string, DailyUsageStats> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private saveStats(stats: Record<string, DailyUsageStats>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }

  public trackUsage(model: string, inputTokens: number, outputTokens: number) {
    const today = new Date().toISOString().split('T')[0];
    const stats = this.getStats();

    if (!stats[today]) {
      stats[today] = {
        date: today,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        requestCount: 0,
        modelBreakdown: {}
      };
    }

    // Determine Rate
    const rate = PRICING[model as keyof typeof PRICING] || PRICING['default'];
    
    // Calculate Cost (Input/1M * Rate + Output/1M * Rate)
    const cost = (inputTokens / 1000000 * rate.input) + (outputTokens / 1000000 * rate.output);

    // Update Stats
    stats[today].inputTokens += inputTokens;
    stats[today].outputTokens += outputTokens;
    stats[today].totalCost += cost;
    stats[today].requestCount += 1;
    
    // Model Breakdown
    if (!stats[today].modelBreakdown[model]) {
        stats[today].modelBreakdown[model] = 0;
    }
    stats[today].modelBreakdown[model] += cost;

    this.saveStats(stats);
    
    // Dispatch event for UI updates
    window.dispatchEvent(new Event('usage_updated'));
  }

  public getHistory(): DailyUsageStats[] {
    const stats = this.getStats();
    return Object.values(stats).sort((a, b) => b.date.localeCompare(a.date));
  }

  public getToday(): DailyUsageStats {
    const today = new Date().toISOString().split('T')[0];
    return this.getStats()[today] || {
        date: today,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        requestCount: 0,
        modelBreakdown: {}
    };
  }
  
  public getLifeTimeTotal(): number {
      const stats = this.getHistory();
      return stats.reduce((acc, curr) => acc + curr.totalCost, 0);
  }
}

export const usageService = new UsageService();
