#!/usr/bin/env node

/**
 * Migration Cleanup Script
 * 
 * This script helps identify and remove redundant code after successfully
 * migrating functionality from space-colony-exchange to space-colony-trade.
 * 
 * Usage:
 * 1. Run `node migration-cleanup.mjs verify` to generate a verification report
 * 2. Review the report to confirm which files should be removed
 * 3. Run `node migration-cleanup.mjs cleanup` to remove redundant files
 * 
 * Note: Always back up both repos before running cleanup operations!
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_REPO = path.resolve(__dirname, '../../space-colony-exchange');
const TARGET_REPO = path.resolve(__dirname, '..');
const REPORT_FILE = path.join(__dirname, 'migration-cleanup-report.md');

// Files and directories that have been successfully migrated and can be removed
const MIGRATED_FILES = [
  // Service files
  'src/services/gameService.ts',
  'src/services/adminService.ts',
  
  // Type definitions
  'src/types/game.ts',
  
  // Admin dashboard components
  'src/pages/AdminDashboard.tsx',
  'src/components/admin/EventCreationModal.tsx',
  'src/components/admin/SessionCreationModal.tsx',
  
  // Trading components - already migrated and enhanced
  'src/components/trading/TradeNotifications.tsx',
  
  // Other migrated components
  'src/components/ui/Leaderboard.tsx',
];

// Function to check if source file exists in target repo with significant overlap
function verifyFileMigration(sourceFile) {
  const targetFile = path.join(TARGET_REPO, sourceFile);
  const sourceFilePath = path.join(SOURCE_REPO, sourceFile);
  
  // Check if files exist
  if (!fs.existsSync(sourceFilePath)) {
    return {
      file: sourceFile,
      status: 'SOURCE_MISSING',
      message: 'Source file does not exist'
    };
  }
  
  if (!fs.existsSync(targetFile)) {
    return {
      file: sourceFile,
      status: 'NOT_MIGRATED',
      message: 'File has not been migrated to target repo'
    };
  }
  
  try {
    // Compare files (could use more sophisticated comparison in a real implementation)
    const sourceContent = fs.readFileSync(sourceFilePath, 'utf8');
    const targetContent = fs.readFileSync(targetFile, 'utf8');
    
    // Simple heuristic: check if target file has at least 70% of the source file's length
    // This is very basic and should be enhanced with actual code comparison
    const sizeDifference = targetContent.length / sourceContent.length;
    
    if (sizeDifference < 0.7) {
      return {
        file: sourceFile,
        status: 'INCOMPLETE',
        message: `Migration may be incomplete (target file size is ${Math.round(sizeDifference * 100)}% of source)`,
        sourceSize: sourceContent.length,
        targetSize: targetContent.length
      };
    }
    
    return {
      file: sourceFile,
      status: 'MIGRATED',
      message: 'Successfully migrated',
      sourceSize: sourceContent.length,
      targetSize: targetContent.length
    };
  } catch (error) {
    return {
      file: sourceFile,
      status: 'ERROR',
      message: `Error comparing files: ${error.message}`,
    };
  }
}

// Generate verification report
function generateReport() {
  console.log('Generating migration verification report...');
  
  const results = MIGRATED_FILES.map(verifyFileMigration);
  
  // Format report as markdown
  let report = '# Migration Verification Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += '## Summary\n\n';
  
  const migrated = results.filter(r => r.status === 'MIGRATED').length;
  const incomplete = results.filter(r => r.status === 'INCOMPLETE').length;
  const notMigrated = results.filter(r => r.status === 'NOT_MIGRATED').length;
  const errors = results.filter(r => ['ERROR', 'SOURCE_MISSING'].includes(r.status)).length;
  
  report += `- ✅ Successfully migrated: ${migrated}\n`;
  report += `- ⚠️ Potentially incomplete: ${incomplete}\n`;
  report += `- ❌ Not migrated: ${notMigrated}\n`;
  report += `- 🔴 Errors: ${errors}\n\n`;
  
  report += '## Details\n\n';
  report += '| File | Status | Message | Source Size | Target Size |\n';
  report += '| ---- | ------ | ------- | ----------- | ----------- |\n';
  
  results.forEach(result => {
    const statusEmoji = {
      'MIGRATED': '✅',
      'INCOMPLETE': '⚠️',
      'NOT_MIGRATED': '❌',
      'ERROR': '🔴',
      'SOURCE_MISSING': '🔴'
    }[result.status];
    
    report += `| ${result.file} | ${statusEmoji} ${result.status} | ${result.message} | ${result.sourceSize || 'N/A'} | ${result.targetSize || 'N/A'} |\n`;
  });
  
  fs.writeFileSync(REPORT_FILE, report);
  console.log(`Report generated at ${REPORT_FILE}`);
}

// Function to perform actual cleanup (would remove redundant code)
function performCleanup() {
  console.log('This would remove redundant files from space-colony-exchange.');
  console.log('For safety, this functionality is not implemented yet.');
  console.log('Please review the verification report and perform cleanup manually.');
}

// Main function
function main() {
  const command = process.argv[2]?.toLowerCase();
  
  if (!command || !['verify', 'cleanup'].includes(command)) {
    console.log('Usage: node migration-cleanup.mjs [verify|cleanup]');
    process.exit(1);
  }
  
  // Check if source repo exists
  if (!fs.existsSync(SOURCE_REPO)) {
    console.error(`Source repository not found at ${SOURCE_REPO}`);
    process.exit(1);
  }
  
  if (command === 'verify') {
    generateReport();
  } else if (command === 'cleanup') {
    performCleanup();
  }
}

// Execute main function
main();
