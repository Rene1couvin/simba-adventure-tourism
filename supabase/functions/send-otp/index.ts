import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hash OTP using SHA-256
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("No authorization header");
  return authHeader.replace("Bearer ", "");
}

function createSupabaseClients() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
  return { serviceClient, anonClient };
}

function createSmtpTransport() {
  const host = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
  const port = parseInt(Deno.env.get("SMTP_PORT") || "587");
  const user = Deno.env.get("SMTP_USER")!;
  const pass = Deno.env.get("SMTP_PASS")!;

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  const transporter = createSmtpTransport();
  const from = Deno.env.get("SMTP_FROM") || Deno.env.get("SMTP_USER")!;

  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("SMTP send error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

async function handleSend(supabase: ReturnType<typeof createClient>, user: { id: string; email?: string }) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await hashOTP(otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await supabase.from("otp_codes").delete().eq("user_id", user.id);

  const { error: insertError } = await supabase.from("otp_codes").insert({
    user_id: user.id,
    code_hash: otpHash,
    expires_at: expiresAt.toISOString(),
    attempts: 0,
    verified: false,
  });

  if (insertError) {
    console.error("Insert error:", insertError);
    throw new Error("Failed to create OTP");
  }

  console.log(`Sending OTP to ${user.email}`);

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 500px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7a4419, #b8860b); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; text-align: center; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #7a4419; background: white; padding: 16px 24px; border-radius: 8px; display: inline-block; margin: 20px 0; border: 2px dashed #b8860b; }
          .warning { color: #ef4444; font-size: 14px; margin-top: 16px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Verification Code</h1>
            <p>Simba Adventure & Tourism</p>
          </div>
          <div class="content">
            <p>Hello! Here is your verification code:</p>
            <div class="otp-code">${otp}</div>
            <p>Enter this code to verify your identity.</p>
            <p class="warning">⏰ This code expires in 5 minutes.</p>
            <p class="warning">Do not share this code with anyone.</p>
          </div>
          <div class="footer">
            <p>Simba Adventure & Tourism</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(user.email!, "Your Verification Code - Simba Adventure", emailHtml);

  console.log("OTP sent successfully");
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function handleVerify(supabase: ReturnType<typeof createClient>, user: { id: string }, code: string) {
  const { data: otpData, error: otpError } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("user_id", user.id)
    .eq("verified", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (otpError || !otpData) {
    return new Response(
      JSON.stringify({ success: false, error: "No OTP found. Please request a new one." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (otpData.attempts >= 5) {
    await supabase.from("otp_codes").delete().eq("id", otpData.id);
    return new Response(
      JSON.stringify({ success: false, error: "Too many attempts. Please request a new code." }),
      { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (new Date(otpData.expires_at) < new Date()) {
    await supabase.from("otp_codes").delete().eq("id", otpData.id);
    return new Response(
      JSON.stringify({ success: false, error: "Code expired. Please request a new one." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const inputHash = await hashOTP(code);
  if (otpData.code_hash !== inputHash) {
    await supabase
      .from("otp_codes")
      .update({ attempts: otpData.attempts + 1 })
      .eq("id", otpData.id);

    return new Response(
      JSON.stringify({ success: false, error: `Invalid code. ${4 - otpData.attempts} attempts remaining.` }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  await supabase.from("otp_codes").delete().eq("id", otpData.id);
  await supabase.rpc("cleanup_expired_otps");

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = getAuthenticatedUser(req);
    const { serviceClient, anonClient } = createSupabaseClients();

    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { action, code } = await req.json();

    if (action === "send") {
      return await handleSend(serviceClient, user);
    }

    if (action === "verify") {
      return await handleVerify(serviceClient, user, code);
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
