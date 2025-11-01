export type JiraIssue = {
   id: string;
   key: string;
   fields: {
      summary: string;
      description: string;
      status: { name: string };
      project: { key: string };
      reporter?: { displayName: string };
      assignee?: { displayName: string };
      created: Date;
      updated: Date;
      comment: { comments: { body: string }[] };
   };
};

export type JiraResponse = {
   issues: JiraIssue[];
   maxResults: number;
};
