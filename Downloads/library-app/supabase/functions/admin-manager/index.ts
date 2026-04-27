import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { 
  corsHeaders, 
  handleError, 
  withAuth, 
  successResponse 
} from '../_shared/middleware.ts';
import { 
  CreateUserSchema, 
  validateRequest 
} from '../_shared/validation.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authentication & Authorization Middleware
    // Only 'Admin' or 'Librarian' can access this function
    const { user: requester } = await withAuth(req, ['Admin', 'Librarian']);

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/admin-manager\/?/, '');

    // 2. Routing (Controller Pattern)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Requires elevated permissions
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    /**
     * POST /create-user
     */
    if (req.method === 'POST' && (path === 'create-user' || path === '')) {
      const data = await validateRequest(req, CreateUserSchema);

      // Create Auth User (Admin API)
      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName }
      });

      if (authError) throw authError;

      // Update Profile (Sync)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          full_name: data.fullName,
          role: data.role
        })
        .eq('id', newUser.user.id);

      if (profileError) throw profileError;

      return successResponse({ 
        message: 'User created successfully', 
        user: { id: newUser.user.id, email: newUser.user.email } 
      }, 201);
    }

    /**
     * GET /list-users
     */
    if (req.method === 'GET' && path === 'list-users') {
      const { data: users, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return successResponse(users);
    }

    /**
     * DELETE /delete-user
     */
    if (req.method === 'DELETE' && path === 'delete-user') {
      const userId = url.searchParams.get('id');
      if (!userId) throw { message: 'Missing user ID', status: 400 };

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;

      return successResponse({ message: 'User deleted successfully' });
    }

    throw { message: 'Route not found', status: 404 };

  } catch (err) {
    return handleError(err);
  }
});
