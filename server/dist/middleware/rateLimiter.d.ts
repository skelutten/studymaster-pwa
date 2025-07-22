import { Request, Response, NextFunction } from 'express';
export declare const rateLimiter: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const authLimiter: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export default rateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map