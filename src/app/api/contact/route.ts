import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Send notification email to admin
    await resend.emails.send({
      from: 'TaxClip Contact <onboarding@resend.dev>',
      to: process.env.CONTACT_EMAIL || 'support@taxclip.co',
      subject: `[TaxClip Contact] ${subject} - from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <h3>Message:</h3>
        <p>${message.replace(/\n/g, '<br />')}</p>
        <hr />
        <p style="color: #666; font-size: 12px;">
          Reply directly to this email to respond to ${name} at ${email}
        </p>
      `,
      replyTo: email,
    });

    // Send confirmation email to the user
    await resend.emails.send({
      from: 'TaxClip <onboarding@resend.dev>',
      to: email,
      subject: 'We received your message - TaxClip',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px;">
            <h1 style="color: #0891b2;">TaxClip</h1>
          </div>
          <div style="padding: 20px; background: #f8fafc; border-radius: 8px;">
            <h2 style="color: #1e293b;">Hi ${name},</h2>
            <p style="color: #475569; line-height: 1.6;">
              Thank you for reaching out to TaxClip! We've received your message and will get back to you within 24 hours.
            </p>
            <div style="background: white; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0891b2;">
              <p style="color: #64748b; margin: 0 0 8px 0;"><strong>Your message:</strong></p>
              <p style="color: #475569; margin: 0;">${message.replace(/\n/g, '<br />')}</p>
            </div>
            <p style="color: #475569; line-height: 1.6;">
              In the meantime, feel free to explore our <a href="https://taxclip.co" style="color: #0891b2;">website</a> or check out our features.
            </p>
            <p style="color: #475569;">
              Best regards,<br />
              The TaxClip Team
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
            <p>&copy; 2026 TaxClip. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
