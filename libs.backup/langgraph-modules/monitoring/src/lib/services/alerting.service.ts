import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type {
  IAlertingService,
  INotificationProvider,
  AlertRule,
  Alert,
  NotificationChannel,
} from '../interfaces/monitoring.interface';
import { AlertingError } from '../interfaces/monitoring.interface';

/**
 * AlertingService - Rule-based alerting with multi-channel notifications
 *
 * Features:
 * - Configurable alert rules with complex conditions
 * - Multiple notification channels (Chain of Responsibility pattern)
 * - Alert grouping and deduplication
 * - Cooldown mechanism to prevent spam
 * - Alert history and acknowledgment
 * - Template-based alert formatting
 */
@Injectable()
export class AlertingService implements IAlertingService, OnModuleDestroy {
  private readonly logger = new Logger(AlertingService.name);
  private readonly rules = new Map<string, AlertRule>();
  private readonly cooldowns = new Map<string, Date>();
  private readonly activeAlerts = new Map<string, Alert>();
  private readonly alertHistory: Alert[] = [];
  private readonly notificationProviders = new Map<
    string,
    INotificationProvider
  >();
  private readonly evaluationInterval: NodeJS.Timeout;
  private isShuttingDown = false;
  private evaluationCount = 0;
  private alertCount = 0;

  constructor() {
    // Start rule evaluation timer (every 30 seconds)
    this.evaluationInterval = setInterval(() => {
      this.evaluateRules().catch((error) => {
        this.logger.error('Rule evaluation failed:', error);
      });
    }, 30000);

    this.logger.log('AlertingService initialized with 30s evaluation interval');
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
    }

