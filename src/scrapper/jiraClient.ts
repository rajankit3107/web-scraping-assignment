import axios from 'axios';
import pRetry from 'p-retry';
import { BASE_URL, PAGE_SIZE, REQUEST_TIMEOUT } from '../config.js';
import type { JiraResponse } from '../types.js';

const client = axios.create({
   baseURL: BASE_URL,
   timeout: REQUEST_TIMEOUT,
});

export const fetchIssues = async (
   projectKey: string,
   startAt = 0
): Promise<JiraResponse> => {
   const fetch = async (): Promise<JiraResponse> => {
      const res = await client.get<JiraResponse>('/search', {
         params: {
            jql: `project=${projectKey}`,
            startAt,
            maxResults: PAGE_SIZE,
            expand: 'comments',
         },
      });
      return res.data;
   };

   return pRetry(fetch, {
      retries: 5,
      onFailedAttempt: (error) => {
         console.warn(
            `Retry ${error.attemptNumber} for ${projectKey}: ${error.error.message}`
         );
      },
   });
};
