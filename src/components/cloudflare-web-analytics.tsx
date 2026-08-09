import Script from "next/script";

const webAnalyticsToken =
  process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim();

export function CloudflareWebAnalytics() {
  if (!webAnalyticsToken) {
    return null;
  }

  return (
    <Script
      id="cloudflare-web-analytics"
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      type="module"
      data-cf-beacon={JSON.stringify({ token: webAnalyticsToken })}
    />
  );
}
