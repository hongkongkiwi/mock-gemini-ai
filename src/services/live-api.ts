import { WebSocket } from 'ws';
import { 
  LiveAPIConfig, 
  LiveAPIMessage, 
  Content,
  GenerateContentRequest,
  GenerateContentResponse 
} from '../types/vertex-ai';
import { MockGeminiService } from './mock-service';

interface LiveSession {
  id: string;
  ws: WebSocket;
  config: LiveAPIConfig;
  conversation: Content[];
  isSetupComplete: boolean;
  createdAt: Date;
  lastActivityAt: Date;
}

/**
 * Live API Service for real-time bidirectional communication
 */
export class LiveAPIService {
  private sessions: Map<string, LiveSession> = new Map();
  private sessionIdCounter = 1;
  private mockService: MockGeminiService;

  constructor(mockService: MockGeminiService) {
    this.mockService = mockService;
    
    // Cleanup inactive sessions every 5 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Create a new live session
   */
  createSession(ws: WebSocket, config: LiveAPIConfig): string {
    const sessionId = `live-session-${this.sessionIdCounter++}`;
    
    const session: LiveSession = {
      id: sessionId,
      ws,
      config,
      conversation: [],
      isSetupComplete: false,
      createdAt: new Date(),
      lastActivityAt: new Date()
    };

    this.sessions.set(sessionId, session);
    this.setupWebSocketHandlers(session);

    return sessionId;
  }

  /**
   * Handle incoming live API message
   */
  async handleMessage(sessionId: string, message: LiveAPIMessage): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.lastActivityAt = new Date();

    try {
      if (message.setupComplete) {
        await this.handleSetupComplete(session);
      } else if (message.clientContent) {
        await this.handleClientContent(session, message.clientContent);
      } else if (message.realtimeInput) {
        await this.handleRealtimeInput(session, message.realtimeInput);
      }
    } catch (error) {
      console.error(`Error handling message in session ${sessionId}:`, error);
      this.sendError(session, 'Failed to process message');
    }
  }

  /**
   * End a live session
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.close();
      }
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    activeSessions: number;
    totalSessions: number;
    avgSessionDuration: number;
  } {
    const now = new Date();
    let totalDuration = 0;
    
    for (const session of this.sessions.values()) {
      totalDuration += now.getTime() - session.createdAt.getTime();
    }

    return {
      activeSessions: this.sessions.size,
      totalSessions: this.sessionIdCounter - 1,
      avgSessionDuration: this.sessions.size > 0 ? totalDuration / this.sessions.size : 0
    };
  }

  // Private methods

  private setupWebSocketHandlers(session: LiveSession): void {
    session.ws.on('close', () => {
      this.sessions.delete(session.id);
    });

    session.ws.on('error', (error: Error) => {
      console.error(`WebSocket error in session ${session.id}:`, error);
      this.sessions.delete(session.id);
    });
  }

  private async handleSetupComplete(session: LiveSession): Promise<void> {
    session.isSetupComplete = true;
    
    // Send welcome message
    const welcomeResponse = {
      serverContent: {
        modelTurn: {
          parts: [{
            text: `Hello! I'm ready for real-time conversation. ${
              session.config.responseModalities.includes('AUDIO') 
                ? 'I can respond with both text and audio.' 
                : 'I can respond with text.'
            }`
          }]
        },
        turnComplete: true
      }
    };

    this.sendMessage(session, welcomeResponse);
  }

  private async handleClientContent(
    session: LiveSession, 
    clientContent: { turns: Content[]; turnComplete: boolean }
  ): Promise<void> {
    // Add client turns to conversation
    session.conversation.push(...clientContent.turns);

    if (clientContent.turnComplete) {
      // Generate response
      const response = await this.generateResponse(session);
      
      const serverResponse = {
        serverContent: {
          modelTurn: {
            parts: response.candidates?.[0]?.content.parts || [{ text: 'I apologize, but I could not generate a response.' }]
          },
          turnComplete: true
        }
      };

      this.sendMessage(session, serverResponse);

      // Add model response to conversation
      if (response.candidates?.[0]?.content) {
        session.conversation.push(response.candidates[0].content);
      }
    }
  }

  private async handleRealtimeInput(
    session: LiveSession,
    realtimeInput: { mediaChunks: { mimeType: string; data: string }[] }
  ): Promise<void> {
    // Simulate processing audio chunks
    const audioChunks = realtimeInput.mediaChunks.filter(chunk => 
      chunk.mimeType.startsWith('audio/')
    );

    if (audioChunks.length > 0) {
      // Simulate transcription
      const transcribedText = this.simulateAudioTranscription(audioChunks);
      
      if (transcribedText) {
        // Add transcribed content to conversation
        const audioContent: Content = {
          parts: [{ text: transcribedText }],
          role: 'user'
        };
        
        session.conversation.push(audioContent);

        // Generate response
        const response = await this.generateResponse(session);
        
        const serverResponse = {
          serverContent: {
            modelTurn: {
              parts: response.candidates?.[0]?.content.parts || [{ text: 'I heard you, but could not process the audio.' }]
            },
            turnComplete: true
          }
        };

        this.sendMessage(session, serverResponse);

        // Add model response to conversation
        if (response.candidates?.[0]?.content) {
          session.conversation.push(response.candidates[0].content);
        }
      }
    }
  }

  private async generateResponse(session: LiveSession): Promise<GenerateContentResponse> {
    // Create a generate content request from conversation
    const request: GenerateContentRequest = {
      contents: session.conversation.slice(-10) // Keep last 10 turns for context
    };

    // Use the mock service to generate response
    return await this.mockService.generateContent(request, 'gemini-2.0-flash');
  }

  private simulateAudioTranscription(audioChunks: { mimeType: string; data: string }[]): string {
    // Simulate audio transcription - in real implementation, this would use speech-to-text
    const sampleTranscriptions = [
      "Hello, how are you today?",
      "Can you help me with a question?",
      "What's the weather like?",
      "Tell me about artificial intelligence.",
      "How do you work?",
      "That's interesting, tell me more.",
      "I understand, thank you.",
      "Can you explain that differently?",
      "What do you think about that?",
      "That makes sense."
    ];

    // Return a random transcription for simulation
    return sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)];
  }

  private sendMessage(session: LiveSession, message: any): void {
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(message));
    }
  }

  private sendError(session: LiveSession, error: string): void {
    const errorMessage = {
      error: {
        code: 500,
        message: error,
        status: 'INTERNAL'
      }
    };
    this.sendMessage(session, errorMessage);
  }

  private cleanupInactiveSessions(): void {
    const now = new Date();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivityAt.getTime() > maxInactiveTime) {
        this.endSession(sessionId);
      }
    }
  }
}

// Export singleton instance
let liveAPIService: LiveAPIService | null = null;

export function createLiveAPIService(mockService: MockGeminiService): LiveAPIService {
  if (!liveAPIService) {
    liveAPIService = new LiveAPIService(mockService);
  }
  return liveAPIService;
}

export function getLiveAPIService(): LiveAPIService | null {
  return liveAPIService;
} 