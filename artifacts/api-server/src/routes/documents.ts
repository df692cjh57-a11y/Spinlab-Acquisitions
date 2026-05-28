import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListDocumentsQueryParams,
  UpdateDocumentBody,
} from "@workspace/api-zod";

const router = Router();

function formatDoc(d: typeof documentsTable.$inferSelect) {
  return {
    ...d,
    updatedAt: d.updatedAt.toISOString(),
  };
}

// GET /documents
router.get("/documents", async (req, res) => {
  try {
    const params = ListDocumentsQueryParams.parse(req.query);
    const docs = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.dealId, Number(params.dealId)));
    res.json(docs.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /documents/:id
router.patch("/documents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdateDocumentBody.parse(req.body);
    const [doc] = await db
      .update(documentsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(documentsTable.id, id))
      .returning();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(formatDoc(doc));
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
