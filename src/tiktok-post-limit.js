export function postLimitForEvent(configuredLimit, eventName = process.env.GITHUB_EVENT_NAME) {
  if (!Number.isInteger(configuredLimit) || configuredLimit < 1) {
    throw new Error(`Invalid TikTok post limit: ${configuredLimit}`);
  }
  return eventName === "workflow_dispatch" ? Math.min(1, configuredLimit) : configuredLimit;
}
