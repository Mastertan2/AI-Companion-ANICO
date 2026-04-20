export const handleIntent = (aiResponse: string, callback?: (msg: string) => void) => {
  // Simple heuristic intent handler
  const text = aiResponse.toLowerCase();

  const notify = (msg: string) => {
    if (callback) callback(msg);
  };

  if (text.includes("call_contact:") || text.includes("call contact:")) {
    const parts = text.split(":");
    if (parts.length > 1) {
      const phoneNumber = parts[1].trim().replace(/[^0-9+]/g, '');
      notify("Calling contact...");
      setTimeout(() => {
        window.location.href = `tel:${phoneNumber}`;
      }, 1500);
      return true;
    }
  }

  if (text.includes("open_maps:") || text.includes("open maps:")) {
    const parts = text.split(":");
    if (parts.length > 1) {
      const destination = encodeURIComponent(parts[1].trim());
      notify("Opening maps...");
      setTimeout(() => {
        window.location.href = `geo:0,0?q=${destination}`;
        // Fallback timeout not easily implementable without tracking app visibility,
        // but typically the browser handles intent fallback.
      }, 1500);
      return true;
    }
  }

  if (text.includes("open_youtube:") || text.includes("open youtube:")) {
    const parts = text.split(":");
    if (parts.length > 1) {
      const query = encodeURIComponent(parts[1].trim());
      notify("Opening YouTube...");
      setTimeout(() => {
        window.location.href = `vnd.youtube://results?search_query=${query}`;
      }, 1500);
      return true;
    }
  }

  if (text.includes("open_whatsapp") || text.includes("whatsapp")) {
    notify("Opening WhatsApp...");
    setTimeout(() => {
      window.location.href = "whatsapp://";
    }, 1500);
    return true;
  }

  if (text.includes("open_singpass") || text.includes("singpass")) {
    notify("Opening Singpass...");
    setTimeout(() => {
      window.location.href = "intent://#Intent;package=sg.ndi.sp;end";
    }, 1500);
    return true;
  }

  if (text.includes("emergency") && text.includes("call")) {
    notify("Calling Emergency 999...");
    setTimeout(() => {
      window.location.href = "tel:999";
    }, 1500);
    return true;
  }

  return false;
};
