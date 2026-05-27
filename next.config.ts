import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://cdn.paddle.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.paddle.com https://sandbox-api.paddle.com https://*.paddle.com;
  frame-src 'self' https://*.paddle.com https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://*.paddle.com;
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), display-capture=()" },
        ],
      },
      {
        source: "/pro-tools",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/tools/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/api/email-auth/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
