import { z } from 'https://esm.sh/zod@3.22.4';

/**
 * User Creation Schema (DTO)
 */
export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(['Librarian', 'Admin', 'Member']).default('Member'),
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;

/**
 * User Update Schema
 */
export const UpdateUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().optional(),
  role: z.enum(['Librarian', 'Admin', 'Member']).optional(),
  isSuspended: z.boolean().optional(),
});

/**
 * Request Helper for Zod Validation
 */
export async function validateRequest<T>(req: Request, schema: z.ZodSchema<T>): Promise<T> {
  const body = await req.json();
  const result = schema.safeParse(body);
  
  if (!result.success) {
    throw { 
      message: 'Validation failed', 
      status: 400, 
      details: result.error.format() 
    };
  }
  
  return result.data;
}
