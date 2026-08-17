import { Suspense, type ReactNode } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage(): ReactNode {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
