import { PROJECTS } from './src/config.js';
import { fetchIssues } from './src/scrapper/jiraClient.js';
import { transformAndSave } from './src/transformer/toJsonl.js';
import { loadState, saveState } from './src/utils/fileHandler.js';

const run = async (): Promise<void> => {
   const state = loadState();

   for (const project of PROJECTS) {
      console.log(`🔍 Fetching issues for ${project}`);
      let startAt = state[project] || 0;
      const allIssues: any[] = [];

      while (true) {
         try {
            const data = await fetchIssues(project, startAt);
            if (!data.issues?.length) break;
            allIssues.push(...data.issues);

            console.log(`Fetched ${data.issues.length} issues from ${project}`);
            state[project] = startAt;
            saveState(state);

            if (data.issues.length < data.maxResults) break;
            startAt += data.issues.length;
         } catch (err: any) {
            console.error(`⚠️ Error fetching ${project}: ${err.message}`);
            break;
         }
      }

      await transformAndSave(allIssues, project);
   }

   console.log('🎉 All projects processed successfully!');
};

run().catch((err) => {
   console.error('❌ Fatal Error:', err.message);
   process.exit(1);
});
