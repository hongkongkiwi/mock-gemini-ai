import {
  CachedContentRequest,
  CachedContentResponse,
  UpdateCachedContentRequest,
  Content,
  EnhancedTool,
  ToolConfig
} from '../types/vertex-ai';

interface CacheEntry {
  id: string;
  name: string;
  model: string;
  displayName?: string;
  systemInstruction?: Content;
  contents?: Content[];
  tools?: EnhancedTool[];
  toolConfig?: ToolConfig;
  usageMetadata?: {
    totalTokenCount: number;
  };
  createTime: string;
  updateTime: string;
  expireTime: string;
  ttl?: string;
}

/**
 * Context Caching Service for managing cached content to optimize costs
 */
export class ContextCachingService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheIdCounter = 1;

  /**
   * Create a new cached content entry
   */
  async createCachedContent(
    request: CachedContentRequest,
    projectId: string,
    location: string
  ): Promise<CachedContentResponse> {
    const cacheId = `cache-${this.cacheIdCounter++}`;
    const now = new Date();
    
    // Calculate expiration time
    let expireTime: Date;
    if (request.expireTime) {
      expireTime = new Date(request.expireTime);
    } else if (request.ttl) {
      // Parse TTL (e.g., "3600s" for 1 hour)
      const ttlSeconds = parseInt(request.ttl.replace('s', ''));
      expireTime = new Date(now.getTime() + ttlSeconds * 1000);
    } else {
      // Default to 1 hour
      expireTime = new Date(now.getTime() + 3600 * 1000);
    }

    // Calculate token count for cached content
    const totalTokenCount = this.calculateTokenCount(request);

    const cacheEntry: CacheEntry = {
      id: cacheId,
      name: `projects/${projectId}/locations/${location}/cachedContents/${cacheId}`,
      model: request.model,
      displayName: request.displayName,
      systemInstruction: request.systemInstruction,
      contents: request.contents,
      tools: request.tools,
      toolConfig: request.toolConfig,
      usageMetadata: {
        totalTokenCount
      },
      createTime: now.toISOString(),
      updateTime: now.toISOString(),
      expireTime: expireTime.toISOString(),
      ttl: request.ttl
    };

    this.cache.set(cacheId, cacheEntry);

    // Schedule cleanup
    this.scheduleCleanup(cacheId, expireTime);

    return {
      name: cacheEntry.name,
      model: cacheEntry.model,
      displayName: cacheEntry.displayName,
      usageMetadata: cacheEntry.usageMetadata,
      createTime: cacheEntry.createTime,
      updateTime: cacheEntry.updateTime,
      expireTime: cacheEntry.expireTime
    };
  }

  /**
   * Get cached content by ID
   */
  async getCachedContent(cacheId: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(cacheId);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (new Date() > new Date(entry.expireTime)) {
      this.cache.delete(cacheId);
      return null;
    }

    return entry;
  }

  /**
   * Update cached content
   */
  async updateCachedContent(
    cacheId: string,
    request: UpdateCachedContentRequest
  ): Promise<CachedContentResponse | null> {
    const entry = this.cache.get(cacheId);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (new Date() > new Date(entry.expireTime)) {
      this.cache.delete(cacheId);
      return null;
    }

    const now = new Date();
    
    // Update expiration time if provided
    if (request.cachedContent.expireTime) {
      entry.expireTime = new Date(request.cachedContent.expireTime).toISOString();
    } else if (request.cachedContent.ttl) {
      const ttlSeconds = parseInt(request.cachedContent.ttl.replace('s', ''));
      entry.expireTime = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    }

    entry.updateTime = now.toISOString();
    
    // Reschedule cleanup
    this.scheduleCleanup(cacheId, new Date(entry.expireTime));

    return {
      name: entry.name,
      model: entry.model,
      displayName: entry.displayName,
      usageMetadata: entry.usageMetadata,
      createTime: entry.createTime,
      updateTime: entry.updateTime,
      expireTime: entry.expireTime
    };
  }

  /**
   * Delete cached content
   */
  async deleteCachedContent(cacheId: string): Promise<boolean> {
    return this.cache.delete(cacheId);
  }

  /**
   * List all cached content for a project/location
   */
  async listCachedContent(projectId: string, location: string): Promise<CachedContentResponse[]> {
    const prefix = `projects/${projectId}/locations/${location}/cachedContents/`;
    const results: CachedContentResponse[] = [];

    for (const [cacheId, entry] of this.cache.entries()) {
      if (entry.name.startsWith(prefix)) {
        // Check if expired
        if (new Date() > new Date(entry.expireTime)) {
          this.cache.delete(cacheId);
          continue;
        }

        results.push({
          name: entry.name,
          model: entry.model,
          displayName: entry.displayName,
          usageMetadata: entry.usageMetadata,
          createTime: entry.createTime,
          updateTime: entry.updateTime,
          expireTime: entry.expireTime
        });
      }
    }

    return results;
  }

  /**
   * Use cached content in a generation request
   */
  async applyCachedContent(cacheId: string, newContents: Content[]): Promise<{
    allContents: Content[];
    usedCache: boolean;
    cacheTokenCount: number;
  }> {
    const entry = await this.getCachedContent(cacheId);
    
    if (!entry) {
      return {
        allContents: newContents,
        usedCache: false,
        cacheTokenCount: 0
      };
    }

    // Combine cached content with new content
    const allContents: Content[] = [];
    
    // Add system instruction if present
    if (entry.systemInstruction) {
      allContents.push(entry.systemInstruction);
    }

    // Add cached contents
    if (entry.contents) {
      allContents.push(...entry.contents);
    }

    // Add new contents
    allContents.push(...newContents);

    return {
      allContents,
      usedCache: true,
      cacheTokenCount: entry.usageMetadata?.totalTokenCount || 0
    };
  }

  /**
   * Clean up expired entries
   */
  cleanupExpiredEntries(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [cacheId, entry] of this.cache.entries()) {
      if (now > new Date(entry.expireTime)) {
        expiredKeys.push(cacheId);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    totalTokensCached: number;
    memoryUsage: string;
  } {
    let totalTokens = 0;
    
    for (const entry of this.cache.values()) {
      totalTokens += entry.usageMetadata?.totalTokenCount || 0;
    }

    return {
      totalEntries: this.cache.size,
      totalTokensCached: totalTokens,
      memoryUsage: `${Math.round(JSON.stringify(Array.from(this.cache.values())).length / 1024)} KB`
    };
  }

  // Private helper methods

  private calculateTokenCount(request: CachedContentRequest): number {
    let tokenCount = 0;

    // Estimate tokens for system instruction
    if (request.systemInstruction) {
      tokenCount += this.estimateContentTokens(request.systemInstruction);
    }

    // Estimate tokens for contents
    if (request.contents) {
      for (const content of request.contents) {
        tokenCount += this.estimateContentTokens(content);
      }
    }

    return tokenCount;
  }

  private estimateContentTokens(content: Content): number {
    if (!content.parts) return 0;

    let tokens = 0;
    for (const part of content.parts) {
      if ('text' in part && part.text) {
        // Rough estimation: 1 token per 4 characters
        tokens += Math.ceil(part.text.length / 4);
      }
      // Add token estimates for other part types as needed
    }

    return tokens;
  }

  private scheduleCleanup(cacheId: string, expireTime: Date): void {
    const delay = expireTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(() => {
        this.cache.delete(cacheId);
      }, delay);
    }
  }
}

export const contextCachingService = new ContextCachingService(); 