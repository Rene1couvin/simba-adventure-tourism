import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { action } = await req.json();

    if (action === "send") {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

      // Delete old OTPs for this user
      await supabase
        .from("otp_codes")
        .delete()
        .eq("user_id", user.id);

      // Store OTP (plain text for simplicity, hashed in production)
      const { error: insertError } = await supabase
        .from("otp_codes")
        .insert({
          user_id: user.id,
          code_hash: otp,
          expires_at: expiresAt.toISOString(),
          attempts: 0,
          verified: false,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error("Failed to create OTP");
      }

      // Send OTP via Resend
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
                <p class="warning">⏰ This code expires in 3 minutes.</p>
                <p class="warning">Do not share this code with anyone.</p>
              </div>
              <div class="footer">
                <p>Simba Adventure & Tourism</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Simba Adventure <onboarding@resend.dev>",
          to: [user.email],
          subject: "Your Verification Code - Simba Adventure",
          html: emailHtml,
        }),
      });

      const resendData = await resendResponse.json();
      if (!resendResponse.ok) {
        console.error("Resend error:", resendData);
        throw new Error(resendData.message || "Failed to send email");
      }

      console.log("OTP sent successfully");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "verify") {
      const { code } = await req.json();

      // Get the latest OTP for this user
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

      // Check attempts
      if (otpData.attempts >= 5) {
        await supabase.from("otp_codes").delete().eq("id", otpData.id);
        return new Response(
          JSON.stringify({ success: false, error: "Too many attempts. Please request a new code." }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check expiry
      if (new Date(otpData.expires_at) < new Date()) {
        await supabase.from("otp_codes").delete().eq("id", otpData.id);
        return new Response(
          JSON.stringify({ success: false, error: "Code expired. Please request a new one." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check code
      if (otpData.code_hash !== code) {
        await supabase
          .from("otp_codes")
          .update({ attempts: otpData.attempts + 1 })
          .eq("id", otpData.id);

        return new Response(
          JSON.stringify({ success: false, error: `Invalid code. ${4 - otpData.attempts} attempts remaining.` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Mark as verified and delete
      await supabase.from("otp_codes").delete().eq("id", otpData.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
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
