import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  email: string;
  customerName: string;
  tourTitle: string;
  tourLocation: string;
  bookingDate: string;
  numberOfPeople: number;
  totalPrice: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      customerName,
      tourTitle,
      tourLocation,
      bookingDate,
      numberOfPeople,
      totalPrice,
    }: BookingConfirmationRequest = await req.json();

    console.log(`Sending booking confirmation to ${email}`);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
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
              <h1>🎉 Booking Confirmed!</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>Thank you for booking with Simba Adventure Tours! Your safari adventure has been confirmed.</p>
              
              <div class="detail-row">
                <span class="label">Tour:</span>
                <span class="value">${tourTitle}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Location:</span>
                <span class="value">${tourLocation}</span>
              </div>
              
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
              
              <p style="margin-top: 20px;">We will contact you shortly with further details about your adventure. If you have any questions, please don't hesitate to reach out to us.</p>
              
              <p>We look forward to making your African safari an unforgettable experience!</p>
              
              <div class="footer">
                <p><strong>Simba Adventure Tours</strong></p>
                <p>Your Gateway to African Adventures</p>
              </div>
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
        from: "Simba Adventure Tours <onboarding@resend.dev>",
        to: [email],
        subject: `Booking Confirmed: ${tourTitle}`,
        html: emailHtml,
      }),
    });

    const responseData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", responseData);
      throw new Error(responseData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", responseData);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-booking-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
