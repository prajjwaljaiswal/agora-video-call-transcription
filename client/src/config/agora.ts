// Agora Video SDK Configuration
// Get your App ID from https://console.agora.io/
// For development, you can use a temporary token generator

const envAppId = import.meta.env.VITE_AGORA_APP_ID?.trim();
const hardcodedAppId = "050b139b22d940eca6892043748f6281";

export const AGORA_CONFIG = {
  // Replace with your Agora App ID from console.agora.io
  // Use environment variable first, fallback to hardcoded for testing
  appId: envAppId || hardcodedAppId || "",

  // For development/testing, token can be null or a temporary token
  // For production, you should generate tokens from your server
  token: import.meta.env.VITE_AGORA_TOKEN?.trim() || null,

  // Channel prefix - Agora channels are identified by strings
  // We'll use meetingId as the channel name

  // Region code for better connectivity (helps avoid gateway server errors)
  // Options: 'ASIA', 'EUROPE', 'NORTH_AMERICA', 'CHINA', 'INDIA', 'JAPAN'
  region: import.meta.env.VITE_AGORA_REGION?.trim() || "ASIA",
};
