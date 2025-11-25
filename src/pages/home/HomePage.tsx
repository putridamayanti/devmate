import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { fetch as httpFetch } from "@tauri-apps/plugin-http";
import { load as loadStore } from "@tauri-apps/plugin-store";
import type { Store } from "@tauri-apps/plugin-store";
import { Link } from "react-router";
import {Card, CardContent} from "@/components/ui/card.tsx";

type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
};

export default function HomePage() {
  const [connecting, setConnecting] = useState(false);
  const [device, setDevice] = useState<DeviceCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const pollTimer = useRef<number | null>(null);
  const storeRef = useRef<Store | null>(null);

  useEffect(() => {
    // Load saved token (if any)
    (async () => {
      try {
        const store = await loadStore("auth.json", { autoSave: true, defaults: {} });
        storeRef.current = store;
        const token = await store.get<string>("github_token");
        if (token) {
          setAccessToken(token);
          setStatus("Connected to GitHub.");
        }
      } catch (e) {
        // ignore load errors, keep unauthenticated state
      }
    })();

    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
  }, []);

  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined;

  async function startGitHubDeviceFlow() {
    setError(null);
    setStatus("");
    setAccessToken(null);

    if (!clientId) {
      setError("Missing VITE_GITHUB_CLIENT_ID in your environment.");
      return;
    }

    try {
      setConnecting(true);
      const res = await httpFetch("https://github.com/login/device/code", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams([
          ["client_id", clientId],
          ["scope", "read:user user:email repo"],
        ]).toString(),
      });
      if (!res.ok) throw new Error(`Device code request failed (${res.status})`);
      const data = (await res.json()) as DeviceCodeResponse;
      setDevice(data);
      setStatus("Code generated. Please authorize in your browser.");
      startPolling(data);
    } catch (e: any) {
        console.log(e)
      setError(e?.message ?? "Failed to start GitHub connect");
    } finally {
      setConnecting(false);
    }
  }

  function startPolling(dc: DeviceCodeResponse) {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    const intervalMs = Math.max(5, dc.interval ?? 5) * 1000;
    pollTimer.current = window.setInterval(async () => {
      try {
        const res = await httpFetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: new URLSearchParams([
            ["client_id", clientId!],
            ["device_code", dc.device_code],
            ["grant_type", "urn:ietf:params:oauth:grant-type:device_code"],
          ]).toString(),
        });
        const body = (await res.json()) as TokenResponse;

        if (body.error === "authorization_pending") {
          setStatus("Waiting for authorization...");
          return;
        }
        if (body.error === "slow_down") {
          setStatus("Asked to slow down by GitHub, adjusting...");
          if (pollTimer.current) window.clearInterval(pollTimer.current);
          pollTimer.current = window.setInterval(() => startPolling(dc), (dc.interval + 5) * 1000);
          return;
        }
        if (body.error) {
          throw new Error(body.error_description || body.error);
        }

        if (body.access_token) {
          if (pollTimer.current) window.clearInterval(pollTimer.current);
          setAccessToken(body.access_token);
          setStatus("Connected to GitHub.");
          try {
            if (storeRef.current) {
              await storeRef.current.set("github_token", body.access_token);
              // autosave on, but force save to be safe
              await storeRef.current.save();
            }
          } catch (_) {
            // non-fatal if persistence fails
          }
        }
      } catch (e: any) {
        if (pollTimer.current) window.clearInterval(pollTimer.current);
        setError(e?.message ?? "Polling failed");
      }
    }, intervalMs);
  }

  async function openVerification() {
    if (device?.verification_uri) {
      window.open(device.verification_uri, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <main className="min-h-screen flex justify-center items-center">
      <Card>
        <CardContent className="space-y-6">
          <h1 className="text-2xl font-semibold text-center">Devmate</h1>

          {!accessToken ? (
              <div className="space-y-3">
                <Button onClick={startGitHubDeviceFlow} disabled={connecting} className="mx-auto">
                  {connecting ? "Starting..." : "Connect GitHub"}
                </Button>

                {device && (
                    <div className="space-y-4 text-center">
                      <div>Enter code: <strong>{device.user_code}</strong></div>
                      <div>
                        Authorize at: {" "}
                        <a className="text-blue-600 underline" href={device.verification_uri} target="_blank" rel="noreferrer">
                          {device.verification_uri}
                        </a>
                      </div>
                      <div>
                        <Button variant="secondary" onClick={openVerification}>Open verification page</Button>
                      </div>
                    </div>
                )}

                {status && <div className="text-sm text-muted-foreground">{status}</div>}
                {error && <div className="text-sm text-red-600">{error}</div>}

                {!clientId && (
                    <div className="text-sm text-amber-600 text-center">
                      VITE_GITHUB_CLIENT_ID is not set. Create a GitHub OAuth App (Device Flow) and set it in your Vite env.
                    </div>
                )}
              </div>
          ) : (
              <div className="space-y-4 text-center">
                <div className="text-green-700">GitHub connected.</div>
                {/*<div className="text-xs break-all opacity-70">Access Token: {accessToken}</div>*/}
                <Link to={"/dashboard"}>
                  <Button>
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
