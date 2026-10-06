import { requirePageRole } from "@/lib/auth";
import { EventForm } from "../event-form";

export default async function NewEvent() {
  await requirePageRole(["ADMIN"]);
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">New event</h1>
      <p className="text-sm text-stone-600">Events start as <b>drafts</b>. You can add competitions, generate the schedule and test-book them before publishing.</p>
      <EventForm />
    </div>
  );
}