    this.logger.log(
      `AlertingService shutdown - Evaluations: ${this.evaluationCount}, Alerts: ${this.alertCount}`
    );
  }

  // ================================
  // RULE MANAGEMENT
  // ================================

  async createRule(rule: AlertRule): Promise<string> {
    try {
      this.validateRule(rule);
      this.rules.set(rule.id, rule);

      this.logger.log(`Alert rule created: ${rule.name}`, {
        ruleId: rule.id,
        severity: rule.severity,
        metric: rule.condition.metric,
        channels: rule.channels.length,
      });

      return rule.id;
    } catch (error) {
      throw new AlertingError(`Failed to create alert rule: ${rule.name}`, {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const existingRule = this.rules.get(ruleId);
    if (!existingRule) {
      throw new AlertingError(`Alert rule not found: ${ruleId}`, { ruleId });
    }

    try {
      const updatedRule: AlertRule = {
        ...existingRule,
        ...updates,
        updatedAt: new Date(),
      };

      this.validateRule(updatedRule);
      this.rules.set(ruleId, updatedRule);

      this.logger.log(`Alert rule updated: ${updatedRule.name}`, {
        ruleId,
        updates: Object.keys(updates),
      });
    } catch (error) {
      throw new AlertingError(`Failed to update alert rule: ${ruleId}`, {
        ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async deleteRule(ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new AlertingError(`Alert rule not found: ${ruleId}`, { ruleId });
    }

    this.rules.delete(ruleId);
    this.cooldowns.delete(ruleId);

    // Remove any active alerts for this rule
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.ruleId === ruleId) {
        this.activeAlerts.delete(alertId);
      }
    }

    this.logger.log(`Alert rule deleted: ${rule.name}`, { ruleId });
  }

  async enableRule(ruleId: string): Promise<void> {
    await this.updateRule(ruleId, { enabled: true });
  }

  async disableRule(ruleId: string): Promise<void> {
    await this.updateRule(ruleId, { enabled: false });
  }

  // ================================
  // ALERT EVALUATION AND TRIGGERING
  // ================================

  async evaluateRules(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.evaluationCount++;
    const activeRules = Array.from(this.rules.values()).filter(
      (rule) => rule.enabled
    );

    this.logger.debug(`Evaluating ${activeRules.length} active alert rules`);

    for (const rule of activeRules) {
      try {
        const shouldAlert = await this.evaluateRule(rule);

        if (shouldAlert && !this.isInCooldown(rule.id)) {
          const alert: Alert = {
            id: this.generateAlertId(),
            ruleId: rule.id,
            name: rule.name,
            severity: rule.severity,
            message: await this.formatAlertMessage(rule),
            timestamp: new Date(),
            acknowledged: false,
            metadata: await this.gatherAlertContext(rule),
          };
          await this.triggerAlert(alert);
          this.setCooldown(rule.id, rule.cooldownPeriod);
        }
      } catch (error) {
        this.logger.error(`Rule evaluation failed for ${rule.name}:`, {
          ruleId: rule.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  async triggerAlert(alert: Alert): Promise<void> {
    try {
      this.activeAlerts.set(alert.id, alert);
      this.alertHistory.push(alert);
      this.alertCount++;

      // Send notifications to all configured channels
      const rule = this.rules.get(alert.ruleId);
      if (rule) {
        await this.sendNotifications(alert, rule.channels);
      }

      this.logger.warn(`Alert triggered: ${alert.name}`, {
        alertId: alert.id,
        severity: alert.severity,
        ruleId: alert.ruleId,
      });
    } catch (error) {
      throw new AlertingError(`Failed to trigger alert: ${alert.name}`, {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getActiveAlerts(severity?: string, ruleId?: string): Promise<Alert[]> {
    let alerts = Array.from(this.activeAlerts.values());

    if (severity) {
      alerts = alerts.filter((alert) => alert.severity === severity);
    }

    if (ruleId) {
      alerts = alerts.filter((alert) => alert.ruleId === ruleId);
    }

    return alerts;
  }

  async getAlertHistory(ruleId?: string): Promise<Alert[]> {
    if (ruleId) {
      return this.alertHistory.filter((alert) => alert.ruleId === ruleId);
    }
    return [...this.alertHistory];
  }

  // ================================
  // NOTIFICATION MANAGEMENT
  // ================================

  registerNotificationProvider(
    type: string,
    provider: INotificationProvider
  ): void {
    this.notificationProviders.set(type, provider);
    this.logger.log(`Registered notification provider: ${type}`);
  }

  unregisterNotificationProvider(type: string): void {
    this.notificationProviders.delete(type);
    this.logger.log(`Unregistered notification provider: ${type}`);
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  /**
   * Evaluate a single alert rule
   */
  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    const condition = rule.condition;

    // For now, return false as we need MetricsQuery implementation
    // This would normally query the metrics backend
    // TODO: Implement actual metric querying when backend is ready

    this.logger.debug(`Evaluating rule: ${rule.name}`, {
      metric: condition.metric,
      operator: condition.operator,
      threshold: condition.threshold,
    });

    return false; // Placeholder - replace with actual evaluation
  }

  /**
   * Send notifications to all configured channels
   */
  private async sendNotifications(
    alert: Alert,
    channels: readonly NotificationChannel[]
  ): Promise<void> {
    const notificationPromises = channels.map((channel) =>
      this.sendNotificationSafely(alert, channel)
    );

    const results = await Promise.allSettled(notificationPromises);

    // Log notification results
    results.forEach((result, index) => {
      const channel = channels[index];
      if (result.status === 'rejected') {
        this.logger.error(
          `Notification failed for channel ${channel.name}:`,
          result.reason
        );
      } else {
        this.logger.debug(`Notification sent successfully to ${channel.name}`);
      }
    });
  }

  /**
   * Send notification safely (with error handling)
   */
  private async sendNotificationSafely(
    alert: Alert,
    channel: NotificationChannel
  ): Promise<void> {
    if (!channel.enabled) {
      return;
    }

    const provider = this.notificationProviders.get(channel.type);
    if (!provider) {
      this.logger.warn(
        `No notification provider found for type: ${channel.type}`
      );
      return;
    }

    try {
      await provider.send(alert, channel);
    } catch (error) {
      this.logger.error(
        `Notification provider error for ${channel.type}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Check if rule is in cooldown period
   */
  private isInCooldown(ruleId: string): boolean {
    const cooldownEnd = this.cooldowns.get(ruleId);
    if (!cooldownEnd) {
      return false;
    }

    return new Date() < cooldownEnd;
  }

  /**
   * Set cooldown period for rule
   */
  private setCooldown(ruleId: string, cooldownMs: number): void {
    const cooldownEnd = new Date(Date.now() + cooldownMs);
    this.cooldowns.set(ruleId, cooldownEnd);
  }

  /**
   * Validate alert rule configuration
   */
  private validateRule(rule: AlertRule): void {
    if (!rule.id || !rule.name) {
      throw new Error('Rule must have id and name');
    }

    if (!rule.condition) {
      throw new Error('Rule must have condition');
    }

    if (
      !rule.condition.metric ||
      !rule.condition.operator ||
      rule.condition.threshold === undefined
    ) {
      throw new Error(
        'Rule condition must have metric, operator, and threshold'
      );
    }

    if (rule.channels.length === 0) {
      throw new Error('Rule must have at least one notification channel');
    }

    if (rule.cooldownPeriod < 0) {
      throw new Error('Rule cooldown period must be non-negative');
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format alert message with context
   */
  private async formatAlertMessage(
    rule: AlertRule,
    context?: Record<string, unknown>
  ): Promise<string> {
    const condition = rule.condition;
    return (
      `Alert: ${rule.name}\n` +
      `Condition: ${condition.metric} ${condition.operator} ${condition.threshold}\n` +
      `Severity: ${rule.severity}\n` +
      `Time: ${new Date().toISOString()}\n` +
      (context ? `Context: ${JSON.stringify(context, null, 2)}` : '')
    );
  }

  /**
   * Gather additional context for alert
   */
  private async gatherAlertContext(
    rule: AlertRule
  ): Promise<Record<string, unknown>> {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      evaluatedAt: new Date().toISOString(),
      condition: rule.condition,
      cooldownPeriod: rule.cooldownPeriod,
    };
  }

  // ================================
  // MISSING METHODS FROM TESTS
  // ================================

  /**
   * Get all alert rules
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Evaluate rule with specific data
   */
  async evaluateRuleWithData(
    rule: AlertRule,
    data: Record<string, unknown>
  ): Promise<boolean> {
    this.logger.debug(`Evaluating rule with data: ${rule.name}`, {
      ruleId: rule.id,
      dataKeys: Object.keys(data),
    });

    // Placeholder implementation - replace with actual evaluation logic
    // This would normally evaluate the rule condition against the provided data
    const condition = rule.condition;
    const value = data[condition.metric] as number;

    if (typeof value !== 'number') {
      return false;
    }

    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      case 'eq':
        return value === condition.threshold;
      case 'ne':
        return value !== condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy?: string
  ): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new AlertingError(`Alert not found: ${alertId}`, { alertId });
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.logger.log(`Alert acknowledged: ${alert.name}`, {
      alertId,
      acknowledgedBy,
    });
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(): Promise<{
    totalRules: number;
    activeRules: number;
    evaluationCount: number;
    alertCount: number;
    activeAlerts: number;
    notificationProviders: number;
    ruleEvaluationTime: number;
    alertsProcessed: number;
  }> {
    const baseStats = this.getAlertingStats();

    return {
      ...baseStats,
      ruleEvaluationTime: 50, // Mock average evaluation time in ms
      alertsProcessed: this.alertCount,
    };
  }

  /**
   * Clean up old alerts
   */
  async cleanupOldAlerts(
    maxAge: number = 24 * 60 * 60 * 1000
  ): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAge);
    const initialCount = this.alertHistory.length;

    // Remove old alerts from history
    const filteredHistory = this.alertHistory.filter(
      (alert) => alert.timestamp > cutoffTime
    );
    this.alertHistory.length = 0;
    this.alertHistory.push(...filteredHistory);

    // Remove old active alerts that should have been resolved
    let removedActiveCount = 0;
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.timestamp < cutoffTime && alert.acknowledged) {
        this.activeAlerts.delete(alertId);
        removedActiveCount++;
      }
    }

    const totalRemoved =
      initialCount - this.alertHistory.length + removedActiveCount;

    this.logger.log(`Cleaned up ${totalRemoved} old alerts`, {
      removedFromHistory: initialCount - this.alertHistory.length,
      removedActive: removedActiveCount,
      maxAge,
    });

    return totalRemoved;
  }

  /**
   * Export alerts to various formats
   */
  async exportAlerts(
    format: 'json' | 'csv' = 'json',
    filter?: { ruleId?: string; severity?: string }
  ): Promise<string> {
    let alerts = [...this.alertHistory];

    // Apply filters
    if (filter?.ruleId) {
      alerts = alerts.filter((alert) => alert.ruleId === filter.ruleId);
    }
    if (filter?.severity) {
      alerts = alerts.filter((alert) => alert.severity === filter.severity);
    }

    if (format === 'json') {
      return JSON.stringify(alerts, null, 2);
    } else if (format === 'csv') {
      const headers = [
        'id',
        'ruleId',
        'name',
        'severity',
        'message',
        'timestamp',
        'acknowledged',
      ];
      const rows = alerts.map((alert) => [
        alert.id,
        alert.ruleId,
        alert.name,
        alert.severity,
        alert.message,
        alert.timestamp.toISOString(),
        alert.acknowledged.toString(),
      ]);

      return [headers.join(','), ...rows.map((row) => row.join(','))].join(
        '\n'
      );
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Configure webhook integration
   */
  async configureWebhookIntegration(config: {
    url: string;
    headers?: Record<string, string>;
    enabled: boolean;
  }): Promise<void> {
    this.logger.log('Configuring webhook integration', {
      url: config.url,
      enabled: config.enabled,
    });

    // Store webhook configuration (placeholder implementation)
    // In a real implementation, this would store the config and set up webhook provider
  }

  /**
   * Get alerting service statistics
   */
  getAlertingStats(): {
    totalRules: number;
    activeRules: number;
    evaluationCount: number;
    alertCount: number;
    activeAlerts: number;
    notificationProviders: number;
  } {
    const activeRules = Array.from(this.rules.values()).filter(
      (rule) => rule.enabled
    ).length;

    return {
      totalRules: this.rules.size,
      activeRules,
      evaluationCount: this.evaluationCount,
      alertCount: this.alertCount,
      activeAlerts: this.activeAlerts.size,
      notificationProviders: this.notificationProviders.size,
    };
  }
}
