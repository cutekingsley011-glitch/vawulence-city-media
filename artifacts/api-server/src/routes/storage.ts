import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { uploadToCloudinary } from "../lib/objectStorage";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

/**
 * POST /storage/uploads
 *
 * Accepts a multipart form with a single `file` field.
 * Uploads the file to Cloudinary and returns its public URL.
 *
 * Response: { objectPath: string }
 */
router.post(
  "/storage/uploads",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    try {
      const url = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      res.json({ objectPath: url });
    } catch (error) {
      req.log.error({ err: error }, "Cloudinary upload failed");
      res.status(500).json({ error: "Upload failed. Please try again." });
    }
  },
);

export default router;
