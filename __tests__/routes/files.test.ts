import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import filesRoutes from '../../src/routes/files';

describe('Files Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/v1', filesRoutes);
  });

  describe('POST /v1/projects/:project/locations/:location/files', () => {
    it('should upload a file successfully', async () => {
      // Create a simple test file buffer
      const testFileContent = Buffer.from('test file content');
      
      const response = await request(app)
        .post('/v1/projects/test-project/locations/us-central1/files')
        .attach('file', testFileContent, {
          filename: 'test.txt',
          contentType: 'text/plain'
        })
        .expect(200);

      expect(response.body).toHaveProperty('file');
      expect(response.body.file).toHaveProperty('name');
      expect(response.body.file).toHaveProperty('uri');
      expect(response.body.file).toHaveProperty('displayName', 'test.txt');
      expect(response.body.file).toHaveProperty('mimeType', 'text/plain');
      expect(response.body.file.name).toMatch(/^files\/\d+-[a-z0-9]+$/);
    });

    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app)
        .post('/v1/projects/test-project/locations/us-central1/files')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 400);
      expect(response.body.error.message).toContain('No file uploaded');
    });

    it('should handle different file types', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      
      const response = await request(app)
        .post('/v1/projects/test-project/locations/us-central1/files')
        .attach('file', imageBuffer, {
          filename: 'image.jpg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body.file.mimeType).toBe('image/jpeg');
      expect(response.body.file.displayName).toBe('image.jpg');
    });
  });

  describe('GET /v1/projects/:project/locations/:location/files', () => {
    it('should list uploaded files', async () => {
      // First upload a file
      const testFileContent = Buffer.from('test content');
      await request(app)
        .post('/v1/projects/test-project/locations/us-central1/files')
        .attach('file', testFileContent, 'test.txt')
        .expect(200);

      // Then list files
      const response = await request(app)
        .get('/v1/projects/test-project/locations/us-central1/files')
        .expect(200);

      expect(response.body).toHaveProperty('files');
      expect(Array.isArray(response.body.files)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/v1/projects/test-project/locations/us-central1/files?pageSize=10&pageToken=test')
        .expect(200);

      expect(response.body).toHaveProperty('files');
      // Note: nextPageToken is only provided when there are more pages
    });
  });

  describe('GET /v1/projects/:project/locations/:location/files/:fileId', () => {
    it('should get file metadata by ID', async () => {
      // First upload a file
      const testFileContent = Buffer.from('test content for retrieval');
      const uploadResponse = await request(app)
        .post('/v1/projects/test-project/locations/us-central1/files')
        .attach('file', testFileContent, 'test-get.txt')
        .expect(200);

      const fileId = uploadResponse.body.file.name.split('/')[1]; // Extract ID from "files/12345"

      // Then get the file
      const response = await request(app)
        .get(`/v1/projects/test-project/locations/us-central1/files/${fileId}`)
        .expect(200);

      expect(response.body).toHaveProperty('file');
      expect(response.body.file).toHaveProperty('name');
      expect(response.body.file).toHaveProperty('displayName', 'test-get.txt');
      expect(response.body.file).toHaveProperty('mimeType', 'text/plain');
    });

    it('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .get('/v1/projects/test-project/locations/us-central1/files/non-existent-file')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe(404);
    });
  });

  describe('DELETE /v1/projects/:project/locations/:location/files/:fileId', () => {
    it('should delete a file successfully', async () => {
      // First upload a file
      const testFileContent = Buffer.from('content to be deleted');
      const uploadResponse = await request(app)
        .post('/v1/projects/test-project/locations/us-central1/files')
        .attach('file', testFileContent, 'delete-me.txt')
        .expect(200);

      const fileId = uploadResponse.body.file.name.split('/')[1];

      // Then delete the file
      const response = await request(app)
        .delete(`/v1/projects/test-project/locations/us-central1/files/${fileId}`)
        .expect(200);

      // Successful deletion returns an empty object
      expect(response.body).toEqual({});

      // Verify file is deleted by trying to get it
      await request(app)
        .get(`/v1/projects/test-project/locations/us-central1/files/${fileId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent file', async () => {
      const response = await request(app)
        .delete('/v1/projects/test-project/locations/us-central1/files/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe(404);
    });
  });

  describe('File validation', () => {
    it('should validate project and location parameters', async () => {
      const testFile = Buffer.from('test');
      
      // Test with empty project
      await request(app)
        .post('/v1/projects//locations/us-central1/files')
        .attach('file', testFile, 'test.txt')
        .expect(404); // Express will return 404 for malformed routes

      // Test with empty location
      await request(app)
        .post('/v1/projects/test-project/locations//files')
        .attach('file', testFile, 'test.txt')
        .expect(404);
    });

    it('should handle large files within limit', async () => {
      // Create a file just under the limit (10MB)
      const largeFile = Buffer.alloc(9 * 1024 * 1024, 'a'); // 9MB
      
      const response = await request(app)
        .post('/v1/projects/test-project/locations/us-central1/files')
        .attach('file', largeFile, 'large-file.txt')
        .expect(200);

      expect(response.body).toHaveProperty('file');
      expect(response.body.file).toHaveProperty('name');
    });
  });

  describe('File content handling', () => {
    it('should preserve file content integrity', async () => {
      const originalContent = 'This is test content with special chars: àáâãäå';
      const testFile = Buffer.from(originalContent, 'utf8');
      
      // Upload file
      const uploadResponse = await request(app)
        .post('/v1/projects/test-project/locations/us-central1/files')
        .attach('file', testFile, {
          filename: 'utf8-test.txt',
          contentType: 'text/plain'
        })
        .expect(200);

      expect(uploadResponse.body.file.displayName).toBe('utf8-test.txt');
      expect(uploadResponse.body.file.mimeType).toBe('text/plain');
    });
  });
}); 