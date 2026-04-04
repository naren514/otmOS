export function getDefaultQaApiBase(): string {
  const env = process.env.NEXT_PUBLIC_QA_API_BASE?.trim();
  return env && env.length > 0 ? env : "/api/qa";
}

export function getDefaultEdiApiBase(): string {
  const env = process.env.NEXT_PUBLIC_EDI_API_BASE?.trim();
  return env && env.length > 0 ? env : "/api/edi";
}

export function getDefaultOrdersApiBase(): string {
  const env = process.env.NEXT_PUBLIC_ORDERS_API_BASE?.trim();
  return env && env.length > 0 ? env : "/api/orders";
}
