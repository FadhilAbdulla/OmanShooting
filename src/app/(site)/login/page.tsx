import { isDemo } from "@/lib/utils";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function Page() {
  return <LoginForm demo={isDemo()} />;
}
