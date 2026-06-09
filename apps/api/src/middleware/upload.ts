import { mkdirSync } from 'fs'
import { join } from 'path'

export const UPLOAD_DIR = process.env.STORAGE_PATH ?? join(process.cwd(), 'uploads')

// Crear directorio si no existe
mkdirSync(UPLOAD_DIR, { recursive: true })
