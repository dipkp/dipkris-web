import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [isInitializing, setIsInitializing] = useState(true);

  const {
    data: user,
    isLoading: isMeLoading,
    error,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const guestLoginMutation = trpc.auth.guestLogin.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      navigate(redirectPath);
    },
  });

  useEffect(() => {
    if (!isMeLoading) {
      if (!user && !guestLoginMutation.isPending && !guestLoginMutation.isSuccess) {
        guestLoginMutation.mutate();
      } else if (user) {
        setIsInitializing(false);
      }
    }
  }, [isMeLoading, user, guestLoginMutation]);

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isInitializing && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isInitializing, user, navigate, redirectPath]);

  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: !!user,
      isLoading: isMeLoading || isInitializing || guestLoginMutation.isPending || logoutMutation.isPending,
      error,
      logout,
      refresh: refetch,
    }),
    [user, isMeLoading, isInitializing, guestLoginMutation.isPending, logoutMutation.isPending, error, logout, refetch],
  );
}
