export const BASE_URL = 'https://issues.apache.org/jira/rest/api/2';
export const OUTPUT_DIR = './data';
export const PAGE_SIZE = 50; // Increased from 20 for better throughput
export const MAX_RETRIES = 3;
export const REQUEST_TIMEOUT = 15000; // 15 seconds
export const CONCURRENCY = 10; // Parallel requests for issue details
export const STATE_SAVE_INTERVAL = 1; // Save state after every N batches

// Change this list to whichever projects you want to scrape
export const PROJECTS = ['JENA', 'TIKA', 'NUTCH'];
