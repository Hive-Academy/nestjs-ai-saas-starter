import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';

@ApiTags('workflows')
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'List all available workflows' })
  async listWorkflows() {
    return this.workflowsService.listWorkflows();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow details' })
  async getWorkflow(@Param('id') id: string) {
    return this.workflowsService.getWorkflow(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute a workflow' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Workflow executed successfully' })
  async executeWorkflow(
    @Param('id') id: string,
    @Body() executeDto: ExecuteWorkflowDto,
  ) {
    return this.workflowsService.executeWorkflow(id, executeDto);
  }

  @Get(':id/status/:executionId')
  @ApiOperation({ summary: 'Get workflow execution status' })
  async getExecutionStatus(
    @Param('id') id: string,
    @Param('executionId') executionId: string,
  ) {
    return this.workflowsService.getExecutionStatus(id, executionId);
  }

  @Post(':id/approve/:executionId')
  @ApiOperation({ summary: 'Approve a workflow step requiring human approval' })
  async approveWorkflowStep(
    @Param('id') id: string,
    @Param('executionId') executionId: string,
    @Body('approved') approved: boolean,
  ) {
    return this.workflowsService.approveWorkflowStep(id, executionId, approved);
  }
}