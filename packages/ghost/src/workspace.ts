import { mkdir, readFile, writeFile, readdir, stat, access } from 'fs/promises'
import { join, resolve, relative } from 'path'
import { homedir } from 'os'
import { randomUUID } from 'crypto'
import type { Workspace } from './types'

const GHOST_ROOT = join(homedir(), '.ghost')

export async function createWorkspace(parentTaskId?: string): Promise<Workspace> {
  const taskId = randomUUID().slice(0, 8)
  const tasksDir = join(GHOST_ROOT, 'tasks')
  const root = parentTaskId
    ? join(tasksDir, parentTaskId, `sub_${taskId}`)
    : join(tasksDir, taskId)

  await mkdir(root, { recursive: true })

  // Seed workspace with empty plan
  const planPath = join(root, 'plan.md')
  try { await access(planPath) } catch {
    await writeFile(planPath, '# Task Plan\n\n', 'utf-8')
  }

  function safePath(p: string): string {
    const resolved = resolve(root, p)
    const rel = relative(root, resolved)
    if (rel.startsWith('..') || resolve(resolved) !== resolved && rel.includes('..')) {
      throw new Error(`Path traversal blocked: ${p}`)
    }
    return resolved
  }

  const ws: Workspace = {
    taskId,
    root,

    async readFile(path: string): Promise<string> {
      return readFile(safePath(path), 'utf-8')
    },

    async writeFile(path: string, content: string): Promise<void> {
      const full = safePath(path)
      await mkdir(join(full, '..'), { recursive: true })
      await writeFile(full, content, 'utf-8')
    },

    async editFile(path: string, oldText: string, newText: string): Promise<void> {
      const full = safePath(path)
      const content = await readFile(full, 'utf-8')
      if (!content.includes(oldText)) {
        throw new Error(`Text not found in ${path}`)
      }
      await writeFile(full, content.replace(oldText, newText), 'utf-8')
    },

    async appendFile(path: string, content: string): Promise<void> {
      const full = safePath(path)
      try {
        const existing = await readFile(full, 'utf-8')
        await writeFile(full, existing + content, 'utf-8')
      } catch {
        await mkdir(join(full, '..'), { recursive: true })
        await writeFile(full, content, 'utf-8')
      }
    },

    async listFiles(dir = '.'): Promise<string[]> {
      const full = safePath(dir)
      try {
        const entries = await readdir(full, { withFileTypes: true })
        const files: string[] = []
        for (const entry of entries) {
          const rel = join(dir, entry.name)
          if (entry.isDirectory()) {
            files.push(rel + '/')
            const sub = await ws.listFiles(rel)
            files.push(...sub)
          } else {
            files.push(rel)
          }
        }
        return files
      } catch {
        return []
      }
    },

    async exists(path: string): Promise<boolean> {
      try {
        await access(safePath(path))
        return true
      } catch {
        return false
      }
    },
  }

  return ws
}
