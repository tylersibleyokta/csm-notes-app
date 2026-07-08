import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGoogleConnected } from "@/lib/google";
import { NotesApp } from "@/components/NotesApp";

export default async function HomePage(props: PageProps<"/">) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const googleConnected = await isGoogleConnected(session.user.id);

  const notes = await prisma.meetingNote.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const initialNotes = notes.map((note) => ({
    id: note.id,
    accountName: note.accountName,
    summary: note.summary ?? "",
    actionItems: note.actionItems ? JSON.parse(note.actionItems) : [],
    createdAt: note.createdAt.toISOString(),
  }));

  const googleError = typeof searchParams.googleError === "string" ? searchParams.googleError : undefined;
  const justConnected = searchParams.googleConnected === "1";

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>CSM Meeting Notes</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" style={{ background: "none", border: "none", color: "#666", cursor: "pointer" }}>
            Sign out ({session.user.email})
          </button>
        </form>
      </div>
      <NotesApp
        googleConnected={googleConnected}
        initialNotes={initialNotes}
        googleError={googleError}
        justConnected={justConnected}
      />
    </main>
  );
}
