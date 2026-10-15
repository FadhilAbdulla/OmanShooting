import { isDemo } from "@/lib/utils";
import { LoginForm } from "../login/login-form";

export const dynamic = "force-dynamic";

export default function Page() {
  return <div className="mx-auto max-w-sm py-8"><LoginForm mode="signup" demo={isDemo()} /></div>;
}
