import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";

const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";
const TASK_LIST_TITLE = "CSM Notes";
export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

function baseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

function redirectUri(): string {
  return `${baseUrl()}/api/google/callback`;
}

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri()
  );
}

export function getGoogleAuthUrl(state: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_TASKS_SCOPE],
    state,
  });
}

export async function linkGoogleAccount(userId: string, code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Revoke prior access at https://myaccount.google.com/permissions and try connecting again."
    );
  }

  await prisma.googleAccount.upsert({
    where: { userId },
    create: {
      userId,
      refreshToken: encrypt(tokens.refresh_token),
      accessToken: tokens.access_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    update: {
      refreshToken: encrypt(tokens.refresh_token),
      accessToken: tokens.access_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });
}

async function getAuthorizedClientForUser(userId: string) {
  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!account) return null;

  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: decrypt(account.refreshToken) });
  return { client, account };
}

async function ensureTaskListId(
  tasks: ReturnType<typeof google.tasks>,
  userId: string,
  existingTaskListId: string | null
): Promise<string> {
  if (existingTaskListId) return existingTaskListId;

  const { data } = await tasks.tasklists.list();
  const existing = data.items?.find((list) => list.title === TASK_LIST_TITLE);
  const taskListId = existing?.id ?? (await tasks.tasklists.insert({ requestBody: { title: TASK_LIST_TITLE } })).data.id;

  if (!taskListId) {
    throw new Error("Failed to resolve a Google Tasks list to push into.");
  }

  await prisma.googleAccount.update({ where: { userId }, data: { taskListId } });
  return taskListId;
}

export async function isGoogleConnected(userId: string): Promise<boolean> {
  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  return account !== null;
}

export async function pushActionItemsToGoogleTasks(
  userId: string,
  items: string[]
): Promise<void> {
  const authorized = await getAuthorizedClientForUser(userId);
  if (!authorized) {
    throw new Error("Google Tasks is not connected for this user.");
  }

  const tasks = google.tasks({ version: "v1", auth: authorized.client });
  const taskListId = await ensureTaskListId(tasks, userId, authorized.account.taskListId);

  for (const title of items) {
    await tasks.tasks.insert({ tasklist: taskListId, requestBody: { title } });
  }
}
