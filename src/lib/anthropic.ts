import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const client = new Anthropic();

const CleanupResultSchema = z.object({
  summary: z.string().describe("A polished, coherent prose summary of the meeting notes."),
  actionItems: z
    .array(z.string())
    .describe("Discrete next-step action items extracted from the notes, each a short imperative sentence."),
});

export type CleanupResult = z.infer<typeof CleanupResultSchema>;

export async function cleanupNotes(rawNotes: string, accountName?: string): Promise<CleanupResult> {
  const message = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system:
      "You turn a Customer Success Manager's raw meeting notes into two distinct outputs: a clean prose summary, and a separate list of concrete next-step action items. Do not invent details not present in the notes. Keep the summary to a few short paragraphs. Each action item should be a short, specific, actionable sentence a CSM could put directly into a task list.",
    messages: [
      {
        role: "user",
        content: accountName
          ? `Account: ${accountName}\n\nRaw notes:\n${rawNotes}`
          : `Raw notes:\n${rawNotes}`,
      },
    ],
    output_config: {
      format: zodOutputFormat(CleanupResultSchema),
    },
  });

  if (!message.parsed_output) {
    throw new Error("Claude did not return parseable output.");
  }
  return message.parsed_output;
}
