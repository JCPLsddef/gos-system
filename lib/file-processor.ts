import 'server-only';

export type FileProcessingResult = {
  success: boolean;
  extractedText?: string;
  error?: string;
  fileType: 'image' | 'pdf' | 'text' | 'unknown';
};

export type SupportedMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/jpg'
  | 'application/pdf'
  | 'text/plain';

const SUPPORTED_MIME_TYPES: SupportedMimeType[] = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function isValidFileType(mimeType: string): mimeType is SupportedMimeType {
  return SUPPORTED_MIME_TYPES.includes(mimeType as SupportedMimeType);
}

export function isValidFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

export function getFileCategory(mimeType: string): 'image' | 'pdf' | 'text' | 'unknown' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'text/plain') return 'text';
  return 'unknown';
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');

    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;

    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textParts.push(pageText);
    }

    return textParts.join('\n\n').trim();
  } catch (error: any) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

export async function extractTextFromTextFile(buffer: Buffer): Promise<string> {
  return buffer.toString('utf-8').trim();
}

export async function analyzeImageWithGroq(
  base64Image: string,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.2-90b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and extract ALL text content you can see. If this is a to-do list, task list, calendar, schedule, or any document with actionable items, list each item clearly. For handwritten content, do your best to transcribe it. Be thorough and include everything visible.

Format your response as:
1. A brief description of what the image shows
2. ALL extracted text/items (numbered if it's a list)
3. Any dates, times, or deadlines you can identify`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Unable to analyze image';
}

export async function analyzeImageWithOpenAI(
  base64Image: string,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and extract ALL text content you can see. If this is a to-do list, task list, calendar, schedule, or any document with actionable items, list each item clearly. For handwritten content, do your best to transcribe it. Be thorough and include everything visible.

Format your response as:
1. A brief description of what the image shows
2. ALL extracted text/items (numbered if it's a list)
3. Any dates, times, or deadlines you can identify`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Unable to analyze image';
}

export async function analyzeImage(
  base64Image: string,
  mimeType: string
): Promise<string> {
  try {
    return await analyzeImageWithGroq(base64Image, mimeType);
  } catch (groqError: any) {
    console.warn('Groq vision failed, falling back to OpenAI:', groqError.message);

    try {
      return await analyzeImageWithOpenAI(base64Image, mimeType);
    } catch (openaiError: any) {
      throw new Error(`Image analysis failed: Groq: ${groqError.message}, OpenAI: ${openaiError.message}`);
    }
  }
}

export async function processFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<FileProcessingResult> {
  const fileCategory = getFileCategory(mimeType);

  try {
    let extractedText: string;

    switch (fileCategory) {
      case 'pdf':
        extractedText = await extractTextFromPdf(buffer);
        break;

      case 'text':
        extractedText = await extractTextFromTextFile(buffer);
        break;

      case 'image':
        const base64 = buffer.toString('base64');
        extractedText = await analyzeImage(base64, mimeType);
        break;

      default:
        return {
          success: false,
          error: `Unsupported file type: ${mimeType}`,
          fileType: 'unknown',
        };
    }

    return {
      success: true,
      extractedText,
      fileType: fileCategory,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      fileType: fileCategory,
    };
  }
}
