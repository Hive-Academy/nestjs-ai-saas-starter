import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { SampleWorkflow } from './sample.workflow';

@Module({
  controllers: [WorkflowsController],
  providers: [WorkflowsService, SampleWorkflow],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}