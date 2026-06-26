const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEV_EMAIL = "dev@meetmind.local";
const DEMO_EXTERNAL_ID = "demo-product-sync-001";

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMinutes(date, minutes) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

function demoEmbedding(text) {
  const vector = Array.from({ length: 64 }, () => 0);
  const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];

  for (const word of words) {
    let hash = 0;
    for (let index = 0; index < word.length; index += 1) {
      hash = (hash * 31 + word.charCodeAt(index)) >>> 0;
    }
    vector[hash % vector.length] += 1;
  }

  return vector;
}

function chunksFor(text) {
  const clean = text.trim();
  if (clean.length <= 900) return [clean];
  const chunks = [];
  for (let index = 0; index < clean.length; index += 900) {
    chunks.push(clean.slice(index, index + 900));
  }
  return chunks;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48);
}

async function ensureDevUser() {
  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    create: {
      email: DEV_EMAIL,
      name: "Dev User",
      emailVerified: new Date()
    },
    update: {
      name: "Dev User",
      emailVerified: new Date()
    }
  });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" }
  });

  if (membership) {
    return { user, workspace: membership.workspace };
  }

  const baseName = user.name || "Dev";
  const slug = `${slugify(baseName) || "workspace"}-${user.id.slice(0, 6)}`;
  const created = await prisma.workspaceMember.create({
    data: {
      role: "OWNER",
      user: { connect: { id: user.id } },
      workspace: {
        create: {
          name: `${baseName}'s Workspace`,
          slug,
          default: true
        }
      }
    },
    include: { workspace: true }
  });

  return { user, workspace: created.workspace };
}

async function seedMeeting(user, workspace) {
  const startsAt = addDays(new Date(), -1);
  startsAt.setHours(10, 0, 0, 0);
  const endsAt = addMinutes(startsAt, 45);

  const meeting = await prisma.meeting.upsert({
    where: {
      provider_externalId_ownerId: {
        provider: "GOOGLE",
        externalId: DEMO_EXTERNAL_ID,
        ownerId: user.id
      }
    },
    create: {
      ownerId: user.id,
      workspaceId: workspace.id,
      provider: "GOOGLE",
      externalId: DEMO_EXTERNAL_ID,
      title: "Demo Product Sync",
      description: "Sample meeting seeded for local development.",
      location: "MeetMind Demo Room",
      conferenceUrl: "https://meet.example.com/demo-product-sync",
      startsAt,
      endsAt,
      status: "COMPLETED",
      attendees: {
        create: [
          { name: "Dev User", email: DEV_EMAIL, response: "accepted" },
          { name: "Priya Shah", email: "priya@example.com", response: "accepted" },
          { name: "Alex Chen", email: "alex@example.com", response: "tentative" }
        ]
      }
    },
    update: {
      workspaceId: workspace.id,
      title: "Demo Product Sync",
      description: "Sample meeting seeded for local development.",
      startsAt,
      endsAt,
      status: "COMPLETED"
    }
  });

  await prisma.transcript.upsert({
    where: { meetingId: meeting.id },
    create: {
      meetingId: meeting.id,
      source: "seed",
      language: "en",
      content:
        "Priya: The onboarding flow is close, but users still miss the workspace setup step.\n" +
        "Alex: We can add a checklist to the dashboard and make the empty states more actionable.\n" +
        "Dev User: Let's prioritize sample data, clearer setup copy, and a follow-up on workspace limits.\n" +
        "Priya: I will draft the setup checklist today.\n" +
        "Alex: I will review the RAG search behavior after sample knowledge is indexed."
    },
    update: {}
  });

  await prisma.summary.upsert({
    where: { meetingId: meeting.id },
    create: {
      meetingId: meeting.id,
      model: "seed",
      executive: "The team agreed to improve onboarding by adding clearer setup guidance, realistic sample data, and follow-up checks for workspace and RAG behavior.",
      overview: "The meeting focused on reducing first-run confusion and making the dashboard useful before calendar integrations are configured.",
      detailed:
        "The group reviewed the first-run experience for local development. The main gap was that a valid dev login led to an empty dashboard. The agreed direction was to provide demo content, improve empty-state guidance, and keep optional integrations separate from the minimum working setup.",
      decisions: [
        "Use dev auth for local testing without Google or Microsoft OAuth.",
        "Seed demo meetings and knowledge so the dashboard is immediately usable."
      ],
      risks: [
        "Users may assume blank dashboards mean the app is broken.",
        "Optional provider setup can distract from testing core AI workflows."
      ],
      blockers: [
        "Calendar sync requires OAuth credentials that are not available in the current setup."
      ],
      nextSteps: [
        "Add a local seed command.",
        "Test meeting details, transcript editing, summaries, and knowledge pages.",
        "Connect real calendar providers later only if needed."
      ]
    },
    update: {}
  });

  await prisma.meetingExpansion.upsert({
    where: { meetingId: meeting.id },
    create: {
      meetingId: meeting.id,
      model: "seed",
      executionPlan: [
        { phase: "Now", owner: "Dev User", steps: ["Run the seed command", "Open the demo meeting", "Verify dashboard metrics"] },
        { phase: "Next", owner: "Product", steps: ["Improve onboarding copy", "Decide whether calendar sync is required for the demo"] }
      ],
      projectRoadmap: [
        { horizon: "This week", outcomes: ["Local demo flow works without OAuth", "Knowledge page has sample content"] },
        { horizon: "Later", outcomes: ["Provider OAuth can be added when credentials are available"] }
      ],
      timeline: [
        { period: "Day 1", work: ["Seed database", "Verify dashboard"] },
        { period: "Day 2", work: ["Test OpenAI-backed summarize and chat flows"] }
      ],
      milestones: [
        { name: "Demo-ready local app", due: "This week", acceptanceCriteria: ["Dashboard has meetings", "Meeting details are populated", "Knowledge base is not empty"] }
      ],
      resourceRequirements: [
        { resource: "OpenAI API key", reason: "Needed for real summaries, embeddings, and chat", priority: "High" },
        { resource: "Calendar OAuth credentials", reason: "Only needed for real calendar sync", priority: "Later" }
      ],
      successMetrics: [
        { metric: "First-run empty screens", target: "Zero key screens feel broken", measurement: "Manual local QA" }
      ]
    },
    update: {}
  });

  await prisma.actionItem.deleteMany({
    where: {
      meetingId: meeting.id,
      title: {
        in: ["Verify local demo flow", "Decide on calendar provider setup"]
      }
    }
  });

  await prisma.actionItem.createMany({
    data: [
      {
        meetingId: meeting.id,
        assigneeId: user.id,
        title: "Verify local demo flow",
        description: "Open the dashboard, meeting details, and knowledge base after seeding.",
        status: "OPEN",
        dueAt: addDays(new Date(), 1)
      },
      {
        meetingId: meeting.id,
        title: "Decide on calendar provider setup",
        description: "Keep Google and Microsoft blank unless real sync is required.",
        status: "IN_PROGRESS",
        dueAt: addDays(new Date(), 3)
      }
    ]
  });

  await prisma.followUpEmail.deleteMany({
    where: {
      meetingId: meeting.id,
      subject: "Follow-up: Demo Product Sync",
      model: "seed"
    }
  });

  await prisma.followUpEmail.create({
    data: {
      meetingId: meeting.id,
      model: "seed",
      subject: "Follow-up: Demo Product Sync",
      recipients: ["priya@example.com", "alex@example.com"],
      body:
        "Thanks for the sync. We agreed to keep OAuth integrations optional for now, seed demo data for local development, and verify the dashboard and knowledge workflows before adding more provider setup."
    }
  });

  const indexedMeeting = await prisma.meeting.findUniqueOrThrow({
    where: { id: meeting.id },
    include: { transcript: true, summary: true }
  });
  const meetingSource = [
    `Title: ${indexedMeeting.title}`,
    indexedMeeting.description ? `Description: ${indexedMeeting.description}` : "",
    indexedMeeting.summary?.executive ? `Executive summary: ${indexedMeeting.summary.executive}` : "",
    indexedMeeting.summary?.detailed ? `Detailed summary: ${indexedMeeting.summary.detailed}` : "",
    indexedMeeting.transcript?.content ? `Transcript: ${indexedMeeting.transcript.content}` : ""
  ].filter(Boolean).join("\n\n");
  const meetingChunks = chunksFor(meetingSource);

  await prisma.meetingEmbedding.deleteMany({ where: { meetingId: meeting.id } });
  await prisma.meetingEmbedding.createMany({
    data: meetingChunks.map((chunk, index) => ({
      meetingId: meeting.id,
      chunkIndex: index,
      content: chunk,
      embedding: demoEmbedding(chunk),
      metadata: { title: meeting.title, seed: true }
    }))
  });

  return meeting;
}

