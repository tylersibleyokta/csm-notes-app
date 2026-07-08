import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cleanupNotes } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json();
  const rawNotes = typeof body?.rawNotes === "string" ? body.rawNotes.trim() : "";
  const accountName = typeof body?.accountName === "string" ? body.accountName.trim() : undefined;

  if (!rawNotes) {
    return NextResponse.json({ error: "rawNotes is required." }, { status: 400 });
  }

  let result;
  try {
    result = await cleanupNotes(rawNotes, accountName);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const note = await prisma.meetingNote.create({
    data: {
      userId: session.user.id,
      accountName,
      rawNotes,
      summary: result.summary,
      actionItems: JSON.stringify(result.actionItems.map((text) => ({ text, pushed: false }))),
    },
  });

  return NextResponse.json({
    id: note.id,
    summary: note.summary,
    actionItems: result.actionItems.map((text) => ({ text, pushed: false })),
    createdAt: note.createdAt,
  });
}
