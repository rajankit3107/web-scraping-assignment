import { PROJECTS, CONCURRENCY, STATE_SAVE_INTERVAL } from './src/config.js';
import {
   fetchIssueKeys,
   fetchIssueDetails,
} from './src/scrapper/jiraClient.js';
import {
   createJsonlWriter,
   writeIssuesBatch,
   closeJsonlWriter,
   transformIssue,
} from './src/transformer/toJsonl.js';
import { loadState, saveState } from './src/utils/fileHandler.js';
import { pLimitWithProgress } from './src/utils/concurrency.js';
import type { JiraIssue } from './src/types.js';

/**
 * Process a single project with optimized parallel fetching and incremental saving
 */
const processProject = async (project: string): Promise<void> => {
   console.log(`🔍 Fetching issues for ${project}`);
   const state = loadState();
   let startAt = state[project] || 0;
   let batchCount = 0;
   let totalFetched = 0;
   let totalFailed = 0;

   // Initialize JSONL writer for incremental writing
   // Always start fresh (append mode could cause duplicates if script crashes mid-batch)
   // State tracking ensures we don't re-fetch already processed issues
   const writer = createJsonlWriter(project, false);

   try {
      while (true) {
         try {
            // Step 1: Fetch issue keys
            const data = await fetchIssueKeys(project, startAt);
            if (!data.issues?.length) {
               console.log(`📭 No more issues for ${project}`);
               break;
            }

            const batchSize = data.issues.length;
            console.log(
               `📦 Got ${batchSize} issues (startAt=${startAt}, total so far: ${totalFetched})`
            );

            // Step 2: Fetch detailed info in parallel with concurrency control
            const tasks = data.issues.map((issue) => ({
               task: () => fetchIssueDetails(issue.key),
               key: issue.key,
            }));

            console.log(
               `🔄 Starting to fetch ${tasks.length} issue details...`
            );
            const results = await pLimitWithProgress(
               CONCURRENCY,
               tasks,
               (key, success) => {
                  if (success) {
                     totalFetched++;
                  } else {
                     totalFailed++;
                  }
               }
            );
            console.log(
               `✅ Finished fetching details: ${results.length} results`
            );

            // Step 3: Transform and write successful results incrementally
            const successfulIssues: JiraIssue[] = [];
            for (const { key, result, success } of results) {
               if (success && result instanceof Error === false) {
                  successfulIssues.push(result as JiraIssue);
               } else {
                  // Extract meaningful error message
                  let errorMessage = 'Unknown error';
                  if (result instanceof Error) {
                     errorMessage = result.message;
                  } else if (typeof result === 'string') {
                     errorMessage = result;
                  } else if (result && typeof result === 'object') {
                     // Try to extract message from error object
                     const errObj = result as any;
                     errorMessage =
                        errObj.message ||
                        errObj.error?.message ||
                        errObj.response?.data?.message ||
                        JSON.stringify(result).substring(0, 200);
                  }
                  console.warn(`⚠️ Skipping ${key}: ${errorMessage}`);
               }
            }

            // Transform and write batch immediately (incremental saving)
            if (successfulIssues.length > 0) {
               const transformed = successfulIssues.map((issue) =>
                  transformIssue(issue, project)
               );
               writeIssuesBatch(writer, transformed);
            }

            // Step 4: Update pagination state
            startAt += batchSize;
            state[project] = startAt;
            batchCount++;

            // Save state periodically (after every N batches)
            if (batchCount % STATE_SAVE_INTERVAL === 0) {
               saveState(state);
               console.log(
                  `💾 State saved: ${project} at ${startAt} (${totalFetched} fetched, ${totalFailed} failed)`
               );
            }

            // Check if we've reached the end
            if (batchSize < data.maxResults) {
               console.log(
                  `📭 Reached end of ${project} (batch size < maxResults)`
               );
               break;
            }
         } catch (batchError) {
            const error =
               batchError instanceof Error
                  ? batchError
                  : new Error(String(batchError));
            console.error(
               `❌ Error in batch at startAt=${startAt} for ${project}: ${error.message}`
            );
            if (error.stack) {
               console.error(error.stack);
            }
            // Save state before continuing/breaking
            state[project] = startAt;
            saveState(state);
            // Continue to next batch instead of crashing
            console.log(`🔄 Continuing to next batch...`);
            break;
         }
      }

      // Final state save
      saveState(state);
      console.log(
         `✅ Completed ${project}: ${totalFetched} fetched, ${totalFailed} failed, saved at ${startAt}`
      );
   } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`❌ Error processing ${project}: ${error.message}`);
      throw err;
   } finally {
      // Close writer
      await closeJsonlWriter(writer);
   }
};

/**
 * Main execution function
 */
const run = async (): Promise<void> => {
   const startTime = Date.now();
   console.log('🚀 Starting web scraping pipeline...\n');

   for (const project of PROJECTS) {
      try {
         await processProject(project);
         console.log(''); // Empty line for readability
      } catch (err) {
         const error = err instanceof Error ? err : new Error(String(err));
         console.error(`💥 Failed to process ${project}: ${error.message}`);
         // Continue with next project instead of exiting
      }
   }

   const duration = ((Date.now() - startTime) / 1000).toFixed(2);
   console.log(`🎉 All projects processed successfully! (${duration}s)`);
};

// Run main pipeline
run().catch((err) => {
   const error = err instanceof Error ? err : new Error(String(err));
   console.error('💥 Fatal Error:', error.message);
   if (error.stack) {
      console.error(error.stack);
   }
   process.exit(1);
});
