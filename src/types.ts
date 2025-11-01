export interface JiraIssue {
   id: string;
   key: string;
   fields: {
      summary: string | null;
      description: string | null;
      created: string;
      updated: string;
      status: { name: string } | null;
      reporter?: { displayName: string } | null;
      assignee?: { displayName: string } | null;
      comment?: { comments: Array<{ body: string }> } | null;
   };
}

export interface JiraIssueResponse {
   issues: Array<{ key: string }>;
   maxResults: number;
   total?: number;
   startAt: number;
}

export interface TransformedIssue {
   id: string;
   key: string;
   project: string;
   summary: string | null;
   status: string | null;
   reporter: string | null;
   assignee: string | null;
   description: string | null;
   comments: string[];
   created: string;
   updated: string;
   derived_tasks: Array<{
      type: string;
      prompt: string;
      answer: string | null;
   }>;
}
