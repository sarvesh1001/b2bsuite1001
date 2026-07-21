import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: 'http://localhost:8080/swagger/doc.json',
    },
    output: {
      mode: 'split',
      target: './src/generated/api.ts',
      schemas: './src/generated/models',
      client: 'react-query',
      baseUrl: 'http://localhost:8080/api/v1',
      mock: false,
      override: {
        mutator: {
          path: './src/axios-instance.ts',
          name: 'customAxiosInstance',
        },
      },
    },
  },
});