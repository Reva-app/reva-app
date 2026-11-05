import * as Sentry from "@sentry/nextjs";
import { sharedSentryOptions } from "@/lib/sentry";

// Foutmonitoring in de browser (ook in de Capacitor-app). Geen Session Replay:
// die zou schermen met patiëntgegevens opnemen.
Sentry.init(sharedSentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
