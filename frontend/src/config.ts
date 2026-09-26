export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
export const WORKER_URL = import.meta.env.VITE_WORKER_URL as string;
// Must be a path GitHub Pages actually serves as a static file (the app root),
// not a sub-path like /auth/callback — GitHub Pages has no SPA fallback routing,
// so a nonexistent path would 404 before our code ever runs. The callback is
// detected by the presence of ?code= on this same root URL instead.
export const REDIRECT_URI = `${window.location.origin}${import.meta.env.BASE_URL}`;
export const SCOPES = "https://www.googleapis.com/auth/drive.file";
