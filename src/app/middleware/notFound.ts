import { Request, Response } from 'express';

const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'API Not Found',
    errors: [
      {
        path: req.originalUrl,
        message: `Route ${req.method} ${req.originalUrl} does not exist on this server.`,
      },
    ],
  });
};

export default notFound;
