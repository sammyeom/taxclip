/**
 * EML File Parser
 * Parses .eml files (MIME format) and extracts email content
 */

import { ParsedEmailData } from '@/types/evidence';
import { parseEmailText } from './email-parser';

interface EmlData {
  from: string | null;
  to: string | null;
  subject: string | null;
  date: string | null;
  body: string;
  html: string | null;
  attachments: EmlAttachment[];
}

export interface EmlAttachment {
  filename: string;
  contentType: string;
  content: string; // base64 encoded
}

/**
 * Parse an EML file and extract email data
 */
export async function parseEmlFile(file: File): Promise<{
  emlData: EmlData;
  parsedData: ParsedEmailData;
}> {
  const content = await file.text();
  const emlData = parseEmlContent(content);

  // Use the body (prefer HTML if available for better extraction)
  const textToParse = emlData.html || emlData.body;

  // Add subject and from to help extraction
  let enrichedText = textToParse;
  if (emlData.subject) {
    enrichedText = `Subject: ${emlData.subject}\n${enrichedText}`;
  }
  if (emlData.from) {
    enrichedText = `From: ${emlData.from}\n${enrichedText}`;
  }
  if (emlData.date) {
    enrichedText = `Date: ${emlData.date}\n${enrichedText}`;
  }

  const parsedData = parseEmailText(enrichedText);

  // Override with header data if not extracted from body
  if (!parsedData.date && emlData.date) {
    parsedData.date = normalizeEmlDate(emlData.date);
  }
  if (!parsedData.vendor && emlData.from) {
    parsedData.vendor = extractVendorFromEmail(emlData.from) ?? undefined;
  }

  return { emlData, parsedData };
}

/**
 * Parse EML content string into structured data
 */
function parseEmlContent(content: string): EmlData {
  const result: EmlData = {
    from: null,
    to: null,
    subject: null,
    date: null,
    body: '',
    html: null,
    attachments: [],
  };

  // Split headers and body
  const headerBodySplit = content.indexOf('\r\n\r\n');
  const headerBodySplitUnix = content.indexOf('\n\n');

  let splitIndex = -1;
  let lineEnding = '\r\n';

  if (headerBodySplit !== -1 && (headerBodySplitUnix === -1 || headerBodySplit < headerBodySplitUnix)) {
    splitIndex = headerBodySplit;
    lineEnding = '\r\n';
  } else if (headerBodySplitUnix !== -1) {
    splitIndex = headerBodySplitUnix;
    lineEnding = '\n';
  }

  if (splitIndex === -1) {
    result.body = content;
    return result;
  }

  const headerSection = content.substring(0, splitIndex);
  const bodySection = content.substring(splitIndex + (lineEnding === '\r\n' ? 4 : 2));

  // Parse headers (handle folded headers)
  const unfoldedHeaders = headerSection.replace(/\r?\n[ \t]+/g, ' ');
  const headerLines = unfoldedHeaders.split(/\r?\n/);
  const headers: Record<string, string> = {};

  for (const line of headerLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const name = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();
      headers[name] = value;
    }
  }

  result.from = decodeHeaderValue(headers['from'] || null);
  result.to = decodeHeaderValue(headers['to'] || null);
  result.subject = decodeHeaderValue(headers['subject'] || null);
  result.date = headers['date'] || null;

  // Check for multipart content
  const contentType = headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=["']?([^"';\s]+)["']?/i);

  if (boundaryMatch) {
    // Multipart message
    const boundary = boundaryMatch[1];
    const parts = parseMultipart(bodySection, boundary);

    for (const part of parts) {
      const partContentType = (part.headers['content-type'] || '').toLowerCase();
      const disposition = part.headers['content-disposition'] || '';

      if (disposition.includes('attachment')) {
        // Attachment
        const filenameMatch = disposition.match(/filename=["']?([^"';\n]+)["']?/i);
        result.attachments.push({
          filename: filenameMatch ? decodeHeaderValue(filenameMatch[1]) || 'attachment' : 'attachment',
          contentType: partContentType,
          content: part.body,
        });
      } else if (partContentType.includes('text/html')) {
        result.html = decodeBody(part.body, part.headers['content-transfer-encoding']);
      } else if (partContentType.includes('text/plain') || !partContentType) {
        if (!result.body) {
          result.body = decodeBody(part.body, part.headers['content-transfer-encoding']);
        }
      }
    }
  } else {
    // Single part message
    const transferEncoding = headers['content-transfer-encoding'];
    if (contentType.includes('text/html')) {
      result.html = decodeBody(bodySection, transferEncoding);
      result.body = result.html;
    } else {
      result.body = decodeBody(bodySection, transferEncoding);
    }
  }

  return result;
}

/**
 * Parse multipart MIME content
 */
