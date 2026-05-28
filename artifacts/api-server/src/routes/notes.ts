import { Router } from "express";
import { db } from "@workspace/db";
import { notesTable, dealsTable, brokersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  ListNotesQueryParams,
  CreateNoteBody,
  UpdateNoteBody,
} from "@workspace/api-zod";

const router = Router();

async function enrichNote(n: typeof notesTable.$inferSelect) {
  let linkedName: string | null = null;
  if (n.linkedType === "deal") {
    const [deal] = await db
      .select({ dealName: dealsTable.dealName })
      .from(dealsTable)
      .where(eq(dealsTable.id, n.linkedId));
    linkedName = deal?.dealName ?? null;
  } else if (n.linkedType === "broker") {
    const [broker] = await db
      .select({ name: brokersTable.name })
      .from(brokersTable)
      .where(eq(brokersTable.id, n.linkedId));
    linkedName = broker?.name ?? null;
  }
  return {
    ...n,
    linkedName,
    createdAt: n.createdAt.toISOString(),
  };
}

// GET /notes
router.get("/notes", async (req, res) => {
  try {
    const params = ListNotesQueryParams.parse(req.query);
    let query = db.select().from(notesTable);
    let notes = await db.select().from(notesTable).orderBy(desc(notesTable.createdAt));

    if (params.linkedType) {
      notes = notes.filter((n) => n.linkedType === params.linkedType);
    }
    if (params.linkedId) {
      notes = notes.filter((n) => n.linkedId === Number(params.linkedId));
    }

    const enriched = await Promise.all(notes.map(enrichNote));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /notes
router.post("/notes", async (req, res) => {
  try {
    const body = CreateNoteBody.parse(req.body);
    const [note] = await db.insert(notesTable).values(body).returning();
    const enriched = await enrichNote(note);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// PATCH /notes/:id
router.patch("/notes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdateNoteBody.parse(req.body);
    const [note] = await db
      .update(notesTable)
      .set(body)
      .where(eq(notesTable.id, id))
      .returning();
    if (!note) res.status(404).json({ error: "Not found" }); return;
    const enriched = await enrichNote(note);
    res.json(enriched);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// DELETE /notes/:id
router.delete("/notes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(notesTable).where(eq(notesTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
