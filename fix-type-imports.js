#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to fix
const filesToFix = [
  // ChromaDB
  'libs/nestjs-chromadb/src/lib/embeddings/openai.embedding.ts',
  'libs/nestjs-chromadb/src/lib/embeddings/cohere.embedding.ts',
  'libs/nestjs-chromadb/src/lib/embeddings/huggingface.embedding.ts',
  'libs/nestjs-chromadb/src/lib/embeddings/custom.embedding.ts',
  'libs/nestjs-chromadb/src/lib/services/collection.service.ts',
  'libs/nestjs-chromadb/src/lib/services/embedding.service.ts',
  // LangGraph
  'libs/nestjs-langgraph/src/lib/core/compilation-cache.service.ts',
  'libs/nestjs-langgraph/src/lib/providers/llm-provider.factory.ts',
  'libs/nestjs-langgraph/src/lib/providers/checkpoint.provider.ts',
];

// Pattern to match imports that need to be converted to type imports
const importPatterns = [
  // Match: import { SomeConfig } from '../interfaces/...'
  /^import\s+{\s*([^}]+Config[^}]*)\s*}\s+from\s+['"]([^'"]*interfaces[^'"]*)['"]/gm,
  // Match: import { SomeOptions } from '../interfaces/...'
  /^import\s+{\s*([^}]+Options[^}]*)\s*}\s+from\s+['"]([^'"]*interfaces[^'"]*)['"]/gm,
];

function fixTypeImports(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  for (const pattern of importPatterns) {
    const newContent = content.replace(pattern, (match, imports, path) => {
      // Don't change if already has 'type'
      if (match.includes('import type')) {
        return match;
      }
      modified = true;
      return `import type { ${imports} } from '${path}'`;
    });
    content = newContent;
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Fixed type imports in: ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed in: ${filePath}`);
  }
}

console.log('Fixing type imports in decorated signatures...\n');

filesToFix.forEach(fixTypeImports);

console.log('\n✨ Type imports fixed!');