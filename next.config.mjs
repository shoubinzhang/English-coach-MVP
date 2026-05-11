/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't bundle the Agent SDK — it ships a native `claude` binary alongside
  // itself and resolves the path via `import.meta.url`. Webpack bundling
  // breaks that resolution and the SDK silently falls back to direct API
  // calls (which then 401 because subscription auth isn't an API key).
  experimental: {
    serverComponentsExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
  },
};

export default nextConfig;
