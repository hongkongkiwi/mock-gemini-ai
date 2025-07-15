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
  // For implicit caching
  contentHash?: string;
  hitCount?: number;
  lastHitTime?: string;
}

interface CacheStats {
  totalCaches: number;
  activeCaches: number;
  expiredCaches: number;
  totalTokensStored: number;
  totalHits: number;
  implicitCacheHits: number;
  explicitCacheHits: number;
}

interface ImplicitCacheResult {
  hit: boolean;
  cacheId?: string;
  tokenCount: number;
  savings: number;
}

/**
 * Context Caching Service for managing cached content to optimize costs
 */
export class ContextCachingService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheIdCounter = 1;
  private implicitCacheMap: Map<string, string> = new Map(); // contentHash -> cacheId
  private stats = {
    totalHits: 0,
    implicitCacheHits: 0,
    explicitCacheHits: 0
  };

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

    // Generate content hash for implicit caching
    const contentHash = this.generateContentHash(request);

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
      ttl: request.ttl,
      contentHash,
      hitCount: 0,
      lastHitTime: undefined
    };

    this.cache.set(cacheId, cacheEntry);

    // Add to implicit cache map
    if (contentHash) {
      this.implicitCacheMap.set(contentHash, cacheId);
    }

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
   * Check for implicit cache hit based on content prefix
   */
  checkImplicitCache(contents: Content[], model: string): ImplicitCacheResult {
    const contentText = this.extractTextFromContents(contents);
    
    // Minimum token counts for cache eligibility
    const minTokens = model.includes('2.5-flash') ? 1024 : 
                     model.includes('2.5-pro') ? 2048 : 1024;
    
    const estimatedTokens = this.estimateTokenCount(contentText);
    
    if (estimatedTokens < minTokens) {
      return { hit: false, tokenCount: 0, savings: 0 };
    }

    // Check for prefix matches in existing caches
    for (const [cacheId, entry] of this.cache.entries()) {
      if (this.isExpired(entry) || entry.model !== model) {
        continue;
      }

      const cachedText = this.extractTextFromContents(entry.contents || []);
      
      // Check if current content starts with cached content (prefix match)
      if (contentText.startsWith(cachedText) && cachedText.length > 0) {
        // Update hit statistics
        entry.hitCount = (entry.hitCount || 0) + 1;
        entry.lastHitTime = new Date().toISOString();
        this.stats.totalHits++;
        this.stats.implicitCacheHits++;

        const cacheTokenCount = entry.usageMetadata?.totalTokenCount || 0;
        const savings = Math.floor(cacheTokenCount * 0.75); // 75% savings

        return {
          hit: true,
          cacheId,
          tokenCount: cacheTokenCount,
          savings
        };
      }
    }

    return { hit: false, tokenCount: 0, savings: 0 };
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
    if (this.isExpired(entry)) {
      this.cache.delete(cacheId);
      if (entry.contentHash) {
        this.implicitCacheMap.delete(entry.contentHash);
      }
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
    if (this.isExpired(entry)) {
      this.cache.delete(cacheId);
      if (entry.contentHash) {
        this.implicitCacheMap.delete(entry.contentHash);
      }
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
    const entry = this.cache.get(cacheId);
    if (entry && entry.contentHash) {
      this.implicitCacheMap.delete(entry.contentHash);
    }
    return this.cache.delete(cacheId);
  }

  /**
   * List all cached content for a project/location with pagination
   */
  async listCachedContent(
    projectId: string, 
    location: string, 
    pageSize: number = 50,
    pageToken?: string
  ): Promise<{
    cachedContents: CachedContentResponse[];
    nextPageToken?: string;
  }> {
    const prefix = `projects/${projectId}/locations/${location}/cachedContents/`;
    const results: CachedContentResponse[] = [];

    // Convert to array and filter by prefix
    const entries = Array.from(this.cache.entries())
      .filter(([cacheId, entry]) => entry.name.startsWith(prefix))
      .filter(([cacheId, entry]) => !this.isExpired(entry));

    // Handle pagination
    const startIndex = pageToken ? parseInt(pageToken) : 0;
    const endIndex = Math.min(startIndex + pageSize, entries.length);
    const paginatedEntries = entries.slice(startIndex, endIndex);

    for (const [cacheId, entry] of paginatedEntries) {
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

    const response: any = { cachedContents: results };
    
    // Add next page token if there are more results
    if (endIndex < entries.length) {
      response.nextPageToken = endIndex.toString();
    }

    return response;
  }

  /**
   * Use cached content in a generation request with implicit cache checking
   */
  async applyCachedContent(cacheId: string, newContents: Content[]): Promise<{
    allContents: Content[];
    usedCache: boolean;
    cacheTokenCount: number;
    implicitCacheHit?: boolean;
  }> {
    const entry = await this.getCachedContent(cacheId);
    
    if (!entry) {
      return {
        allContents: newContents,
        usedCache: false,
        cacheTokenCount: 0
      };
    }

    // Update explicit cache hit statistics
    entry.hitCount = (entry.hitCount || 0) + 1;
    entry.lastHitTime = new Date().toISOString();
    this.stats.totalHits++;
    this.stats.explicitCacheHits++;

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
   * Get comprehensive cache statistics
   */
  getCacheStats(): CacheStats {
    let activeCaches = 0;
    let expiredCaches = 0;
    let totalTokensStored = 0;

    for (const entry of this.cache.values()) {
      if (this.isExpired(entry)) {
        expiredCaches++;
      } else {
        activeCaches++;
        totalTokensStored += entry.usageMetadata?.totalTokenCount || 0;
      }
    }

    return {
      totalCaches: this.cache.size,
      activeCaches,
      expiredCaches,
      totalTokensStored,
      totalHits: this.stats.totalHits,
      implicitCacheHits: this.stats.implicitCacheHits,
      explicitCacheHits: this.stats.explicitCacheHits
    };
  }

  /**
   * Clear all caches (for testing purposes)
   */
  clearAllCaches(): void {
    this.cache.clear();
    this.implicitCacheMap.clear();
    this.stats = {
      totalHits: 0,
      implicitCacheHits: 0,
      explicitCacheHits: 0
    };
    this.cacheIdCounter = 1;
  }

  /**
   * Clean up expired entries
   */
  cleanupExpiredEntries(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [cacheId, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(cacheId);
        if (entry.contentHash) {
          this.implicitCacheMap.delete(entry.contentHash);
        }
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  // Private helper methods

  private isExpired(entry: CacheEntry): boolean {
    return new Date() > new Date(entry.expireTime);
  }

  private generateContentHash(request: CachedContentRequest): string {
    const content = JSON.stringify({
      model: request.model,
      systemInstruction: request.systemInstruction,
      contents: request.contents,
      tools: request.tools
    });
    
    // Simple hash function (for production, use a proper hash function)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private extractTextFromContents(contents: Content[]): string {
    return contents
      .map(content => 
        content.parts
          ?.filter(part => 'text' in part)
          .map(part => (part as any).text)
          .join(' ') || ''
      )
      .join(' ');
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

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
        this.deleteCachedContent(cacheId);
      }, delay);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const contextCachingService = new ContextCachingService(); 