function parseMultipart(body: string, boundary: string): Array<{ headers: Record<string, string>; body: string }> {
  const parts: Array<{ headers: Record<string, string>; body: string }> = [];
  const delimiter = `--${boundary}`;
  const endDelimiter = `--${boundary}--`;

  // Split by boundary
  const sections = body.split(delimiter);

  for (let i = 1; i < sections.length; i++) {
    let section = sections[i];

    // Skip end boundary
    if (section.trim().startsWith('--') || section.trim() === '') continue;

    // Remove leading/trailing whitespace and end delimiter
    section = section.replace(new RegExp(`^[\\r\\n]+`), '');
    if (section.includes(endDelimiter)) {
      section = section.substring(0, section.indexOf(endDelimiter));
    }

    // Split part headers and body
    const partSplit = section.indexOf('\r\n\r\n');
    const partSplitUnix = section.indexOf('\n\n');

    let partSplitIndex = -1;
    if (partSplit !== -1 && (partSplitUnix === -1 || partSplit < partSplitUnix)) {
      partSplitIndex = partSplit;
    } else if (partSplitUnix !== -1) {
      partSplitIndex = partSplitUnix;
    }

    if (partSplitIndex === -1) continue;

    const partHeaderSection = section.substring(0, partSplitIndex);
    const partBody = section.substring(partSplitIndex).replace(/^[\r\n]+/, '').replace(/[\r\n]+$/, '');

    // Parse part headers
    const partHeaders: Record<string, string> = {};
    const unfoldedPartHeaders = partHeaderSection.replace(/\r?\n[ \t]+/g, ' ');
    const partHeaderLines = unfoldedPartHeaders.split(/\r?\n/);

    for (const line of partHeaderLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const name = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        partHeaders[name] = value;
      }
    }

    // Check if this part is also multipart (nested)
    const nestedContentType = partHeaders['content-type'] || '';
    const nestedBoundaryMatch = nestedContentType.match(/boundary=["']?([^"';\s]+)["']?/i);

    if (nestedBoundaryMatch) {
      // Recursively parse nested multipart
      const nestedParts = parseMultipart(partBody, nestedBoundaryMatch[1]);
      parts.push(...nestedParts);
    } else {
      parts.push({ headers: partHeaders, body: partBody });
    }
  }

  return parts;
}

/**
 * Decode body based on transfer encoding
 */
function decodeBody(body: string, encoding?: string | null): string {
  if (!encoding) return body;

  const enc = encoding.toLowerCase();

  if (enc === 'base64') {
    try {
      // Handle line breaks in base64
      const cleanBase64 = body.replace(/[\r\n\s]/g, '');
      return decodeBase64(cleanBase64);
    } catch {
      return body;
    }
  }

  if (enc === 'quoted-printable') {
    return decodeQuotedPrintable(body);
  }

  return body;
}

/**
 * Decode base64 string
 */
function decodeBase64(str: string): string {
  try {
    // Browser environment
    if (typeof atob !== 'undefined') {
      // Handle UTF-8 encoding
      const binaryStr = atob(str);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    }
    // Node environment
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch {
    return str;
  }
}

/**
 * Decode quoted-printable encoding
 */
function decodeQuotedPrintable(str: string): string {
  return str
    // Handle soft line breaks
    .replace(/=\r?\n/g, '')
    // Decode hex sequences
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
}

/**
 * Decode MIME header value (handles encoded-word syntax)
 */
function decodeHeaderValue(value: string | null): string | null {
  if (!value) return null;

  // Handle encoded-word syntax: =?charset?encoding?encoded_text?=
  return value.replace(
    /=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g,
    (_, _charset, encoding, text) => {
      try {
        if (encoding.toUpperCase() === 'B') {
          // Base64
          return decodeBase64(text);
        } else if (encoding.toUpperCase() === 'Q') {
          // Quoted-printable (with _ for space)
          return decodeQuotedPrintable(text.replace(/_/g, ' '));
        }
      } catch {
        // Return original if decoding fails
      }
      return text;
    }
  );
}

/**
 * Extract vendor name from email address
 */
function extractVendorFromEmail(from: string): string | null {
  // Try to get display name first
  const displayNameMatch = from.match(/^"?([^"<]+)"?\s*</);
  if (displayNameMatch) {
    const name = displayNameMatch[1].trim();
    if (name && name.length > 1) {
      return cleanVendorName(name);
    }
  }

  // Extract domain from email
  const emailMatch = from.match(/@([^>.\s]+)/);
  if (emailMatch) {
    const domain = emailMatch[1];
    // Capitalize first letter
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  return null;
}

/**
 * Clean vendor name
 */
function cleanVendorName(name: string): string {
  return name
    .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?|noreply|no-reply)$/i, '')
    .replace(/^(noreply|no-reply|orders?|support|info)@?/i, '')
    .trim();
}

/**
 * Normalize date from EML header
 */
function normalizeEmlDate(dateStr: string): string | undefined {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Return undefined if parsing fails
  }
  return undefined;
}

/**
 * Check if a file is an EML file
 */
export function isEmlFile(file: File): boolean {
  return (
    file.type === 'message/rfc822' ||
    file.name.toLowerCase().endsWith('.eml')
  );
}

/**
 * Get image attachments from EML file
 */
export function getImageAttachments(emlData: EmlData): EmlAttachment[] {
  return emlData.attachments.filter(
    (att) => att.contentType.startsWith('image/')
  );
}

/**
 * Get PDF attachments from EML file
 */
export function getPdfAttachments(emlData: EmlData): EmlAttachment[] {
  return emlData.attachments.filter(
    (att) => att.contentType === 'application/pdf'
  );
}

/**
 * Convert base64 attachment to File object
 */
export function attachmentToFile(attachment: EmlAttachment): File {
  const byteCharacters = atob(attachment.content);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: attachment.contentType });
  return new File([blob], attachment.filename, { type: attachment.contentType });
}
