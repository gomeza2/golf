import { useEffect, useRef, useState } from "react";
import type { UserManager, User } from "oidc-client-ts";
import type {
  CommunityConfig,
  CommunityActor,
  CreationSummary,
} from "../shared/community";
import { communityRequest } from "./communityApi";
export function useCommunityAuth(
  base: string,
  config: CommunityConfig | null,
  onError: (message: string) => void,
) {
  const manager = useRef<UserManager | null>(null),
    [user, setUser] = useState<User | null>(null),
    [actor, setActor] = useState<CommunityActor | null>(null),
    [mine, setMine] = useState<CreationSummary[]>([]),
    [working, setWorking] = useState(false),
    [prepared, setPrepared] = useState(false);
  const auth = config?.auth;
  useEffect(() => {
    if (!auth) {
      setPrepared(false);
      return;
    }
    let alive = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const { UserManager, WebStorageStateStore } =
          await import("oidc-client-ts");
        if (!alive) return;
        const m = new UserManager({
          authority: auth.issuer,
          client_id: auth.clientId,
          redirect_uri: location.origin + location.pathname,
          response_type: "code",
          scope: auth.scope,
          extraQueryParams: { audience: auth.audience },
          automaticSilentRenew: false,
          userStore: new WebStorageStateStore({
            store: sessionStorage,
            prefix: "club-community-user.",
          }),
          stateStore: new WebStorageStateStore({
            store: sessionStorage,
            prefix: "club-community-state.",
          }),
        });
        manager.current = m;
        if (alive) setPrepared(true);
        await m.clearStaleState();
        if (!alive) return;
        let next: User | null = null;
        const query = new URLSearchParams(location.search);
        if (query.has("state") && (query.has("code") || query.has("error"))) {
          try {
            next = await m.signinRedirectCallback();
          } finally {
            const clean = new URL(location.href);
            for (const k of [
              "state",
              "code",
              "session_state",
              "iss",
              "error",
              "error_description",
            ])
              clean.searchParams.delete(k);
            clean.searchParams.set("community", "1");
            const returnTo = (next?.state as { returnTo?: unknown } | undefined)
              ?.returnTo;
            if (
              typeof returnTo === "string" &&
              returnTo.startsWith("?") &&
              returnTo.length < 1000
            ) {
              const saved = new URLSearchParams(returnTo);
              for (const key of ["creation", "revision", "authorId"])
                if (saved.has(key))
                  clean.searchParams.set(key, saved.get(key)!);
            }
            history.replaceState(null, "", clean);
            dispatchEvent(new PopStateEvent("popstate"));
          }
        } else next = await m.getUser();
        if (!alive) return;
        if (next?.expired) {
          await m.removeUser();
          next = null;
        }
        setUser(next);
        if (next) {
          const data = await communityRequest<{
            actor: CommunityActor;
            creations: CreationSummary[];
          }>(base, "/me", next.access_token, undefined, controller.signal);
          if (alive) {
            setActor(data.actor);
            setMine(data.creations);
          }
        }
      } catch (e) {
        if (alive) {
          setUser(null);
          setActor(null);
          onError(
            "No se pudo completar el acceso. Verifica la sesión y vuelve a entrar.",
          );
        }
      }
    })();
    return () => {
      alive = false;
      controller.abort();
      manager.current = null;
    };
  }, [base, auth?.issuer, auth?.clientId, auth?.audience, auth?.scope]);
  const refresh = async () => {
    if (!user) return;
    try {
      const d = await communityRequest<{
        actor: CommunityActor;
        creations: CreationSummary[];
      }>(base, "/me", user.access_token);
      setActor(d.actor);
      setMine(d.creations);
    } catch (e) {
      onError((e as Error).message);
    }
  };
  return {
    actor,
    mine,
    token: user?.access_token,
    working,
    prepared,
    refresh,
    login: async () => {
      if (!manager.current) return;
      setWorking(true);
      try {
        await manager.current.signinRedirect({
          state: { returnTo: location.search },
        });
      } catch {
        onError("No se pudo abrir el proveedor de identidad.");
        setWorking(false);
      }
    },
    logout: async () => {
      await manager.current?.removeUser();
      setUser(null);
      setActor(null);
      setMine([]);
    },
  };
}
