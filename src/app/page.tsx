import { connection } from "next/server";
import BookingFlow from "./BookingFlow";
import { chaabiPaymentsEnabled } from "@/lib/chaabiPayment";

export default async function Page() {
  await connection();
  return <BookingFlow onlinePayment={chaabiPaymentsEnabled()} />;
}
