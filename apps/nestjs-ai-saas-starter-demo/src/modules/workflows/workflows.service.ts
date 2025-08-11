import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WorkflowGraphBuilderService } from '@hive-academy/nestjs-langgraph';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { SampleWorkflow } from './sample.workflow';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);
  private readonly executions = new Map<string, any>();

  constructor(
    private readonly graphBuilder: WorkflowGraphBuilderService,
    private readonly sampleWorkflow: SampleWorkflow,
  ) {}

  async listWorkflows() {
    return [
      {
        id: 'sample',
        name: 'Sample Workflow',
        description: 'A demonstration workflow showing various capabilities',
        nodes: ['start', 'process', 'review', 'complete'],
        requiresApproval: true,
      },
      {
        id: 'document-analysis',
        name: 'Document Analysis Workflow',
        description: 'Analyzes documents using ChromaDB and Neo4j',
        nodes: ['extract', 'embed', 'analyze', 'store'],
        requiresApproval: false,
      },
    ];
  }

  async getWorkflow(id: string) {
    const workflows = await this.listWorkflows();
    const workflow = workflows.find(w => w.id === id);
    
    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }
    
    return workflow;
  }

  async executeWorkflow(workflowId: string, executeDto: ExecuteWorkflowDto) {
    try {
      const executionId = this.generateExecutionId();
      
      // For demonstration, we'll use the sample workflow
      if (workflowId === 'sample') {
        const graph = await this.graphBuilder.buildFromClass(SampleWorkflow);
        
        const result = await graph.invoke({
          input: executeDto.input,
          metadata: executeDto.metadata || {},
        });
        
        this.executions.set(executionId, {
          workflowId,
          status: 'completed',
          result,
          startTime: new Date(),
          endTime: new Date(),
        });
        
        return {
          executionId,
          status: 'completed',
          result,
        };
      }
      
      // Simulate other workflows
      this.executions.set(executionId, {
        workflowId,
        status: 'running',
        input: executeDto.input,
        startTime: new Date(),
      });
      
      // Simulate async execution
      setTimeout(() => {
        const execution = this.executions.get(executionId);
        if (execution) {
          execution.status = 'completed';
          execution.endTime = new Date();
          execution.result = {
            processed: true,
            message: `Workflow ${workflowId} completed successfully`,
          };
        }
      }, 5000);
      
      return {
        executionId,
        status: 'running',
        message: 'Workflow execution started',
      };
    } catch (error) {
      this.logger.error(`Failed to execute workflow ${workflowId}`, error);
      throw error;
    }
  }

  async getExecutionStatus(workflowId: string, executionId: string) {
    const execution = this.executions.get(executionId);
    
    if (!execution || execution.workflowId !== workflowId) {
      throw new NotFoundException(`Execution ${executionId} not found for workflow ${workflowId}`);
    }
    
    return {
      executionId,
      workflowId,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime,
      result: execution.result,
    };
  }

  async approveWorkflowStep(workflowId: string, executionId: string, approved: boolean) {
    const execution = this.executions.get(executionId);
    
    if (!execution || execution.workflowId !== workflowId) {
      throw new NotFoundException(`Execution ${executionId} not found for workflow ${workflowId}`);
    }
    
    // Simulate approval processing
    if (approved) {
      execution.status = 'approved';
      execution.approvalTime = new Date();
      
      // Continue workflow execution
      setTimeout(() => {
        execution.status = 'completed';
        execution.endTime = new Date();
        execution.result = {
          approved: true,
          message: 'Workflow completed after approval',
        };
      }, 2000);
    } else {
      execution.status = 'rejected';
      execution.endTime = new Date();
      execution.result = {
        approved: false,
        message: 'Workflow rejected by user',
      };
    }
    
    return {
      executionId,
      workflowId,
      approved,
      status: execution.status,
    };
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}