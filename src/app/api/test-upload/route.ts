import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: NextRequest) {
    console.log('=== Test Upload API called ===');

    try {
        // Step 1: Check env vars
        console.log('Step 1: Checking env vars...');
        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Missing Supabase env vars', step: 1 }, { status: 500 });
        }
        console.log('Step 1: OK');

        // Step 2: Parse form data
        console.log('Step 2: Parsing form data...');
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: 'No file provided', step: 2 }, { status: 400 });
        }
        console.log(`Step 2: OK - File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

        // Step 3: Check auth
        console.log('Step 3: Checking auth...');
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'No auth header', step: 3 }, { status: 401 });
        }
        console.log('Step 3: OK');

        // Step 4: Create Supabase client
        console.log('Step 4: Creating Supabase client...');
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });
        console.log('Step 4: OK');

        // Step 5: Get user
        console.log('Step 5: Getting user...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error('Auth error:', authError);
            return NextResponse.json({ error: 'Auth failed', authError, step: 5 }, { status: 401 });
        }
        console.log(`Step 5: OK - User: ${user.id}`);

        // Step 6: Read file buffer
        console.log('Step 6: Reading file buffer...');
        const fileBuffer = await file.arrayBuffer();
        console.log(`Step 6: OK - Buffer size: ${fileBuffer.byteLength}`);

        // Step 7: Upload to storage
        console.log('Step 7: Uploading to storage...');
        const fileName = `${user.id}_${Date.now()}_test.pdf`;
        const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(fileName, fileBuffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return NextResponse.json({ error: 'Upload failed', uploadError, step: 7 }, { status: 500 });
        }
        console.log('Step 7: OK');

        // Step 8: Get public URL
        console.log('Step 8: Getting public URL...');
        const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(fileName);
        console.log(`Step 8: OK - URL: ${publicUrl}`);

        return NextResponse.json({
            success: true,
            message: 'Upload test completed successfully',
            fileName,
            publicUrl,
        });

    } catch (error) {
        console.error('=== Test Upload Error ===');
        console.error(error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        }, { status: 500 });
    }
}
