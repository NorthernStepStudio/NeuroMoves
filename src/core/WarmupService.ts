/**
 * WarmupService
 * 
 * With bundled MP3 voice assets, there is nothing to pre-fetch or cache.
 * This service retains its interface so GameContext.tsx can call it
 * without changes, but the warmup() method is a no-op.
 */
export const WarmupService = {
    isInterrupted: false,
    stop: () => {
        WarmupService.isInterrupted = true;
    },
    warmup: async (_speak: (text: string, options?: any) => Promise<void>) => {
        WarmupService.isInterrupted = false;
        console.log('[WarmupService] All voice assets are bundled — warmup is a no-op.');
    }
};
