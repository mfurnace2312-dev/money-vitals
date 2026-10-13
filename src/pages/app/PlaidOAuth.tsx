import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaidConnect, LINK_TOKEN_KEY } from "@/components/BankConnections";
import { Spinner } from "@/components/ui";

/** Banks that use their own login page (Chase, Capital One, Wells Fargo…) send people back here to finish linking. */
export default function PlaidOAuth() {
  const nav = useNavigate();
  const [token] = useState<string | null>(() => { try { return localStorage.getItem(LINK_TOKEN_KEY); } catch { return null; } });
  const { open, ready } = usePlaidConnect(() => nav("/transactions", { replace: true }), token, window.location.href);

  useEffect(() => { if (!token) nav("/transactions", { replace: true }); }, [token, nav]);
  useEffect(() => { if (ready) open(); }, [ready, open]);

  return <Spinner label="Finishing your bank connection" />;
}
