import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushActionItemsToGoogleTasks } from "@/lib/google";

type ActionItem = { text: string; pushed: boolean };

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json();
  const noteId = typeof body?.noteId === "string" ? body.noteId : undefined;
  const items: string[] = Array.isArray(body?.items) ? body.items.filter((i: unknown) => typeof i === "string") : [];

  if (!noteId || items.length === 0) {
    return NextResponse.json({ error: "noteId and a non-empty items array are required." }, { status: 400 });
  }

  const note = await prisma.meetingNote.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== session.user.id) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  try {
    await pushActionItemsToGoogleTasks(session.user.id, items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to push to Google Tasks.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const existing: ActionItem[] = note.actionItems ? JSON.parse(note.actionItems) : [];
  const pushedSet = new Set(items);
  const updated = existing.map((item) => (pushedSet.has(item.text) ? { ...item, pushed: true } : item));

  await prisma.meetingNote.update({
    where: { id: note.id },
    data: { actionItems: JSON.stringify(updated) },
  });

  return NextResponse.json({ actionItems: updated });
}
