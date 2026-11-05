import * as Sentry from "@sentry/nextjs";
import { sharedSentryOptions } from "@/lib/sentry";

// Foutmonitoring op de server (API-routes, server rendering, proxy).
export function register() {
  Sentry.init(sharedSentryOptions);
}

export const onRequestError = Sentry.captureRequestError;
