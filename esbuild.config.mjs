import { build } from 'esbuild'
import { rmSync } from 'fs'

// Clean dist directory
try {
    rmSync('dist', { recursive: true, force: true })
} catch (e) {
    // Directory might not exist, ignore
}

build({
    entryPoints: ['src/backend.ts'],
    bundle: true,
    platform: 'node',
    target: 'es2020',
    format: 'esm',
    outfile: 'dist/backend.mjs',
    sourcemap: true,
    // CJS deps (e.g. https-proxy-agent) call require("net"). In an ESM
    // bundle that becomes esbuild's __require helper, which throws unless
    // a real require exists in module scope.
    banner: {
        js: `import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);`,
    },
    external: [
        // Database packages with dynamic requires or native dependencies
        'pg',
        '@prisma/client',
        '@prisma/adapter-pg',
        'prisma',
        
        // Vector database packages with dynamic requires
        '@pinecone-database/pinecone',
        // Keep AWS SDK + Smithy modules external to avoid dynamic-require
        // runtime failures when CJS internals are transformed in ESM bundles.
        '@aws-sdk/*',
        '@smithy/*',
        
        // AI/ML packages that may have dynamic requires
        'openai',
        '@langfuse/*',
        '@opentelemetry/*',
        
        // HTTP client packages with dynamic requires
        'axios',
        'form-data',
        'combined-stream',
        
        // Logging packages with dynamic requires
        '@logtail/node',
        '@sentry/node',
        '@sentry/*',
        
        // Packages with dynamic requires or native dependencies
        'dotenv',
        'express',
        'node-cron',
    ],
    // Node.js built-ins are automatically external when platform: 'node'
    // But we need to ensure packages using them are also external
    // Note: All packages NOT listed in external will be bundled
    // This includes @clerk/nextjs, next, react, react-dom as intended
    tsconfig: 'tsconfig.server.json',
    logLevel: 'info',
}).catch(() => process.exit(1))