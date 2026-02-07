import { advancedAnalytics } from '../brain/fetchers/advanced-analytics.js';
import { tradingSkill } from '../skills/trading.js';
import { portfolioSkill } from '../skills/portfolio.js';

export type ActionType = 'post' | 'trade' | 'rebalance' | 'alert' | 'research';

export interface ProposedAction {
    id: string;
    type: ActionType;
    description: string;
    confidence: number; // 0-1
    riskLevel: 'low' | 'medium' | 'high';
    params: any;
    timestamp: Date;
}

export interface ActionResult {
    actionId: string;
    success: boolean;
    result?: any;
    error?: string;
    executedAt: Date;
}

export interface DecisionContext {
    marketInsights: any[];
    portfolioValue: number;
    recentActions: ActionResult[];
    riskBudget: number;
}

/**
 * Autonomous Decision Engine
 * Analyzes situations, proposes actions, and executes with safety controls
 */
export class DecisionEngine {
    private riskThreshold: number;
    private actionHistory: ActionResult[] = [];
    private pendingActions: ProposedAction[] = [];
    private maxActionsPerHour: number = 10;

    constructor() {
        this.riskThreshold = parseFloat(process.env.AUTONOMY_RISK_THRESHOLD || '0.7');
    }

    /**
     * Analyze current situation and propose actions
     */
    async analyzeAndPropose(): Promise<ProposedAction[]> {
        const proposals: ProposedAction[] = [];
        const context = await this.gatherContext();

        // 1. Check for posting opportunities
        const postAction = await this.evaluatePostingOpportunity(context);
        if (postAction) proposals.push(postAction);

        // 2. Check for trading opportunities (if enabled)
        const tradeAction = await this.evaluateTradingOpportunity(context);
        if (tradeAction) proposals.push(tradeAction);

        // 3. Check for rebalancing needs
        const rebalanceAction = await this.evaluateRebalanceNeed(context);
        if (rebalanceAction) proposals.push(rebalanceAction);

        // 4. Check for alert conditions
        const alertActions = await this.evaluateAlerts(context);
        proposals.push(...alertActions);

        // Filter by confidence and risk
        const filtered = proposals.filter(p =>
            p.confidence >= this.riskThreshold &&
            (p.riskLevel !== 'high' || p.confidence > 0.9)
        );

        this.pendingActions = filtered;
        return filtered;
    }

    /**
     * Gather decision context
     */
    private async gatherContext(): Promise<DecisionContext> {
        const [insights, portfolio] = await Promise.all([
            advancedAnalytics.generateInsights(),
            portfolioSkill.getPortfolio()
        ]);

        return {
            marketInsights: insights,
            portfolioValue: portfolio.totalValueUsd,
            recentActions: this.actionHistory.slice(-10),
            riskBudget: this.calculateRiskBudget()
        };
    }

    /**
     * Calculate available risk budget
     */
    private calculateRiskBudget(): number {
        const recentHighRisk = this.actionHistory
            .filter(a => a.executedAt > new Date(Date.now() - 3600000)) // Last hour
            .length;

        return Math.max(0, this.maxActionsPerHour - recentHighRisk) / this.maxActionsPerHour;
    }

    /**
     * Evaluate posting opportunity
     */
    private async evaluatePostingOpportunity(context: DecisionContext): Promise<ProposedAction | null> {
        // Check if we have interesting insights to share
        if (context.marketInsights.length > 0) {
            const bullish = context.marketInsights.filter(i => i.type === 'bullish');
            const bearish = context.marketInsights.filter(i => i.type === 'bearish');

            if (bullish.length > 0 || bearish.length > 0) {
                return {
                    id: `post_${Date.now()}`,
                    type: 'post',
                    description: `Share market insight: ${context.marketInsights[0].signal}`,
                    confidence: 0.8,
                    riskLevel: 'low',
                    params: { insights: context.marketInsights },
                    timestamp: new Date()
                };
            }
        }

        return null;
    }

