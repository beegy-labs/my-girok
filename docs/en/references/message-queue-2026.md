# Message Queue Best Practices - 2026

This guide covers message queue best practices as of 2026, focusing on Kafka, event-driven architecture, and async communication patterns.

## Overview

| Feature     | Kafka                | RabbitMQ      | BullMQ          |
| ----------- | -------------------- | ------------- | --------------- |
| Use case    | Event streaming      | Task queuing  | Job processing  |
| Persistence | Log-based            | Optional      | Redis-backed    |
| Throughput  | Very high            | Medium        | Medium          |
| Ordering    | Per partition        | Per queue     | Per queue       |
| Replay      | Yes                  | No            | Limited         |
| Best for    | Event sourcing, logs | Request/reply | Background jobs |

## Event-Driven Architecture

```
┌──────────┐    Events    ┌─────────────┐    Events    ┌──────────┐
│ Producer ├─────────────►│   Kafka     ├─────────────►│ Consumer │
│ Service  │              │   Cluster   │              │ Service  │
└──────────┘              └─────────────┘              └──────────┘
                                │
                                │ Events
                                ▼
                          ┌──────────┐
                          │ Consumer │
                          │ Service  │
                          └──────────┘
```

## Kafka with KafkaJS

### Producer Setup

```typescript
import { Kafka, Producer, Partitioners } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: ['kafka-1:9092', 'kafka-2:9092', 'kafka-3:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const producer: Producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
  allowAutoTopicCreation: false,
  transactionTimeout: 30000,
});

await producer.connect();

// Send event
async function publishUserCreated(user: User): Promise<void> {
  await producer.send({
    topic: 'user.created',
    messages: [
      {
        key: user.id,
        value: JSON.stringify({
          eventId: uuidv7(),
          eventType: 'user.created',
          timestamp: new Date().toISOString(),
          data: user,
        }),
        headers: {
          'content-type': 'application/json',
          'correlation-id': getCorrelationId(),
        },
      },
    ],
  });
}
```

### Consumer Setup

```typescript
const consumer = kafka.consumer({
  groupId: 'notification-service',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576, // 1MB
});

await consumer.connect();
await consumer.subscribe({
  topics: ['user.created', 'user.updated'],
  fromBeginning: false,
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());

    try {
      switch (topic) {
        case 'user.created':
          await handleUserCreated(event.data);
          break;
        case 'user.updated':
          await handleUserUpdated(event.data);
          break;
      }
    } catch (error) {
      logger.error('Failed to process message', {
        topic,
        partition,
        offset: message.offset,
        error,
      });
    }
  },
});
```

## Consumer Groups

```typescript
// Multiple consumers in same group = load balancing
// Each partition assigned to one consumer

// Consumer 1 (notification-service)
const consumer1 = kafka.consumer({ groupId: 'notification-service' });

// Consumer 2 (notification-service) - same group
const consumer2 = kafka.consumer({ groupId: 'notification-service' });

// Consumer 3 (analytics-service) - different group, gets all messages
const consumer3 = kafka.consumer({ groupId: 'analytics-service' });
```

## Event Schema Design

### CloudEvents Format (Recommended)

```typescript
interface CloudEvent<T> {
  specversion: '1.0';
  id: string; // UUIDv7
  source: string; // /services/user-service
  type: string; // user.created.v1
  datacontenttype: string;
  time: string; // ISO 8601
  data: T;
}

const event: CloudEvent<User> = {
  specversion: '1.0',
  id: uuidv7(),
  source: '/services/user-service',
  type: 'user.created.v1',
  datacontenttype: 'application/json',
  time: new Date().toISOString(),
  data: user,
};
```

### Topic Naming Convention

```
{domain}.{entity}.{event}
{domain}.{entity}.{event}.{version}

Examples:
user.account.created
user.account.updated.v2
order.payment.completed
order.shipment.dispatched
```

## Error Handling

### Dead Letter Queue (DLQ)

```typescript
async function processWithDLQ(message: KafkaMessage): Promise<void> {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await processMessage(message);
      return;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        // Send to DLQ
        await producer.send({
          topic: 'user.created.dlq',
          messages: [
            {
              key: message.key,
              value: message.value,
              headers: {
                ...message.headers,
                'original-topic': 'user.created',
                'error-message': error.message,
                'retry-count': String(retries),
              },
            },
          ],
        });
      }
      await sleep(Math.pow(2, retries) * 100); // Exponential backoff
    }
  }
}
```

