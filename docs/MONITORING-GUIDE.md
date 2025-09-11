# Monitoring & Health Check Configuration Guide

## Understanding the Services

### Checkpoint Cleanup Service

**Purpose:** Manages workflow state snapshots to prevent memory leaks

- **Development:** 5-minute intervals (300,000ms)
- **Production:** 1-2 minute intervals for high-volume workflows
- **Why needed:** Each workflow step creates checkpoints; without cleanup, memory grows indefinitely

### Health Check Service

**Two modes of operation:**

#### 1. Startup Health Checks (One-time)

- Database connectivity
- Required services availability
- Configuration validation

#### 2. Runtime Monitoring (Continuous)

- System resources (memory, CPU)
- Service degradation detection
- Auto-scaling triggers
- Load balancer health status

## Recommended Configurations

### Development Environment

```bash
# Reduced logging for cleaner console
DEBUG_ENABLED=false
DEBUG_LOG_LEVEL=warn

# Less aggressive cleanup
CHECKPOINT_INTERVAL_MS=300000  # 5 minutes
CHECKPOINT_MAX_COUNT=25        # Keep fewer checkpoints

# Basic monitoring
MONITORING_ENABLED=true
MONITORING_PERFORMANCE=true
```

### Production Environment

```bash
# Production logging
DEBUG_ENABLED=false
DEBUG_LOG_LEVEL=error

# More frequent cleanup for high volume
CHECKPOINT_INTERVAL_MS=60000   # 1 minute
CHECKPOINT_MAX_COUNT=100       # More checkpoints for reliability

# Full monitoring
MONITORING_ENABLED=true
MONITORING_ALERTING_ENABLED=true
MONITORING_ERROR_RATE_THRESHOLD=0.01  # 1% error rate
```

### Testing Environment

```bash
# Disable for faster tests
CHECKPOINT_ENABLED=false
MONITORING_ENABLED=false
DEBUG_ENABLED=false
```

## Disabling Services (if not needed)

### Minimal Setup

```bash
# Disable checkpoint system entirely
CHECKPOINT_ENABLED=false

# Disable continuous health monitoring
MONITORING_ENABLED=false
MONITORING_PERFORMANCE=false
```

## Health Check Frequency

Current intervals can be adjusted in monitoring configuration:

- **Memory checks:** Every 60 seconds (reasonable)
- **Health endpoint:** On-demand only
- **Cleanup operations:** Now every 5 minutes (much better!)

## Production Considerations

1. **Health Checks** should always run in production for:

   - Load balancer integration
   - Auto-scaling decisions
   - Alert generation

2. **Checkpoint Cleanup** prevents memory leaks in long-running workflows

3. **Monitoring** provides observability into system performance

The excessive logging you saw was due to debug mode + 1-second cleanup intervals, which is now fixed!
