import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function extractHasuraAuthContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sessionVars = req.body?.session_variables || {};
  
  const userId = sessionVars['x-hasura-user-id'] || req.headers['x-hasura-user-id'] as string || req.headers['x-user-id'] as string;
  const userRole = sessionVars['x-hasura-role'] || req.headers['x-hasura-role'] as string || 'user';

  req.userId = userId;
  req.userRole = userRole;

  next();
}
