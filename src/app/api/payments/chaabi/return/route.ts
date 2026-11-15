import { CHAABI_ORDER_PATTERN, getChaabiConfig } from "@/features/payments/chaabi";

function returnToResult(request: Request) {
  const config = getChaabiConfig();
  if (!config) return new Response("Service de paiement indisponible.", { status: 503 });

  const order = new URL(request.url).searchParams.get("order");
  const result = new URL("/payment/result", config.siteOrigin);
  if (order && CHAABI_ORDER_PATTERN.test(order)) result.searchParams.set("order", order);
  return Response.redirect(result, 303);
}

export const POST = returnToResult;
export const GET = returnToResult;