### Idempotency

```typescript
async function handleUserCreated(event: CloudEvent<User>): Promise<void> {
  // Check if already processed
  const processed = await redis.get(`processed:${event.id}`);
  if (processed) {
    logger.info('Event already processed, skipping', { eventId: event.id });
    return;
  }

  // Process event
  await notificationService.sendWelcomeEmail(event.data);

  // Mark as processed with TTL
  await redis.setex(`processed:${event.id}`, 86400, '1'); // 24h TTL
}
```

## BullMQ for Job Processing

### Queue Setup

```typescript
import { Queue, Worker, Job } from 'bullmq';

const emailQueue = new Queue('email', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

// Add job
await emailQueue.add(
  'send-welcome',
  { userId: '123', template: 'welcome' },
  {
    priority: 1,
    delay: 5000, // Wait 5 seconds
  },
);
```

### Worker

```typescript
const worker = new Worker(
  'email',
  async (job: Job) => {
    const { userId, template } = job.data;

    // Update progress
    await job.updateProgress(10);

    const user = await userService.findById(userId);
    await job.updateProgress(50);

    await emailService.send(user.email, template);
    await job.updateProgress(100);

    return { sent: true, email: user.email };
  },
  {
    connection: { host: 'localhost', port: 6379 },
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 1000, // 100 jobs per second
    },
  },
);

worker.on('completed', (job, result) => {
  logger.info('Job completed', { jobId: job.id, result });
});

worker.on('failed', (job, error) => {
  logger.error('Job failed', { jobId: job?.id, error });
});
```

## Partitioning Strategy

### Key-Based Partitioning

```typescript
// Same key = same partition = ordering guaranteed
await producer.send({
  topic: 'user.events',
  messages: [
    {
      key: userId, // All events for this user go to same partition
      value: JSON.stringify(event),
    },
  ],
});
```

### Partition Count Guidelines

| Traffic           | Partitions | Reason                |
| ----------------- | ---------- | --------------------- |
| Low (<1K/s)       | 3-6        | Overhead not worth it |
| Medium (1K-10K/s) | 6-12       | Good parallelism      |
| High (>10K/s)     | 12-50+     | Max throughput        |

## Monitoring

### Key Metrics

| Metric         | Description      | Alert Threshold |
| -------------- | ---------------- | --------------- |
| Consumer lag   | Messages behind  | >1000 for >5min |
| Commit latency | Time to commit   | >1s p99         |
| Rebalance rate | Group rebalances | >1/hour         |
| Error rate     | Failed messages  | >1%             |

### Health Check

```typescript
async function kafkaHealthCheck(): Promise<boolean> {
  try {
    const admin = kafka.admin();
    await admin.connect();
    await admin.listTopics();
    await admin.disconnect();
    return true;
  } catch (error) {
    logger.error('Kafka health check failed', { error });
    return false;
  }
}
```

## Anti-Patterns to Avoid

| Don't                 | Do                        | Reason            |
| --------------------- | ------------------------- | ----------------- |
| Large messages (>1MB) | Use references to storage | Memory/latency    |
| Ignore consumer lag   | Monitor and alert         | Processing delays |
| Skip idempotency      | Track processed events    | Duplicates        |
| Auto-create topics    | Pre-create with config    | Control           |
| Single partition      | Scale partitions          | Throughput        |
| Sync processing       | Batch/async when possible | Performance       |

## Sources

- [Event Driven Architecture with Kafka](https://www.prodyna.com/insights/event-driven-architecture-and-kafka)
- [Kafka Design Patterns](https://medium.com/@techInFocus/top-10-kafka-design-patterns-that-can-optimize-your-event-driven-architecture-0f895e6abff9)
- [Event-Driven Microservices with Kafka](https://devcenter.heroku.com/articles/event-driven-microservices-with-apache-kafka)
- [Kafka vs RabbitMQ vs SQS](https://medium.com/@aahana.khanal11/mastering-modern-message-queue-architectures-apache-kafka-vs-aws-sqs-sns-eventbridge-ba7d716b69e7)

---

_Last Updated: 2026-01-22_
