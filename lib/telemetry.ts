export function trackEvent(event: string, properties?: Record<string, unknown>) {
  console.log(`[TELEMETRY] ${event}`, properties ?? {});
}
