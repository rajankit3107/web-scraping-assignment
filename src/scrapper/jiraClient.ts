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
      try {
         const res = await client.get<JiraResponse>('/search', {
            params: {
               jql: `project=${projectKey}`,
               startAt,
               maxResults: PAGE_SIZE,
               expand: 'comments',
            },
         });
         return res.data;
      } catch (err: any) {
         if (err.response) {
            if (err.response.status === 429) {
               const retryAfter = err.response.headers['retry-after'];
               const waitSec = retryAfter ? parseInt(retryAfter, 10) : 10;
               console.warn(
                  `Rate limited on ${projectKey}, waiting ${waitSec} seconds...`
               );
               await new Promise((r) => setTimeout(r, waitSec * 1000));
               throw err; // Throw error so pRetry retries
            } else if (err.response.status >= 500) {
               // 5xx errors: retryable
               throw err;
            }
         }
         // other error (4xx or network?): propagate
         throw err;
      }
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
