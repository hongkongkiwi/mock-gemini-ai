import express, { Router, Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { createLiveAPIService, getLiveAPIService } from '../services/live-api';
import { createMockGeminiService } from '../services/mock-service';
import { LiveAPIConfig, LiveAPIMessage } from '../types/vertex-ai';
import { validateProjectAndLocation, ProjectValidationRequest } from '../middleware/project-validation';

const router: Router = Router();

// Initialize Live API service
const mockService = createMockGeminiService();
const liveAPIService = createLiveAPIService(mockService);

/**
 * Get Live API session statistics
 */
router.get('/projects/:projectId/locations/:location/publishers/google/models/:model:generateContent:live',
  validateProjectAndLocation,
  (req: ProjectValidationRequest, res: Response) => {
    try {
      const stats = liveAPIService.getSessionStats();
      res.json({
        success: true,
        data: stats,
        message: 'Use WebSocket connection to start a live session'
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 500,
          message: 'Failed to get Live API stats',
          status: 'INTERNAL'
        }
      });
    }
  }
);

/**
 * WebSocket upgrade handler for Live API
 */
export function setupLiveAPIWebSocket(server: any): void {
  const wss = new WebSocketServer({ 
    server,
    path: '/v1/live',
    verifyClient: (info: { origin: string; secure: boolean; req: IncomingMessage }) => {
      // Basic verification - in production, add proper authentication
      return info.origin !== undefined;
    }
  });

  wss.on('connection', (ws: WebSocket, req: express.Request) => {
    console.log('New Live API WebSocket connection established');

    // Extract configuration from query parameters or headers
    const config: LiveAPIConfig = {
      responseModalities: ['TEXT', 'AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: 'en-US-Journey-D'
          }
        }
      }
    };

    // Create live session
    const sessionId = liveAPIService.createSession(ws, config);
    console.log(`Created live session: ${sessionId}`);

    // Handle incoming messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message: LiveAPIMessage = JSON.parse(data.toString());
        await liveAPIService.handleMessage(sessionId, message);
      } catch (error) {
        console.error(`Error processing message in session ${sessionId}:`, error);
        
        const errorResponse = {
          error: {
            code: 400,
            message: 'Invalid message format',
            status: 'INVALID_ARGUMENT'
          }
        };
        
        ws.send(JSON.stringify(errorResponse));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log(`Live session ${sessionId} ended`);
      liveAPIService.endSession(sessionId);
    });

    // Send initial connection confirmation
    const initialMessage = {
      setupRequired: true,
      supportedModalities: ['TEXT', 'AUDIO'],
      sessionId: sessionId
    };
    
    ws.send(JSON.stringify(initialMessage));
  });

  wss.on('error', (error: Error) => {
    console.error('Live API WebSocket Server error:', error);
  });

  console.log('🎙️  Live API WebSocket server initialized on /v1/live');
}

/**
 * Health check for Live API
 */
router.get('/live/health', (req: Request, res: Response) => {
  try {
    const service = getLiveAPIService();
    if (!service) {
      res.status(503).json({
        success: false,
        error: 'Live API service not initialized'
      });
      return;
    }

    const stats = service.getSessionStats();
    res.json({
      success: true,
      status: 'healthy',
      data: {
        ...stats,
        supportedFeatures: [
          'real-time-text',
          'audio-transcription', 
          'voice-synthesis',
          'session-management'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get Live API health status'
    });
  }
});

/**
 * Get Live API configuration
 */
router.get('/live/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      supportedModalities: ['TEXT', 'AUDIO'],
      voiceOptions: [
        'en-US-Journey-D',
        'en-US-Journey-F', 
        'en-US-Journey-O',
        'en-GB-Journey-D',
        'en-AU-Journey-D'
      ],
      maxSessionDuration: 1800, // 30 minutes
      maxConcurrentSessions: 100,
      audioFormats: [
        'audio/wav',
        'audio/pcm',
        'audio/opus'
      ]
    }
  });
});

export default router; 