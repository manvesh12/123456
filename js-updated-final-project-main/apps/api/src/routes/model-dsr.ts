import { Router } from "express";
import { ModelDsrStatus, SectionContentType, GeneratedDsrStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { jsonSafe } from "../lib/json.js";

export const modelDsrRouter = Router();

// ==========================================
// TEMPLATE MANAGEMENT
// ==========================================

// Get all Model DSR templates
modelDsrRouter.get("/", async (req, res) => {
  const templates = await prisma.modelDsr.findMany({
    orderBy: { createdAt: "desc" },
    include: { sections: true }
  });
  res.json(jsonSafe(templates));
});

// Create a new Model DSR template
modelDsrRouter.post("/", async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const template = await prisma.modelDsr.create({
      data: {
        title,
        description,
        status: ModelDsrStatus.DRAFT,
        createdBy: req.user!.id
      }
    });

    res.json(jsonSafe(template));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific Model DSR template with sections
modelDsrRouter.get("/:id", async (req, res) => {
  try {
    const template = await prisma.modelDsr.findUnique({
      where: { id: req.params.id },
      include: {
        sections: {
          orderBy: { sequence: 'asc' }
        }
      }
    });

    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    res.json(jsonSafe(template));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Model DSR template sections (only if DRAFT)
modelDsrRouter.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { sections, title, description } = req.body;

    const existing = await prisma.modelDsr.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    if (existing.status === ModelDsrStatus.PUBLISHED) {
      res.status(409).json({ error: "Cannot edit a published template. Create a new version." });
      return;
    }

    // Update basic info
    const updated = await prisma.modelDsr.update({
      where: { id },
      data: {
        title: title || existing.title,
        description: description !== undefined ? description : existing.description,
      }
    });

    // Update sections if provided
    if (sections && Array.isArray(sections)) {
      // Clear existing sections
      await prisma.modelDsrSection.deleteMany({ where: { modelId: id } });
      
      // Create new sections
      for (const [index, section] of sections.entries()) {
        await prisma.modelDsrSection.create({
          data: {
            modelId: id,
            sectionName: section.sectionName || `Section ${index + 1}`,
            sequence: index,
            contentType: section.contentType || SectionContentType.TEXT,
            configuration: section.configuration || {}
          }
        });
      }
    }

    const finalTemplate = await prisma.modelDsr.findUnique({
      where: { id },
      include: { sections: { orderBy: { sequence: 'asc' } } }
    });

    res.json(jsonSafe(finalTemplate));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Publish a Model DSR template
modelDsrRouter.post("/:id/publish", async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.modelDsr.findUnique({
      where: { id },
      include: { sections: true }
    });

    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    if (template.sections.length === 0) {
      res.status(400).json({ error: "Cannot publish template with no sections" });
      return;
    }

    const published = await prisma.modelDsr.update({
      where: { id },
      data: { status: ModelDsrStatus.PUBLISHED }
    });

    res.json(jsonSafe(published));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete/Archive a Model DSR template
modelDsrRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it has generated DSRs
    const generatedCount = await prisma.generatedDsr.count({ where: { modelId: id } });
    
    if (generatedCount > 0) {
      // Soft delete / Archive
      const archived = await prisma.modelDsr.update({
        where: { id },
        data: { status: ModelDsrStatus.ARCHIVED }
      });
      res.json(jsonSafe({ message: "Template archived because it has existing reports", template: archived }));
      return;
    }

    await prisma.modelDsr.delete({ where: { id } });
    res.json(jsonSafe({ message: "Template deleted permanently" }));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// DSR GENERATION & IMPORT
// ==========================================

// Import Model DSR into an Existing Project (Step 4 & 5 auto mapping)
modelDsrRouter.post("/:id/import", async (req, res) => {
  try {
    const { id } = req.params; // Model DSR ID
    const { projectId, config } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const template = await prisma.modelDsr.findUnique({ 
      where: { id },
      include: { sections: true }
    });

    if (!template) {
      return res.status(404).json({ error: "Model DSR not found" });
    }

    const project = await prisma.project.findUnique({
      where: { id: BigInt(projectId) }
    });

    if (!project) {
      return res.status(404).json({ error: "Target Project not found" });
    }

    // Parse current project state
    let state: any = {};
    if (project.projectState) {
      try {
        state = JSON.parse(project.projectState);
      } catch (e) {
        state = {};
      }
    }

    // Step 9: Backup data before overriding
    if (config?.backupCurrent) {
      state.__backup = JSON.parse(JSON.stringify(state)); // deep copy
      // Also clean any previous nested backups to prevent exponential growth
      if (state.__backup.__backup) delete state.__backup.__backup;
    }

    // Step 6: Data Copy Rules
    if (config?.replaceChapters) {
      state.importedChapters = template.sections.filter(s => !s.sectionName.toLowerCase().includes('annexure'));
      state.modelDsrImported = true;
      state.modelDsrId = template.id;
    }

    if (config?.replaceAnnexures) {
      state.importedAnnexures = template.sections.filter(s => s.sectionName.toLowerCase().includes('annexure'));
    }

    // Save updated state
    await prisma.project.update({
      where: { id: BigInt(projectId) },
      data: { projectState: JSON.stringify(state) }
    });

    res.json(jsonSafe({ message: "Import successful", projectId: project.id.toString() }));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Final DSR by merging Payload with Template
modelDsrRouter.post("/generate", async (req, res) => {
  try {
    const { modelId, projectId, dataPayload } = req.body;

    if (!modelId || !dataPayload) {
      res.status(400).json({ error: "modelId and dataPayload are required" });
      return;
    }

    const template = await prisma.modelDsr.findUnique({ where: { id: modelId } });
    if (!template || template.status !== ModelDsrStatus.PUBLISHED) {
      res.status(400).json({ error: "Invalid or unpublished template" });
      return;
    }

    // Step 3 Logic: Template + Uploaded Data = Final DSR
    // For now we simulate generation by storing the payload.
    // In production, this triggers PDF generation via a worker.
    
    const generated = await prisma.generatedDsr.create({
      data: {
        modelId,
        projectId: projectId ? BigInt(projectId) : null,
        status: GeneratedDsrStatus.FINAL,
        dataPayload: dataPayload || {}
      }
    });

    res.json(jsonSafe(generated));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List Generated DSRs
modelDsrRouter.get("/generated/list", async (req, res) => {
  try {
    const dsrs = await prisma.generatedDsr.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        model: { select: { title: true } }
      }
    });
    res.json(jsonSafe(dsrs));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific Generated DSR
modelDsrRouter.get("/generated/:id", async (req, res) => {
  try {
    const dsr = await prisma.generatedDsr.findUnique({
      where: { id: req.params.id },
      include: {
        model: {
          include: { sections: { orderBy: { sequence: 'asc' } } }
        },
        versions: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!dsr) {
      res.status(404).json({ error: "Generated DSR not found" });
      return;
    }

    res.json(jsonSafe(dsr));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
