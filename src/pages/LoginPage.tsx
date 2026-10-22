import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn } from "lucide-react";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, type Location } from "react-router";
import { z } from "zod";

import logo from "../assets/logo.svg";
import { PasswordField } from "../components/PasswordField";
import { Button, Field, FormError } from "../components/ui";
import { applyServerErrors } from "../lib/applyServerErrors";
import { useAuthStore } from "../stores/authStore";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof schema>;

function getRedirectTarget(state: unknown): string {
  const from = (state as { from?: Location } | null)?.from;
  return from ? `${from.pathname}${from.search}` : "/webhooks";
}

export const LoginPage: FC = () => {
  const status = useAuthStore((store) => store.state.status);
  const signIn = useAuthStore((store) => store.signIn);
  const location = useLocation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  if (status === "authenticated") {
    return <Navigate to={getRedirectTarget(location.state)} replace />;
  }

  const onSubmit = async (values: LoginValues) => {
    try {
      await signIn(values);
    } catch (error) {
      // Only email is mapped to its field: wrong credentials come back on `password`, and the
      // message describes the pair, so it is shown for the whole form below the button.
      applyServerErrors(error, setError, ["email"]);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <img
        src={logo}
        alt="Smart Sender"
        className="h-16 w-auto animate-fade-in"
      />
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex w-full max-w-sm animate-pop-in flex-col gap-3 rounded-xl border border-line bg-surface p-6 shadow-lg shadow-slate-900/5"
      >
        <div>
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="text-sm text-fg-muted">Manage your webhooks</p>
        </div>
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="flex flex-col">
          <Button type="submit" disabled={isSubmitting} className="py-2">
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
          <FormError
            message={errors.root?.server?.message}
            pending={isSubmitting}
          />
        </div>
      </form>
    </main>
  );
};
