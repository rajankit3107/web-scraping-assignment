/**
 * Execute promises with concurrency control and track progress
 * Reliable implementation using explicit slot management
 */
export async function pLimitWithProgress<T>(
   limit: number,
   tasks: Array<{ task: () => Promise<T>; key: string }>,
   onProgress?: (key: string, success: boolean) => void
): Promise<Array<{ key: string; result: T | Error; success: boolean }>> {
   const results: Array<{ key: string; result: T | Error; success: boolean }> =
      [];
   let activeCount = 0;
   const waiting: Array<{
      task: () => Promise<T>;
      key: string;
      start: () => void;
   }> = [];

   const startNext = (): void => {
      if (activeCount >= limit || waiting.length === 0) {
         return;
      }

      const item = waiting.shift()!;
      activeCount++;
      item.start();

      // Execute the task
      Promise.resolve()
         .then(() => item.task())
         .then((result) => {
            results.push({ key: item.key, result, success: true });
            onProgress?.(item.key, true);
         })
         .catch((error) => {
            const err =
               error instanceof Error ? error : new Error(String(error));
            results.push({ key: item.key, result: err, success: false });
            onProgress?.(item.key, false);
         })
         .finally(() => {
            activeCount--;
            startNext(); // Try to start next waiting task
         });
   };

   const taskPromises: Promise<void>[] = tasks.map(({ task, key }) => {
      return new Promise<void>((resolve) => {
         waiting.push({
            task,
            key,
            start: resolve,
         });
         startNext();
      });
   });

   // Wait for all tasks to complete
   await Promise.all(taskPromises);

   return results;
}