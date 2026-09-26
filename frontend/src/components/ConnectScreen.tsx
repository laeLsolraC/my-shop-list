import { startLogin } from "../auth/googleAuth";

export function ConnectScreen() {
  return (
    <div className="connect-screen">
      <img src="/icons/logo.svg" alt="" />
      <h1>My Shop List</h1>
      <p className="mono" style={{ color: "var(--muted)", fontSize: 13 }}>
        two checked, one to go
      </p>
      <button className="btn btn-primary" style={{ flex: "none", padding: "14px 28px" }} onClick={() => startLogin()}>
        Connect Google Drive
      </button>
    </div>
  );
}
