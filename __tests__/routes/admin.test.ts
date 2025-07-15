import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import adminRoutes from '../../src/routes/admin';
import { createMockGeminiService } from '../../src/services/mock-service';
import { PresetResponse } from '../../src/data/preset-responses';

describe('Admin Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/admin', adminRoutes);
  });

  describe('GET /admin/presets', () => {
    it('should return all preset responses', async () => {
      const response = await request(app)
        .get('/admin/presets')
        .expect(200);

      expect(response.body).toHaveProperty('presets');
      expect(Array.isArray(response.body.presets)).toBe(true);
    });
  });

  describe('GET /admin/presets/:id', () => {
    it('should return a specific preset by id', async () => {
      // First get all presets to find a valid ID
      const presetsResponse = await request(app)
        .get('/admin/presets')
        .expect(200);

      const presets = presetsResponse.body.presets;
      if (presets.length > 0) {
        const presetId = presets[0].id;
        
        const response = await request(app)
          .get(`/admin/presets/${presetId}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body.id).toBe(presetId);
      }
    });

    it('should return 404 for non-existent preset', async () => {
      const response = await request(app)
        .get('/admin/presets/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /admin/presets', () => {
    it('should create a new preset response', async () => {
      const newPreset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'A test preset',
        trigger: {
          type: 'text',
          value: 'test trigger'
        },
        response: {
          candidates: [{
            content: {
              parts: [{ text: 'Test response' }],
              role: 'model'
            },
            finishReason: 'STOP',
            index: 0
          }],
          usageMetadata: {
            promptTokenCount: 2,
            candidatesTokenCount: 2,
            totalTokenCount: 4
          }
        }
      };

      const response = await request(app)
        .post('/admin/presets')
        .send(newPreset)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('created');
    });

    it('should return 400 for invalid preset data', async () => {
      const invalidPreset = {
        name: 'Invalid Preset'
        // Missing required fields
      };

      const response = await request(app)
        .post('/admin/presets')
        .send(invalidPreset)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /admin/presets/:id', () => {
    it('should update an existing preset', async () => {
      const updateData = {
        name: 'Updated Preset Name',
        description: 'Updated description'
      };

      // First create a preset to update
      const createResponse = await request(app)
        .post('/admin/presets')
        .send({
          id: 'update-test',
          name: 'Original Name',
          description: 'Original description',
          trigger: { type: 'text', value: 'test' },
          response: {
            candidates: [{
              content: { parts: [{ text: 'response' }], role: 'model' },
              finishReason: 'STOP',
              index: 0
            }],
            usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 }
          }
        })
        .expect(201);

      const response = await request(app)
        .put('/admin/presets/update-test')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('updated');
    });
  });

  describe('DELETE /admin/presets/:id', () => {
    it('should delete an existing preset', async () => {
      // First create a preset to delete
      await request(app)
        .post('/admin/presets')
        .send({
          id: 'delete-test',
          name: 'Delete Test',
          description: 'Test preset for deletion',
          trigger: { type: 'text', value: 'delete test' },
          response: {
            candidates: [{
              content: { parts: [{ text: 'response' }], role: 'model' },
              finishReason: 'STOP',
              index: 0
            }],
            usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 }
          }
        })
        .expect(201);

      const response = await request(app)
        .delete('/admin/presets/delete-test')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted');
    });
  });

  describe('GET /admin/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/admin/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /admin/models', () => {
    it('should return list of available models', async () => {
      const response = await request(app)
        .get('/admin/models')
        .expect(200);

      expect(response.body).toHaveProperty('models');
      expect(Array.isArray(response.body.models)).toBe(true);
      expect(response.body.models.length).toBeGreaterThan(0);
    });
  });

  describe('GET /admin/stats', () => {
    it('should return service statistics', async () => {
      const response = await request(app)
        .get('/admin/stats')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalRequests');
      expect(response.body.stats).toHaveProperty('presetResponses');
    });
  });
}); 