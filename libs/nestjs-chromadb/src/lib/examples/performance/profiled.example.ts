import { Module, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
 Profiled,
 getPerformanceStatistics,
 getExecutionTimes,
 GlobalPerformanceMonitor,
} from '../../../lib/decorators';

@Injectable()
export class ProfiledExampleService implements OnModuleInit {
 private readonly logger = new Logger(ProfiledExampleService.name);

 async onModuleInit(): Promise<void> {
   // Register with global monitor and execute operations to generate metrics
   GlobalPerformanceMonitor.register(ProfiledExampleService.name, this);

   await this.quickOp();
   await this.simulateWork(32);

   const quickStats = getPerformanceStatistics(this, 'quickOp');
   const workStats = getPerformanceStatistics(this, 'simulateWork');
   const workTimes = getExecutionTimes(this, 'simulateWork');

   this.logger.log(`quickOp stats: ${JSON.stringify(quickStats)}`);
   this.logger.log(`simulateWork stats: ${JSON.stringify(workStats)}`);
   if (workTimes.length > 0) {
     const min = Math.min(...workTimes);
     const max = Math.max(...workTimes);
     this.logger.log(`simulateWork execution times count=${workTimes.length} min=${min}ms max=${max}ms`);
   }
 }

 // Fast operation - should log at 'all' level and remain under slow threshold
 @Profiled({
   slowQueryThreshold: 5,
   logLevel: 'all',
   samplingRate: 1,
   metricName: 'examples.profiled.quick',
   includeParameters: false,
   includeResults: true,
   category: 'examples',
   tags: { example: 'profiled', kind: 'quick' },
 })
 async quickOp(): Promise<string> {
   return 'ok';
 }

 // Deliberately slow operation - exceeds threshold to demonstrate slow logging
 @Profiled({
   slowQueryThreshold: 20,
   logLevel: 'slow',
   samplingRate: 1,
   includeParameters: true,
   includeMemoryMetrics: true,
   category: 'examples',
   tags: { example: 'profiled', kind: 'simulateWork' },
 })
 async simulateWork(iterations: number): Promise<number> {
   // Deterministic delay plus small CPU work to exceed threshold
   await new Promise((r) => setTimeout(r, 30));
   let acc = 0;
   for (let i = 0; i < iterations; i++) {
     acc += (i * i) % 7;
   }
   return acc;
 }
}

@Module({
 providers: [ProfiledExampleService],
 exports: [ProfiledExampleService],
})
export class ProfiledExampleModule {}
