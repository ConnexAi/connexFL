import { readFileSync } from 'fs'
import { PDFParse } from 'pdf-parse'

export function pdfToBase64(filePath: string): string {
  try {
    return readFileSync(filePath).toString('base64')
  } catch (error) {
    console.error(`Error leyendo archivo ${filePath}:`, error)
    return ''
  }
}

async function extractPdfText(filePath: string): Promise<string> {
  try {
    const buffer = readFileSync(filePath)
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    return result.text
  } catch (error) {
    console.error(`Error extrayendo texto de PDF ${filePath}:`, error)
    return ''
  }
}

export async function prepareDocumentsForClaude(filePaths: string[]): Promise<Array<{
  nombre: string
  base64: string
  mediaType: string
  textoExtraido?: string
}>> {
  const docs: Array<{ nombre: string; base64: string; mediaType: string; textoExtraido?: string }> = []
  for (const filePath of filePaths) {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      const base64 = pdfToBase64(filePath)
      if (base64) {
        const textoExtraido = await extractPdfText(filePath)
        docs.push({
          nombre: filePath.split('/').pop() ?? 'documento.pdf',
          base64,
          mediaType: 'application/pdf',
          ...(textoExtraido ? { textoExtraido } : {}),
        })
      }
    }
  }
  return docs
}
