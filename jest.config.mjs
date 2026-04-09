import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^bson$': '<rootDir>/node_modules/bson/lib/bson.cjs',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(bson|mongodb|mongoose|@xenova/transformers|next-intl|@google/generative-ai|openai)/)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
