import { isDevLogin, signIn } from "@/lib/auth";
import { DevLoginForm } from "@/components/DevLoginForm";

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 480, margin: "80px auto", padding: 16 }}>
      <h1>CSM Meeting Notes</h1>
      {isDevLogin ? (
        <>
          <p style={{ color: "#666" }}>
            Dev mode: no Okta app registered yet. Enter any name/email to sign in locally.
          </p>
          <DevLoginForm />
        </>
      ) : (
        <form
          action={async () => {
            "use server";
            await signIn("okta", { redirectTo: "/" });
          }}
        >
          <button type="submit" style={{ padding: 10 }}>
            Sign in with Okta
          </button>
        </form>
      )}
    </main>
  );
}
