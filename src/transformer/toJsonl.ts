import fs from 'fs';
import path from 'path';
import jsonlines from 'jsonlines';
import type { JiraIssue, TransformedIssue } from '../types.js';
import { OUTPUT_DIR } from '../config.js';

/**
 * Transform a single issue to the output format
 */
export const transformIssue = (
   issue: JiraIssue,
   projectKey: string
): TransformedIssue => {
   const comments =
      issue.fields.comment?.comments?.map((c) => c.body ?? '') ?? [];

   return {
      id: issue.id,
      key: issue.key,
      project: projectKey,
      summary: issue.fields.summary ?? null,
      status: issue.fields.status?.name ?? null,
      reporter: issue.fields.reporter?.displayName ?? null,
      assignee: issue.fields.assignee?.displayName ?? null,
      description: issue.fields.description ?? null,
      comments,
      created: new Date(issue.fields.created).toISOString(),
      updated: new Date(issue.fields.updated).toISOString(),
      derived_tasks: [
         {
            type: 'summarization',
            prompt: `Summarize the issue: ${issue.fields.summary ?? ''}`,
            answer: issue.fields.description ?? '',
         },
      ],
   };
};

/**
 * Initialize JSONL writer for a project
 * @param projectKey - Project key
 * @param append - If true, append to existing file; if false, overwrite (default: false)
 */
export const createJsonlWriter = (
   projectKey: string,
   append = false
): jsonlines.Stringifier => {
   const outputPath = path.join(OUTPUT_DIR, 'processed', `${projectKey}.jsonl`);
   fs.mkdirSync(path.dirname(outputPath), { recursive: true });

   const writer = jsonlines.stringify();
   writer.pipe(fs.createWriteStream(outputPath, { flags: append ? 'a' : 'w' }));

   return writer;
};

/**
 * Write a batch of transformed issues
 */
export const writeIssuesBatch = (
   writer: jsonlines.Stringifier,
   issues: TransformedIssue[]
): void => {
   for (const issue of issues) {
      writer.write(issue);
   }
};

/**
 * Close the JSONL writer
 */
export const closeJsonlWriter = (
   writer: jsonlines.Stringifier
): Promise<void> => {
   return new Promise((resolve, reject) => {
      writer.on('end', resolve);
      writer.on('error', reject);
      writer.end();
   });
};

/**
 * Transform and save issue data to JSONL (legacy - for full saves)
 */
export const transformAndSave = async (
   issues: JiraIssue[],
   projectKey: string
): Promise<void> => {
   const outputPath = path.join(OUTPUT_DIR, 'processed', `${projectKey}.jsonl`);
   fs.mkdirSync(path.dirname(outputPath), { recursive: true });

   const writer = jsonlines.stringify();
   writer.pipe(fs.createWriteStream(outputPath));

   for (const issue of issues) {
      const transformed = transformIssue(issue, projectKey);
      writer.write(transformed);
   }

   await closeJsonlWriter(writer);
   console.log(`✅ Saved ${issues.length} issues for ${projectKey}`);
};
