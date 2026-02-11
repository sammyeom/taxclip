import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractReceiptData, extractReceiptDataFromMultipleImages, extractAndVerifyReceiptData } from '@/lib/ocr';
// PDF text extraction temporarily disabled due to pdf-parse v2.x compatibility issues
// import { extractAndParseReceipt } from '@/lib/pdf-text-extract';
import { EvidenceType } from '@/types/evidence';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: NextRequest) {
    console.log('=== Upload API called ===');
    try {
        // 환경 변수 확인
        console.log('Checking env vars...');
        console.log('supabaseUrl:', supabaseUrl ? 'SET' : 'MISSING');
        console.log('supabaseAnonKey:', supabaseAnonKey ? 'SET' : 'MISSING');

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        console.log('Parsing formData...');
        const formData = await request.formData();

        // Support both single file and multiple files
        const files = formData.getAll('files') as File[];
        const singleFile = formData.get('file') as File;

        // Handle both 'file' (legacy) and 'files' (multi-image) form fields
        const filesToProcess = files.length > 0 ? files : (singleFile ? [singleFile] : []);

        if (filesToProcess.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        // 1. 사용자 확인
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Supabase 클라이언트 생성 시 토큰을 헤더에 포함
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: authHeader,
                },
            },
        });

        // 사용자 인증 확인
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('Auth error:', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get evidence types from form data (if provided)
        const evidenceTypesJson = formData.get('evidenceTypes') as string;
        const evidenceTypes: Record<string, EvidenceType> = evidenceTypesJson
            ? JSON.parse(evidenceTypesJson)
            : {};

        // Check if batch mode (process each file as separate receipt)
        const batchMode = formData.get('batchMode') === 'true';
        console.log(`Batch mode: ${batchMode}`);

        // 2. Upload all files to Supabase Storage
        const uploadedUrls: string[] = [];
        const uploadErrors: string[] = [];
        const extractedTexts: Record<string, string> = {};
        const pdfParsedData: Record<string, { vendor?: string; date?: string; total?: number }> = {};
        const documentTypes: string[] = [];
        const timestamp = Date.now();

        console.log(`Processing ${filesToProcess.length} files...`);
        for (let i = 0; i < filesToProcess.length; i++) {
            const file = filesToProcess[i];
            console.log(`File ${i}: ${file.name}, type: ${file.type}, size: ${file.size}`);
            // New naming format: user_id_timestamp_filename
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const fileName = `${user.id}_${timestamp}_${sanitizedFileName}`;
            console.log(`Uploading as: ${fileName}`);

            // Get document type from evidenceTypes or determine from file type
            const evidenceType = evidenceTypes[file.name] ||
                (file.type === 'application/pdf' ? 'invoice' : 'receipt');
            documentTypes.push(evidenceType);
            const fileBuffer = await file.arrayBuffer();

            // Extract text from PDF if it's a text-based PDF
            // NOTE: PDF text extraction temporarily disabled due to pdf-parse v2.x compatibility issues
            // PDFs will still be uploaded and processed via OCR
            if (file.type === 'application/pdf') {
                console.log(`PDF file detected: ${file.name}, skipping text extraction (using OCR instead)`);
                // PDF text extraction disabled - use OCR for PDF content
                // try {
                //     const pdfResult = await extractAndParseReceipt(Buffer.from(fileBuffer));
                //     if (pdfResult.isTextBased && pdfResult.rawText) {
                //         extractedTexts[file.name] = pdfResult.rawText;
                //         pdfParsedData[file.name] = pdfResult.parsed;
                //     }
                // } catch (pdfError) {
                //     console.error(`PDF extraction error for ${file.name}:`, pdfError);
                // }
            }

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(fileName, fileBuffer, {
                    contentType: file.type,
                    upsert: false,
                });

            if (uploadError) {
                console.error(`Upload error for file ${i}:`, uploadError);
                uploadErrors.push(`File ${file.name}: ${uploadError.message}`);
                continue;
            }

            // Get public URL for uploaded file
            const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(fileName);

            console.log(`File uploaded successfully: ${publicUrl}`);
            uploadedUrls.push(publicUrl);
        }

        console.log(`Upload complete. Success: ${uploadedUrls.length}, Errors: ${uploadErrors.length}`);

        // If no files were successfully uploaded, return error
        if (uploadedUrls.length === 0) {
            return NextResponse.json(
                { error: `All uploads failed: ${uploadErrors.join(', ')}` },
                { status: 500 }
            );
        }

        // 3. OCR 실행
        console.log('Starting OCR...');

        // BATCH MODE: Process each file as a separate receipt
        if (batchMode && uploadedUrls.length > 1) {
            console.log(`Batch mode: Processing ${uploadedUrls.length} receipts individually`);
            const batchResults = [];

            for (let i = 0; i < uploadedUrls.length; i++) {
                const url = uploadedUrls[i];
                console.log(`Processing receipt ${i + 1}/${uploadedUrls.length}: ${url}`);

                try {
                    // Use two-pass verification for better accuracy
                    const receiptData = await extractAndVerifyReceiptData(url, true);
                    batchResults.push({
                        imageUrl: url,
                        documentType: documentTypes[i] || 'receipt',
                        data: receiptData,
                        error: null,
                    });
                } catch (ocrError) {
                    console.error(`OCR error for receipt ${i + 1}:`, ocrError);
                    batchResults.push({
                        imageUrl: url,
                        documentType: documentTypes[i] || 'receipt',
                        data: null,
                        error: 'Failed to extract receipt data',
                    });
                }
            }

            return NextResponse.json({
                batchMode: true,
                batchResults: batchResults,
                imageUrls: uploadedUrls,
                uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
            });
        }

        // SINGLE/MULTI-PAGE MODE: Process as one receipt (existing behavior)
        let receiptData;
        try {
            if (uploadedUrls.length === 1) {
                // Single image - use two-pass verification for better accuracy
                receiptData = await extractAndVerifyReceiptData(uploadedUrls[0], true);
            } else {
                // Multiple images - use multi-image OCR for combined context
                receiptData = await extractReceiptDataFromMultipleImages(uploadedUrls);
            }
        } catch (ocrError) {
            console.error('OCR error:', ocrError);
            // OCR 실패해도 업로드는 성공했으므로 이미지 URLs 반환
            const combinedRawTextOnError = Object.values(extractedTexts).join('\n\n---\n\n');
            return NextResponse.json(
                {
                    imageUrl: uploadedUrls[0], // Legacy single URL
                    imageUrls: uploadedUrls,   // New multi-image array
                    fileUrls: uploadedUrls,    // Alias for expenses table
                    documentTypes: documentTypes, // Document types for each file
                    error: 'Failed to extract receipt data',
                    data: null,
                    rawText: combinedRawTextOnError || null,
                    uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
                },
                { status: 200 }
            );
        }

        // Merge PDF parsed data with OCR data if available
        let finalData = receiptData;
        if (Object.keys(pdfParsedData).length > 0 && receiptData) {
            const pdfData = Object.values(pdfParsedData)[0];
            finalData = {
                ...receiptData,
                // Use PDF data if OCR didn't extract or if PDF data seems more reliable
                vendor: receiptData.vendor || pdfData.vendor || '',
                date: receiptData.date || pdfData.date || '',
                amount: receiptData.amount || pdfData.total || 0,
            };
        }

        // Combine all raw text from PDFs
        const combinedRawText = Object.values(extractedTexts).join('\n\n---\n\n');

        return NextResponse.json({
            imageUrl: uploadedUrls[0],   // Legacy single URL (first image)
            imageUrls: uploadedUrls,     // New multi-image array
            fileUrls: uploadedUrls,      // Alias for expenses table
            documentTypes: documentTypes, // Document types for each file
            data: finalData,
            rawText: combinedRawText || null, // Combined PDF raw text for audit
            extractedTexts: Object.keys(extractedTexts).length > 0 ? extractedTexts : undefined,
            pdfParsedData: Object.keys(pdfParsedData).length > 0 ? pdfParsedData : undefined,
            uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
        });

    } catch (error) {
        console.error('=== API Error ===');
        console.error('Error type:', typeof error);
        console.error('Error:', error);
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        );
    }
}
