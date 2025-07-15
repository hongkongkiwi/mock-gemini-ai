import { config } from 'dotenv';

// Load environment variables for tests
config();

// Global test configuration
export const TEST_CONFIG = {
  // API Keys for integration tests (optional)
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID || 'test-project',
  GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  
  // Test timeouts
  API_TIMEOUT: 30000,
  MOCK_DELAY: 10, // Fast mocks for tests
  
  // Integration test flags
  RUN_INTEGRATION_TESTS: process.env.RUN_INTEGRATION_TESTS === 'true',
  COMPARE_WITH_REAL_APIS: process.env.COMPARE_WITH_REAL_APIS === 'true'
};

// Helper to skip integration tests if API keys are not provided
export const skipIfNoApiKeys = () => {
  if (!TEST_CONFIG.GOOGLE_AI_API_KEY && TEST_CONFIG.COMPARE_WITH_REAL_APIS) {
    console.warn('⚠️  Skipping real API comparison tests - GOOGLE_AI_API_KEY not set');
    return true;
  }
  return false;
}; 