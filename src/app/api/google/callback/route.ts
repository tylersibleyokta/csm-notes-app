import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { linkGoogleAccount, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google";

function homeUrl(path: string) {
  return new URL(path, process.env.APP_BASE_URL ?? "http://localhost:3000");
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(homeUrl("/login"));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (error) {
    return NextResponse.redirect(homeUrl(`/?googleError=${encodeURIComponent(error)}`));
  }
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(homeUrl("/?googleError=invalid_state"));
  }

  try {
    await linkGoogleAccount(session.user.id, code);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(homeUrl(`/?googleError=${encodeURIComponent(message)}`));
  }

  return NextResponse.redirect(homeUrl("/?googleConnected=1"));
}
