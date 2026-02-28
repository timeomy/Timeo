import { useEffect, useState } from "react";
import { getSocket, connectSocket } from "./socket-client.js";

export function useSocket(tenantId?: string, userId?: string) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();

    const onConnect = () => {
      setIsConnected(true);
      if (tenantId) s.emit("join:tenant", tenantId);
      if (userId) s.emit("join:user", userId);
    };
    const onDisconnect = () => setIsConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    connectSocket();

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, [tenantId, userId]);

  return { isConnected };
}
