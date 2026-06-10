import { readFileSync } from 'fs'

export function pdfToBase64(filePath: string): string {
  try {
    return readFileSync(filePath).toString('base64')
  } catch (error) {
    console.error(`Error leyendo archivo ${filePath}:`, error)
    return ''
  }
}

export function prepareDocumentsForClaude(filePaths: string[]): Array<{
  nombre: string
  base64: string
  mediaType: string
}> {
  const docs: Array<{ nombre: string; base64: string; mediaType: string }> = []
  for (const filePath of filePaths) {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      const base64 = pdfToBase64(filePath)
      if (base64) {
        docs.push({
          nombre: filePath.split('/').pop() ?? 'documento.pdf',
          base64,
          mediaType: 'application/pdf',
        })
      }
    }
  }
  return docs
}
