> node dist/main.js

🔧 Encapsulated environment loaded: {
loadedFiles: [
'.env.chromadb',
'.env.neo4j',
'.env.llm',
'.env.platform',
'.env.app'
],
errors: []
}
[MemoryModule] Thread registry not configured - thread listing unavailable
[Nest] 28272 - 11/18/2025, 11:22:20 PM LOG [NestFactory] Starting Nest application...
[Nest] 28272 - 11/18/2025, 11:22:20 PM ERROR [ExceptionHandler] UnknownExportException [Error]: Nest cannot export a provider/module that is not a part of the currently processed module (MemoryModule). Please verify whether the exported Symbol(ThreadRegistryStore) is available in this particular context.

Possible Solutions:

- Is Symbol(ThreadRegistryStore) part of the relevant providers/imports within MemoryModule?

For more common dependency resolution issues, see: <https://docs.nestjs.com/faq/common-errors>

    at Module.validateExportedProvider (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\injector\module.js:316:19)
    at addExportedUnit (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\injector\module.js:284:67)
    at Module.addExportedProviderOrModule (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\injector\module.js:289:20)
    at NestContainer.addExportedProviderOrModule (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\injector\container.js:182:19)
    at DependenciesScanner.insertExportedProviderOrModule (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\scanner.js:293:24)
    at D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\scanner.js:152:50
    at Array.forEach (<anonymous>)
    at DependenciesScanner.reflectExports (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\scanner.js:152:17)
    at DependenciesScanner.scanModulesForDependencies (D:\projects\nestjs-ai-saas-starter\node_modules\@nestjs\core\scanner.js:105:18)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
