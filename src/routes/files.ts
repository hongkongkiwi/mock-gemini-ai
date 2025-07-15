import { Router, Request, Response } from 'express';
import multer from 'multer';
import { createGoogleCloudError } from '../middleware/google-cloud-errors';
import { validateProjectAndLocationForFiles } from '../middleware/project-validation';

const router: Router = Router();

// Apply project and location validation middleware to all file routes
router.use(validateProjectAndLocationForFiles);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// In-memory storage for uploaded files (in production, use cloud storage)
const uploadedFiles = new Map<string, {
  name: string;
  mimeType: string;
  data: Buffer;
  uploadTime: Date;
}>();

// Upload a file - POST /v1/projects/{project}/locations/{location}/files
router.post('/projects/:project/locations/:location/files', 
  upload.single('file'), 
  (req: Request, res: Response): void => {
    try {
      if (!req.file) {
        res.status(400).json(createGoogleCloudError(
          400,
          'No file uploaded. Please include a file in the request.'
        ));
        return;
      }

      const fileId = `files/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const displayName = req.file.originalname;
      const mimeType = req.file.mimetype;

      // Store file in memory (use cloud storage in production)
      uploadedFiles.set(fileId, {
        name: displayName,
        mimeType,
        data: req.file.buffer,
        uploadTime: new Date()
      });

      res.json({
        file: {
          name: fileId,
          displayName,
          mimeType,
          sizeBytes: req.file.size.toString(),
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          sha256Hash: '', // Would calculate in production
          uri: `gs://mock-bucket/${fileId}`,
          state: 'ACTIVE'
        }
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json(createGoogleCloudError(
        500,
        'Internal server error during file upload.'
      ));
    }
  }
);

// Get file metadata - GET /v1/projects/{project}/locations/{location}/files/{file}
router.get('/projects/:project/locations/:location/files/:fileId', 
  (req: Request, res: Response): void => {
    try {
      const { fileId } = req.params;
      const file = uploadedFiles.get(`files/${fileId}`);

      if (!file) {
        res.status(404).json(createGoogleCloudError(
          404,
          `File files/${fileId} not found.`
        ));
        return;
      }

      res.json({
        file: {
          name: `files/${fileId}`,
          displayName: file.name,
          mimeType: file.mimeType,
          sizeBytes: file.data.length.toString(),
          createTime: file.uploadTime.toISOString(),
          updateTime: file.uploadTime.toISOString(),
          expirationTime: new Date(file.uploadTime.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          sha256Hash: '',
          uri: `gs://mock-bucket/files/${fileId}`,
          state: 'ACTIVE'
        }
      });
    } catch (error) {
      console.error('Error getting file:', error);
      res.status(500).json(createGoogleCloudError(
        500,
        'Internal server error getting file.'
      ));
    }
  }
);

// List files - GET /v1/projects/{project}/locations/{location}/files
router.get('/projects/:project/locations/:location/files', 
  (req: Request, res: Response): void => {
    try {
      const files = Array.from(uploadedFiles.entries()).map(([id, file]) => ({
        name: id,
        displayName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.data.length.toString(),
        createTime: file.uploadTime.toISOString(),
        updateTime: file.uploadTime.toISOString(),
        expirationTime: new Date(file.uploadTime.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        sha256Hash: '',
        uri: `gs://mock-bucket/${id}`,
        state: 'ACTIVE'
      }));

      res.json({
        files,
        nextPageToken: req.query.pageToken && files.length > 0 ? undefined : undefined
      });
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json(createGoogleCloudError(
        500,
        'Internal server error listing files.'
      ));
    }
  }
);

// Delete file - DELETE /v1/projects/{project}/locations/{location}/files/{file}
router.delete('/projects/:project/locations/:location/files/:fileId', 
  (req: Request, res: Response): void => {
    try {
      const { fileId } = req.params;
      const exists = uploadedFiles.has(`files/${fileId}`);

      if (!exists) {
        res.status(404).json(createGoogleCloudError(
          404,
          `File files/${fileId} not found.`
        ));
        return;
      }

      uploadedFiles.delete(`files/${fileId}`);
      res.json({}); // Empty response for successful deletion
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json(createGoogleCloudError(
        500,
        'Internal server error deleting file.'
      ));
    }
  }
);

export default router; 