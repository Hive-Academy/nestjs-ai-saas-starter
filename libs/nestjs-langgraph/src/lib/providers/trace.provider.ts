import { Injectable, Logger } from '@nestjs/common';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

/**
 * Provider for tracing and observability
 */
@Injectable()
export class TraceProvider extends BaseCallbackHandler {
  private readonly logger = new Logger(TraceProvider.name);
  name = 'TraceProvider';

  override async handleLLMStart(
    llm: any,
    prompts: string[],
    runId: string,
  ): Promise<void> {
    this.logger.debug(`LLM Start - Run ID: ${runId}, Prompts: ${prompts.length}`);
  }

  override async handleLLMEnd(output: any, runId: string): Promise<void> {
    this.logger.debug(`LLM End - Run ID: ${runId}`);
  }

  override async handleLLMError(err: Error, runId: string): Promise<void> {
    this.logger.error(`LLM Error - Run ID: ${runId}`, err);
  }

  override async handleChainStart(
    chain: any,
    inputs: any,
    runId: string,
  ): Promise<void> {
    this.logger.debug(`Chain Start - Run ID: ${runId}`);
  }

  override async handleChainEnd(outputs: any, runId: string): Promise<void> {
    this.logger.debug(`Chain End - Run ID: ${runId}`);
  }

  override async handleChainError(err: Error, runId: string): Promise<void> {
    this.logger.error(`Chain Error - Run ID: ${runId}`, err);
  }

  override async handleToolStart(
    tool: any,
    input: string,
    runId: string,
  ): Promise<void> {
    this.logger.debug(`Tool Start - Run ID: ${runId}, Tool: ${tool.name}`);
  }

  override async handleToolEnd(output: string, runId: string): Promise<void> {
    this.logger.debug(`Tool End - Run ID: ${runId}`);
  }

  override async handleToolError(err: Error, runId: string): Promise<void> {
    this.logger.error(`Tool Error - Run ID: ${runId}`, err);
  }
}