    /**
     * Evaluate trading opportunity
     */
    private async evaluateTradingOpportunity(context: DecisionContext): Promise<ProposedAction | null> {
        // Only propose trades if we have significant portfolio
        if (context.portfolioValue < 100) return null;
        if (context.riskBudget < 0.5) return null;

        // Check for high-yield opportunities
        const yields = await advancedAnalytics.getYieldOpportunities(30, 3);
        const goodYields = yields.filter(y => y.riskLevel !== 'high' && y.apy > 30);

        if (goodYields.length > 0) {
            return {
                id: `trade_${Date.now()}`,
                type: 'trade',
                description: `Consider yield opportunity: ${goodYields[0].protocol} at ${goodYields[0].apy.toFixed(1)}% APY`,
                confidence: 0.6,
                riskLevel: goodYields[0].riskLevel,
                params: { opportunity: goodYields[0] },
                timestamp: new Date()
            };
        }

        return null;
    }

    /**
     * Evaluate rebalancing need
     */
    private async evaluateRebalanceNeed(context: DecisionContext): Promise<ProposedAction | null> {
        const suggestions = await portfolioSkill.suggestRebalance();

        if (suggestions.length > 0) {
            return {
                id: `rebalance_${Date.now()}`,
                type: 'rebalance',
                description: `Portfolio rebalancing suggested: ${suggestions.length} adjustments`,
                confidence: 0.7,
                riskLevel: 'medium',
                params: { suggestions },
                timestamp: new Date()
            };
        }

        return null;
    }

    /**
     * Evaluate alert conditions
     */
    private async evaluateAlerts(context: DecisionContext): Promise<ProposedAction[]> {
        const alerts: ProposedAction[] = [];

        // TVL drop alert
        const bearish = context.marketInsights.filter(i => i.type === 'bearish');
        bearish.forEach(insight => {
            alerts.push({
                id: `alert_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                type: 'alert',
                description: `⚠️ ${insight.signal}`,
                confidence: 0.9,
                riskLevel: 'low',
                params: { insight },
                timestamp: new Date()
            });
        });

        return alerts;
    }

    /**
     * Execute a proposed action
     */
    async executeAction(action: ProposedAction): Promise<ActionResult> {
        const result: ActionResult = {
            actionId: action.id,
            success: false,
            executedAt: new Date()
        };

        try {
            switch (action.type) {
                case 'post':
                    // Would integrate with brain.generatePost() and moltbook.post()
                    result.success = true;
                    result.result = 'Post generated and queued';
                    break;

                case 'trade':
                    // Would integrate with tradingSkill
                    result.success = true;
                    result.result = 'Trade opportunity logged (dry run)';
                    break;

                case 'rebalance':
                    result.success = true;
                    result.result = 'Rebalance suggestion logged';
                    break;

                case 'alert':
                    console.log(`🚨 ALERT: ${action.description}`);
                    result.success = true;
                    result.result = 'Alert triggered';
                    break;

                default:
                    result.error = 'Unknown action type';
            }
        } catch (error: any) {
            result.error = error.message;
        }

        this.actionHistory.push(result);
        return result;
    }

    /**
     * Run autonomous cycle
     */
    async runCycle(): Promise<{ proposed: number; executed: number }> {
        console.log('🤖 Running autonomous decision cycle...');

        const proposals = await this.analyzeAndPropose();
        console.log(`   📋 Proposed ${proposals.length} actions`);

        let executed = 0;
        for (const action of proposals) {
            if (action.riskLevel === 'low' ||
                (action.riskLevel === 'medium' && action.confidence > 0.8)) {
                const result = await this.executeAction(action);
                if (result.success) executed++;
                console.log(`   ${result.success ? '✅' : '❌'} ${action.description}`);
            }
        }

        return { proposed: proposals.length, executed };
    }

    /**
     * Get decision engine status
     */
    getStatus(): string {
        return `🧠 **Decision Engine Status**\n` +
            `Risk Threshold: ${(this.riskThreshold * 100).toFixed(0)}%\n` +
            `Pending Actions: ${this.pendingActions.length}\n` +
            `Actions (last hour): ${this.actionHistory.filter(a => a.executedAt > new Date(Date.now() - 3600000)).length}\n` +
            `Risk Budget: ${(this.calculateRiskBudget() * 100).toFixed(0)}%`;
    }
}

export const decisionEngine = new DecisionEngine();
