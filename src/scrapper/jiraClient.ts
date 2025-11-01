import axios from 'axios';
import pRetry from 'p-retry';
import {
   BASE_URL,
   PAGE_SIZE,
   MAX_RETRIES,
   REQUEST_TIMEOUT,
} from '../config.js';
import type { JiraIssue, JiraIssueResponse } from '../types.js';

const client = axios.create({
   baseURL: BASE_URL,
   timeout: REQUEST_TIMEOUT,
});

/**
 * Check if error is retriable
 */
const isRetriableError = (error: unknown): boolean => {
   if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Retry on network errors, 5xx, and rate limits (429)
      return (
         !status ||
         status >= 500 ||
         status === 429 ||
         error.code === 'ECONNRESET' ||
         error.code === 'ETIMEDOUT'
      );
   }
   return false;
};

/**
 * Fetch a page of issue keys from JIRA
 */
export const fetchIssueKeys = async (
   projectKey: string,
   startAt = 0
): Promise<JiraIssueResponse> => {
   try {
      const res = await pRetry(
         () =>
            client.get<JiraIssueResponse>('/search', {
               params: {
                  jql: `project=${projectKey}`,
                  fields: 'key',
                  startAt,
                  maxResults: PAGE_SIZE,
               },
            }),
         {
            retries: MAX_RETRIES,
            onFailedAttempt: (error) => {
               if (!isRetriableError(error)) {
                  throw error; // Don't retry non-retriable errors
               }
            },
         }
      );

      return res.data;
   } catch (error) {
      if (axios.isAxiosError(error)) {
         throw new Error(
            `Failed to fetch issues for ${projectKey} at ${startAt}: ${error.message}`
         );
      }
      throw error;
   }
};

/**
 * Fetch full issue details (including comments)
 */
export const fetchIssueDetails = async (
   issueKey: string
): Promise<JiraIssue> => {
   try {
      const res = await pRetry(
         () =>
            client.get<JiraIssue>(`/issue/${issueKey}`, {
               params: { expand: 'comment' },
            }),
         {
            retries: MAX_RETRIES,
            onFailedAttempt: (error) => {
               if (!isRetriableError(error)) {
                  throw error; // Don't retry non-retriable errors
               }
            },
         }
      );

      return res.data;
   } catch (error) {
      if (axios.isAxiosError(error)) {
         const status = error.response?.status;
         if (status === 404) {
            throw new Error(`Issue ${issueKey} not found`);
         }
         throw new Error(
            `Failed to fetch details for ${issueKey}: ${error.message}`
         );
      }
      throw error;
   }
};
