export function getDefaultQaApiBase(): string {
  const env = process.env.NEXT_PUBLIC_QA_API_BASE?.trim();
  return env && env.length > 0 ? env : "/api/qa";
}
