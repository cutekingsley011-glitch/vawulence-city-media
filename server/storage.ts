import fs from 'fs';
import path from 'path';

const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {}

// In-memory media fallback for serverless environments where disk write may be read-only
const memoryFiles = new Map<string, { buffer: Buffer; contentType: string }>();

export function mediaToken(filePath: string): string {
  return Buffer.from(filePath, 'utf8').toString('base64url');
}

export function mediaPath(token: string): string {
  try {
    return Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

export const storage = {
  async write(files: Array<{ path: string; content: string; contentType?: string }>): Promise<boolean[]> {
    const results: boolean[] = [];
    for (const file of files) {
      try {
        const fullPath = path.resolve(uploadsDir, file.path.replace(/^vcm\//, ''));
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const buffer = Buffer.from(file.content, 'base64');
        fs.writeFileSync(fullPath, buffer);
        memoryFiles.set(file.path, {
          buffer,
          contentType: file.contentType || 'application/octet-stream',
        });
        results.push(true);
      } catch (err) {
        try {
          const buffer = Buffer.from(file.content, 'base64');
          memoryFiles.set(file.path, {
            buffer,
            contentType: file.contentType || 'application/octet-stream',
          });
          results.push(true);
        } catch {
          results.push(false);
        }
      }
    }
    return results;
  },

  async read(paths: string[]): Promise<Array<{ path: string; content: string | null }>> {
    return paths.map((p) => {
      try {
        if (memoryFiles.has(p)) {
          return { path: p, content: memoryFiles.get(p)!.buffer.toString('base64') };
        }
        const fullPath = path.resolve(uploadsDir, p.replace(/^vcm\//, ''));
        if (fs.existsSync(fullPath)) {
          return { path: p, content: fs.readFileSync(fullPath).toString('base64') };
        }
        return { path: p, content: null };
      } catch {
        return { path: p, content: null };
      }
    });
  },

  async delete(paths: string[]): Promise<boolean[]> {
    return paths.map((p) => {
      memoryFiles.delete(p);
      try {
        const fullPath = path.resolve(uploadsDir, p.replace(/^vcm\//, ''));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        return true;
      } catch {
        return true;
      }
    });
  },

  async url(paths: string[]): Promise<Array<{ path: string; url: string }>> {
    return paths.map((p) => ({
      path: p,
      url: `/api/media/${mediaToken(p)}`,
    }));
  },

  getFile(p: string): { buffer: Buffer; contentType: string } | null {
    if (memoryFiles.has(p)) {
      return memoryFiles.get(p)!;
    }
    try {
      const fullPath = path.resolve(uploadsDir, p.replace(/^vcm\//, ''));
      if (fs.existsSync(fullPath)) {
        const ext = path.extname(fullPath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
        };
        return {
          buffer: fs.readFileSync(fullPath),
          contentType: mimeTypes[ext] || 'application/octet-stream',
        };
      }
    } catch {}
    return null;
  },
};
