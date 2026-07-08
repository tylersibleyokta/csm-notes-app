"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function DevLoginForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        await signIn("credentials", { name, email, callbackUrl: "/" });
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320 }}
    >
      <label>
        Name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: "block", width: "100%", padding: 8 }}
        />
      </label>
      <label>
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", width: "100%", padding: 8 }}
        />
      </label>
      <button type="submit" disabled={pending} style={{ padding: 10 }}>
        {pending ? "Signing in..." : "Sign in (dev mode)"}
      </button>
    </form>
  );
}
