import { supabase } from '@/lib/customSupabaseClient';

// --- Core Auth Functions ---

export const signUp = async ({ email, password, options }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options
  });
  return { data, error };
};

export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const sendPasswordResetEmail = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/update-password`,
  });
  return { data, error };
};

export const updateUserPassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { data, error };
};


// --- User Profile & Data Functions ---

export const updateUserProfile = async (userId, updates) => {
    const { data, error } = await supabase
        .from('users_data')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    return { data, error };
};

export const updateUserAuth = async (updates) => {
    const { data, error } = await supabase.auth.updateUser(updates);
    return { data, error };
}

export const uploadAvatar = async (userId, file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    if (uploadError) return { data: null, error: uploadError };

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    if (!urlData) return { data: null, error: { message: 'Could not get public URL' } };

    return { data: { avatar_url: urlData.publicUrl }, error: null };
};


// --- Admin User Management Functions ---

export const getAllUsers = async () => {
    const { data, error } = await supabase.rpc('get_all_users_data');
    return { data, error };
};

export const adminCreateUser = async (email, password, fullName, role) => {
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: role }
    });
    return { data, error };
};

export const adminUpdateUser = async (userId, updates) => {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, updates);
    return { data, error };
};

export const adminDeleteUser = async (userId) => {
    const { data, error } = await supabase.auth.admin.deleteUser(userId);
    return { data, error };
};