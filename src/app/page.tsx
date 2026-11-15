import { connection } from "next/server";
import BookingFlow from "@/features/booking/components/booking-flow";
import { chaabiPaymentsEnabled } from "@/features/payments/chaabi";

export default async function Page() {
  await connection();
  return <BookingFlow onlinePayment={chaabiPaymentsEnabled()} />;
}
