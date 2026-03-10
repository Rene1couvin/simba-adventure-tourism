import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import nodemailer from "npm:nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function createSmtpTransport() {
  const host = Deno.env.get("SMTP_HOST")!;
  const port = parseInt(Deno.env.get("SMTP_PORT") || "587");
  const user = Deno.env.get("SMTP_USER")!;
  const pass = Deno.env.get("SMTP_PASS")!;
  const secureEnv = Deno.env.get("SMTP_SECURE") || "auto";
  const secure = secureEnv === "auto" ? port === 465 : secureEnv === "true";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();
    const { bookingId, status } = body;

    if (!bookingId) {
      return new Response(JSON.stringify({ error: "bookingId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Use service role to look up booking details server-side
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if caller is admin or booking owner
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, tours(title, location)")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Only allow admin or booking owner
    if (!isAdmin && booking.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get booking user's profile and email
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", booking.user_id)
      .single();

    const { data: bookingUser } = await supabase.auth.admin.getUserById(booking.user_id);
    const email = bookingUser?.user?.email;

    if (!email) {
      return new Response(JSON.stringify({ message: "No email to send" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const customerName = profile?.full_name || "Valued Customer";
    const tourTitle = booking.tours?.title || "Tour";
    const tourLocation = booking.tours?.location || "";
    const bookingStatus = status || booking.status || "confirmed";

    const getStatusInfo = (s: string) => {
      switch (s) {
        case "confirmed":
          return { title: "🎉 Booking Confirmed!", color: "#10b981", message: "Your safari adventure has been confirmed." };
        case "cancelled":
          return { title: "❌ Booking Cancelled", color: "#ef4444", message: "Your booking has been cancelled." };
        case "completed":
          return { title: "✅ Trip Completed", color: "#3b82f6", message: "Thank you for traveling with us!" };
        default:
          return { title: "🎉 Booking Confirmed!", color: "#10b981", message: "Your safari adventure has been confirmed." };
      }
    };

    const statusInfo = getStatusInfo(bookingStatus);

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
            <div class="header"><h1>${statusInfo.title}</h1></div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>${statusInfo.message}</p>
              <div class="detail-row"><span class="label">Tour:</span> <span class="value">${tourTitle}</span></div>
              ${tourLocation ? `<div class="detail-row"><span class="label">Location:</span> <span class="value">${tourLocation}</span></div>` : ""}
              <div class="detail-row"><span class="label">Date:</span> <span class="value">${new Date(booking.booking_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span></div>
              <div class="detail-row"><span class="label">People:</span> <span class="value">${booking.number_of_people}</span></div>
              <div class="detail-row"><span class="label">Total Price:</span> <span class="value">$${booking.total_price}</span></div>
              <div class="footer"><p><strong>Simba Adventure Tours</strong></p><p>Your Gateway to African Adventures</p></div>
            </div>
          </div>
        </body>
      </html>
    `;

    const transporter = createSmtpTransport();
    const from = Deno.env.get("SMTP_FROM") || Deno.env.get("SMTP_USER")!;
    const subject = `${bookingStatus === "cancelled" ? "Booking Cancelled" : bookingStatus === "completed" ? "Trip Completed" : "Booking Confirmed"}: ${tourTitle}`;

    const info = await transporter.sendMail({ from, to: email, subject, html: emailHtml });
    console.log("Email sent:", info.messageId);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
