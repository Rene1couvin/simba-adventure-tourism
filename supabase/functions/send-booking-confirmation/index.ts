import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BookingConfirmationRequest {
  email?: string;
  customerName?: string;
  tourTitle: string;
  tourLocation?: string;
  bookingDate: string;
  numberOfPeople: number;
  totalPrice: number;
  status?: string;
  bookingId?: string;
}

function createSmtpTransport() {
  const host = Deno.env.get("SMTP_HOST")!;
  const port = parseInt(Deno.env.get("SMTP_PORT") || "465");
  const user = Deno.env.get("SMTP_USER")!;
  const pass = Deno.env.get("SMTP_PASS")!;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: BookingConfirmationRequest = await req.json();
    const {
      email,
      customerName,
      tourTitle,
      tourLocation,
      bookingDate,
      numberOfPeople,
      totalPrice,
      status,
    } = body;

    if (!email) {
      console.log("No email provided, skipping notification");
      return new Response(JSON.stringify({ message: "No email to send" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending booking ${status || 'confirmation'} to ${email}`);

    const getStatusInfo = (status?: string) => {
      switch (status) {
        case 'confirmed':
          return { title: '🎉 Booking Confirmed!', color: '#10b981', message: 'Your safari adventure has been confirmed.' };
        case 'cancelled':
          return { title: '❌ Booking Cancelled', color: '#ef4444', message: 'Your booking has been cancelled.' };
        case 'completed':
          return { title: '✅ Trip Completed', color: '#3b82f6', message: 'Thank you for traveling with us!' };
        default:
          return { title: '🎉 Booking Confirmed!', color: '#10b981', message: 'Your safari adventure has been confirmed.' };
      }
    };

    const statusInfo = getStatusInfo(status);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${statusInfo.color}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .detail-row { margin: 15px 0; padding: 10px; background: white; border-radius: 4px; }
            .label { font-weight: bold; color: #6b7280; }
            .value { color: #111827; }
            .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusInfo.title}</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName || 'Valued Customer'},</p>
              <p>${statusInfo.message}</p>
              
              <div class="detail-row">
                <span class="label">Tour:</span>
                <span class="value">${tourTitle}</span>
              </div>
              
              ${tourLocation ? `
              <div class="detail-row">
                <span class="label">Location:</span>
                <span class="value">${tourLocation}</span>
              </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">${new Date(bookingDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Number of People:</span>
                <span class="value">${numberOfPeople}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Total Price:</span>
                <span class="value">$${totalPrice}</span>
              </div>
              
              <p style="margin-top: 20px;">If you have any questions, please don't hesitate to reach out to us.</p>
              
              <div class="footer">
                <p><strong>Simba Adventure Tours</strong></p>
                <p>Your Gateway to African Adventures</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const transporter = createSmtpTransport();
    const from = Deno.env.get("SMTP_FROM") || Deno.env.get("SMTP_USER")!;
    const subject = `${status === 'cancelled' ? 'Booking Cancelled' : status === 'completed' ? 'Trip Completed' : 'Booking Confirmed'}: ${tourTitle}`;

    const info = await transporter.sendMail({ from, to: email, subject, html: emailHtml });
    console.log("Email sent successfully:", info.messageId);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-booking-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
