import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

// Same Supabase Auth users as the qfa100-dashboard EFB - no separate
// account system for the broadcast control panel.
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email, password) => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  return { user, loading, error, signIn, signOut };
}
