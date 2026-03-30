/**
 * GMAIL TO SUPABASE SYNC SCRIPT
 * Run this in Google Apps Script (script.google.com)
 * attached to kiranironhide.ironhide@gmail.com
 */

const SUPABASE_FUNCTION_URL = "https://bsygrixkvexkhiemylap.supabase.co/functions/v1/inbound-handler";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeWdyaXhrdmV4a2hpZW15bGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTQxNzIsImV4cCI6MjA4NzczMDE3Mn0.GApCaAUf361ruUwGscd3RWSGSI6fRA1Yfv1Y91Oq2Y4";

function syncGmailToSupabase() {
  const labelName = "Processed_EMS";
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }

  // Search for un-processed messages in Inbox
  const threads = GmailApp.search("in:inbox -label:" + labelName, 0, 20);
  
  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const msg of messages) {
      // Skip if already labeled (though search should handle it)
      if (hasLabel(thread, labelName)) continue;

      try {
        const payload = {
          sender_email: msg.getFrom(),
          sender_name: extractName(msg.getFrom()),
          recipient_email: msg.getTo(),
          subject: msg.getSubject(),
          body_text: msg.getPlainBody(),
          body_html: msg.getBody(),
          message_id: msg.getId()
        };

        const options = {
          method: "post",
          contentType: "application/json",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + SUPABASE_ANON_KEY
          },
          payload: JSON.stringify(payload)
        };

        UrlFetchApp.fetch(SUPABASE_FUNCTION_URL, options);
        
        // Mark as processed
        thread.addLabel(label);
        console.log("Synced message: " + msg.getSubject());
      } catch (e) {
        console.error("Error syncing message: " + e.toString());
      }
    }
  }
}

function hasLabel(thread, labelName) {
  const labels = thread.getLabels();
  for (let i = 0; i < labels.length; i++) {
    if (labels[i].getName() == labelName) return true;
  }
  return false;
}

function extractName(fromStr) {
  const match = fromStr.match(/(.*)<.*>/);
  return match ? match[1].trim() : fromStr;
}

// Setup a trigger to run every 1 minute
function createTrigger() {
  ScriptApp.newTrigger('syncGmailToSupabase')
      .timeBased()
      .everyMinutes(1)
      .create();
}
