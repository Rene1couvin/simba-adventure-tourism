import { MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/250788564396";

export const WhatsAppButton = ({ className = "" }: { className?: string }) => (
  <a
    href={WHATSAPP_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium px-4 py-2 rounded-lg transition-colors ${className}`}
  >
    <MessageCircle className="h-5 w-5" />
    Chat on WhatsApp
  </a>
);

export const WhatsAppFloating = () => (
  <a
    href={WHATSAPP_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-24 right-6 z-40 bg-[#25D366] hover:bg-[#20bd5a] text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110"
    aria-label="Chat on WhatsApp"
  >
    <MessageCircle className="h-6 w-6" />
  </a>
);