async function seedKnowledge(user, workspace) {
  const documents = [
    {
      title: "Local Development Checklist",
      sourceType: "NOTE",
      content:
        "Minimum local setup: DATABASE_URL, NEXTAUTH_URL, APP_URL, NEXTAUTH_SECRET, LOCAL_AUTH_ENABLED, and OPENAI_API_KEY. Google, Microsoft, and email can remain empty until those workflows are tested."
    },
    {
      title: "MeetMind Demo Positioning",
      sourceType: "DOCUMENT",
      content:
        "MeetMind AI turns meetings into summaries, action items, follow-up emails, and searchable organizational memory. The local demo should show meetings, transcripts, knowledge documents, and AI-ready workflows without requiring calendar OAuth."
    },
    {
      title: "Credential Policy",
      sourceType: "POLICY",
      content:
        "Do not commit real secrets. Rotate any API key or database password that has been pasted into shared tools. Keep optional integration credentials blank in local development unless actively testing them."
    }
  ];

  for (const document of documents) {
    const saved = await prisma.knowledgeDocument.upsert({
      where: {
        id: `${user.id}:${document.title}`
      },
      create: {
        id: `${user.id}:${document.title}`,
        ownerId: user.id,
        workspaceId: workspace.id,
        title: document.title,
        sourceType: document.sourceType,
        content: document.content
      },
      update: {
        workspaceId: workspace.id,
        content: document.content,
        sourceType: document.sourceType
      }
    });

    const knowledgeChunks = chunksFor(`${saved.title}\n\n${saved.content}`);
    await prisma.knowledgeEmbedding.deleteMany({ where: { documentId: saved.id } });
    await prisma.knowledgeEmbedding.createMany({
      data: knowledgeChunks.map((chunk, index) => ({
        documentId: saved.id,
        chunkIndex: index,
        content: chunk,
        embedding: demoEmbedding(chunk),
        metadata: { title: saved.title, sourceType: saved.sourceType, seed: true }
      }))
    });
  }
}

async function main() {
  const { user, workspace } = await ensureDevUser();
  const meeting = await seedMeeting(user, workspace);
  await seedKnowledge(user, workspace);

  console.log(`Seeded demo data for ${DEV_EMAIL}`);
  console.log(`Workspace: ${workspace.name}`);
  console.log(`Demo meeting: ${meeting.title}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
