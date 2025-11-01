import fs from 'fs';
import path from 'path';
import jsonlines from 'jsonlines';
import type { JiraIssue } from '../types.js';
import { OUTPUT_DIR } from '../config.js';

export const transformAndSave = async (
   issues: JiraIssue[],
   projectKey: string
): Promise<void> => {
   const outputPath = path.join(OUTPUT_DIR, 'processed', `${projectKey}.jsonl`);
   fs.mkdirSync(path.dirname(outputPath), { recursive: true });

   const writer = jsonlines.stringify();
   writer.pipe(fs.createWriteStream(outputPath));

   for (const issue of issues) {
      let comments: string[] = [];
      try {
         comments =
            issue.fields.comment?.comments?.map(
               (c: { body: string }) => c.body
            ) || [];
      } catch (e) {
         console.warn(
            `⚠️  Could not process comments for issue ${issue.key}:`,
            e
         );
      }
      const transformed = {
         id: issue.id,
         key: issue.key,
         project: projectKey,
         summary: issue.fields.summary,
         status: issue.fields.status.name,
         reporter: issue.fields.reporter?.displayName ?? null,
         assignee: issue.fields.assignee?.displayName ?? null,
         description: issue.fields.description,
         comments: comments,
         created:
            issue.fields.created instanceof Date
               ? issue.fields.created.toISOString()
               : new Date(issue.fields.created).toISOString(),
         updated:
            issue.fields.updated instanceof Date
               ? issue.fields.updated.toISOString()
               : new Date(issue.fields.updated).toISOString(),
         derived_tasks: [
            {
               type: 'summarization',
               prompt: `Summarize the issue: ${issue.fields.summary}`,
               answer: issue.fields.description ?? '',
            },
         ],
      };
      writer.write(transformed);
   }

   writer.end();
   console.log(`✅ Saved ${issues.length} issues for ${projectKey}`);
};
