#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

interface FunctionCall {
  file: string;
  line: number;
  functionName: string;
  callType: 'query' | 'mutation' | 'action';
  apiCall: string;
  context: string;
}

interface AnalysisResult {
  totalFiles: number;
  totalFunctions: number;
  problematicFunctions: FunctionCall[];
  summary: {
    byFile: Record<string, number>;
    byCallType: Record<string, number>;
  };
}

/**
 * Recursively find all TypeScript files in a directory
 */
function findTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Extract function calls that use api instead of internal
 */
function analyzeFile(filePath: string): FunctionCall[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const problematicCalls: FunctionCall[] = [];
  
  // Patterns to match problematic calls
  const patterns = [
    {
      regex: /ctx\.runQuery\(api\.([^,)]+)/g,
      type: 'query' as const
    },
    {
      regex: /ctx\.runMutation\(api\.([^,)]+)/g,
      type: 'mutation' as const
    },
    {
      regex: /ctx\.runAction\(api\.([^,)]+)/g,
      type: 'action' as const
    }
  ];
  
  // Find function definitions to get context
  const functionDefinitions = new Map<number, string>();
  const functionRegex = /export\s+(?:const|function)\s+(\w+)\s*[=:]\s*(?:query|mutation|action|internalQuery|internalMutation|internalAction)/g;
  
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    functionDefinitions.set(lineNumber, match[1]);
  }
  
  // Check each line for problematic calls
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    patterns.forEach(({ regex, type }) => {
      let match;
      while ((match = regex.exec(line)) !== null) {
        // Find the function this call belongs to
        let functionName = 'unknown';
        for (const [defLine, funcName] of functionDefinitions.entries()) {
          if (defLine <= lineNumber) {
            functionName = funcName;
          } else {
            break;
          }
        }
        
        problematicCalls.push({
          file: filePath,
          line: lineNumber,
          functionName,
          callType: type,
          apiCall: match[1],
          context: line.trim()
        });
      }
    });
  });
  
  return problematicCalls;
}

/**
 * Main analysis function
 */
function analyzeConvexFolder(convexPath: string): AnalysisResult {
  console.log(`🔍 Analyzing Convex folder: ${convexPath}`);
  
  const tsFiles = findTsFiles(convexPath);
  console.log(`📁 Found ${tsFiles.length} TypeScript files`);
  
  const allProblematicCalls: FunctionCall[] = [];
  let totalFunctions = 0;
  
  // Count total functions
  tsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const functionMatches = content.match(/export\s+(?:const|function)\s+\w+\s*[=:]\s*(?:query|mutation|action|internalQuery|internalMutation|internalAction)/g);
    if (functionMatches) {
      totalFunctions += functionMatches.length;
    }
  });
  
  // Analyze each file
  tsFiles.forEach(file => {
    const problematicCalls = analyzeFile(file);
    allProblematicCalls.push(...problematicCalls);
  });
  
  // Generate summary
  const byFile: Record<string, number> = {};
  const byCallType: Record<string, number> = {};
  
  allProblematicCalls.forEach(call => {
    const relativePath = path.relative(convexPath, call.file);
    byFile[relativePath] = (byFile[relativePath] || 0) + 1;
    byCallType[call.callType] = (byCallType[call.callType] || 0) + 1;
  });
  
  return {
    totalFiles: tsFiles.length,
    totalFunctions,
    problematicFunctions: allProblematicCalls,
    summary: {
      byFile,
      byCallType
    }
  };
}

/**
 * Format and display results
 */
function displayResults(result: AnalysisResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('🚨 CONVEX API vs INTERNAL ANALYSIS RESULTS');
  console.log('='.repeat(80));
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total files analyzed: ${result.totalFiles}`);
  console.log(`   Total functions found: ${result.totalFunctions}`);
  console.log(`   Functions with problematic API calls: ${result.problematicFunctions.length}`);
  
  if (result.problematicFunctions.length === 0) {
    console.log('\n✅ No problematic API calls found! All functions are using internal calls correctly.');
    return;
  }
  
  console.log(`\n🔍 PROBLEMATIC CALLS BY TYPE:`);
  Object.entries(result.summary.byCallType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} calls`);
  });
  
  console.log(`\n📁 PROBLEMATIC CALLS BY FILE:`);
  Object.entries(result.summary.byFile)
    .sort(([,a], [,b]) => b - a)
    .forEach(([file, count]) => {
      console.log(`   ${file}: ${count} calls`);
    });
  
  console.log(`\n🔧 DETAILED BREAKDOWN:`);
  console.log('-'.repeat(80));
  
  // Group by file for better readability
  const byFile = result.problematicFunctions.reduce((acc, call) => {
    const relativePath = path.relative(process.cwd(), call.file);
    if (!acc[relativePath]) {
      acc[relativePath] = [];
    }
    acc[relativePath].push(call);
    return acc;
  }, {} as Record<string, FunctionCall[]>);
  
  Object.entries(byFile).forEach(([file, calls]) => {
    console.log(`\n📄 ${file}:`);
    calls.forEach(call => {
      console.log(`   Line ${call.line}: ${call.functionName}() → ctx.run${call.callType.charAt(0).toUpperCase() + call.callType.slice(1)}(api.${call.apiCall})`);
      console.log(`   Context: ${call.context}`);
    });
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('💡 RECOMMENDATIONS:');
  console.log('='.repeat(80));
  console.log('1. Replace api.* calls with internal.* calls to avoid re-authentication');
  console.log('2. Create internal versions of functions that are called from other functions');
  console.log('3. Use internal functions for cross-function communication within the same user context');
  console.log('4. Only use api.* calls from client-side code or when you need fresh authentication');
  console.log('\nExample fix:');
  console.log('  ❌ ctx.runQuery(api.chats.queries.get, { chatId })');
  console.log('  ✅ ctx.runQuery(internal.chats.queries.getInternal, { chatId, userId })');
}

/**
 * Main execution
 */
function main(): void {
  const convexPath = path.join(process.cwd(), 'convex');
  
  if (!fs.existsSync(convexPath)) {
    console.error('❌ Convex folder not found. Please run this script from the project root.');
    process.exit(1);
  }
  
  try {
    const result = analyzeConvexFolder(convexPath);
    displayResults(result);
    
    // Exit with error code if problematic calls found
    if (result.problematicFunctions.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error analyzing Convex folder:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeConvexFolder };
export type { FunctionCall, AnalysisResult };
