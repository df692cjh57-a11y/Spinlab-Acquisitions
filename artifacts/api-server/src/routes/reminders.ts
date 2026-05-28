import { Router } from "express";
import { db } from "@workspace/db";
import { remindersTable, dealsTable, brokersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  ListRemindersQueryParams,
  CreateReminderBody,
  UpdateReminderBody,
} from "@workspace/api-zod";

const router = Router();

async function enrichReminder(r: typeof remindersTable.$inferSelect) {
  let linkedName: string | null = null;
  if (r.linkedType === "deal" && r.linkedId) {
    const [deal] = await db
      .select({ dealName: dealsTable.dealName })
      .from(dealsTable)
      .where(eq(dealsTable.id, r.linkedId));
    linkedName = deal?.dealName ?? null;
  } else if (r.linkedType === "broker" && r.linkedId) {
    const [broker] = await db
      .select({ name: brokersTable.name })
      .from(brokersTable)
      .where(eq(brokersTable.id, r.linkedId));
    linkedName = broker?.name ?? null;
  }
  return {
    ...r,
    linkedName,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// GET /reminders
router.get("/reminders", async (req, res) => {
  try {
    const params = ListRemindersQueryParams.parse(req.query);
    let reminders = await db.select().from(remindersTable).orderBy(remindersTable.dueDate);

    // Read completed directly from raw query to avoid zod.coerce.boolean() treating "false" as true
    if (req.query.completed !== undefined) {
      const completed = req.query.completed === "true";
      reminders = reminders.filter((r) => r.completed === completed);
    }
    if (params.linkedType) {
      reminders = reminders.filter((r) => r.linkedType === params.linkedType);
    }
    if (params.linkedId) {
      reminders = reminders.filter((r) => r.linkedId === Number(params.linkedId));
    }
    const today = new Date().toISOString().split("T")[0];
    if (params.overdueOnly) {
      reminders = reminders.filter((r) => !r.completed && r.dueDate < today);
    }
    if (params.dueToday) {
      reminders = reminders.filter((r) => !r.completed && r.dueDate === today);
    }

    const enriched = await Promise.all(reminders.map(enrichReminder));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /reminders
router.post("/reminders", async (req, res) => {
  try {
    const body = CreateReminderBody.parse(req.body);
    const [reminder] = await db
      .insert(remindersTable)
      .values({ ...body, updatedAt: new Date() })
      .returning();
    const enriched = await enrichReminder(reminder);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// GET /reminders/:id
router.get("/reminders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [reminder] = await db
      .select()
      .from(remindersTable)
      .where(eq(remindersTable.id, id));
    if (!reminder) return res.status(404).json({ error: "Not found" });
    const enriched = await enrichReminder(reminder);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /reminders/:id
router.patch("/reminders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdateReminderBody.parse(req.body);
    const [reminder] = await db
      .update(remindersTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(remindersTable.id, id))
      .returning();
    if (!reminder) return res.status(404).json({ error: "Not found" });
    const enriched = await enrichReminder(reminder);
    res.json(enriched);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// DELETE /reminders/:id
router.delete("/reminders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(remindersTable).where(eq(remindersTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /reminders/:id/complete
router.patch("/reminders/:id/complete", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [reminder] = await db
      .update(remindersTable)
      .set({ completed: true, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(remindersTable.id, id))
      .returning();
    if (!reminder) return res.status(404).json({ error: "Not found" });
    const enriched = await enrichReminder(reminder);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
