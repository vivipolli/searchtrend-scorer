import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from '@/types';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      throw new AppError(`Validation Error: ${errorMessage}`, 400);
    }
    
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      throw new AppError(`Query Validation Error: ${errorMessage}`, 400);
    }
    
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.params);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      throw new AppError(`Parameter Validation Error: ${errorMessage}`, 400);
    }
    
    next();
  };
};

// Common validation schemas
export const schemas = {
  scoreDomain: Joi.object({
    domainName: Joi.string().min(1).max(255).required(),
    forceUpdate: Joi.boolean().optional(),
  }),

  getDomains: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    sortBy: Joi.string().valid('score', 'name', 'createdAt').optional().default('score'),
    sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
    minScore: Joi.number().min(0).max(100).optional(),
    maxScore: Joi.number().min(0).max(100).optional(),
    eventType: Joi.string().valid(
      'NAME_TOKEN_MINTED',
      'NAME_TOKEN_TRANSFERRED',
      'NAME_RENEWED',
      'NAME_UPDATED',
      'NAME_DETOKENIZED'
    ).optional(),
    networkId: Joi.string().optional(),
  }),

  domainName: Joi.object({
    domainName: Joi.string().min(1).max(255).required(),
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
  }),
};
