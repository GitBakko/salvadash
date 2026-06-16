import { describe, it, expect } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { asyncHandler, HttpError } from '../lib/http.js';
import { errorHandler, notFoundHandler } from '../middleware/error.js';

function appWith(mount: (app: Express) => void): Express {
  const app = express();
  app.use(express.json());
  mount(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('central error handling', () => {
  it('forwards a thrown HttpError with its status + details', async () => {
    const app = appWith((a) =>
      a.get(
        '/x',
        asyncHandler(async () => {
          throw new HttpError(422, 'Nope', { field: 'bad' });
        }),
      ),
    );
    const res = await request(app).get('/x');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ success: false, error: 'Nope', details: { field: 'bad' } });
  });

  it('omits the details key when none is provided', async () => {
    const app = appWith((a) =>
      a.get(
        '/x',
        asyncHandler(async () => {
          throw new HttpError(400, 'Bad');
        }),
      ),
    );
    const res = await request(app).get('/x');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Bad' });
  });

  it('maps an unexpected Error to an opaque 500 (no internals leaked under test)', async () => {
    const app = appWith((a) =>
      a.get(
        '/boom',
        asyncHandler(async () => {
          throw new Error('db exploded with secret connection string');
        }),
      ),
    );
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toContain('db exploded');
  });

  it('returns a JSON 404 for unmatched routes', async () => {
    const app = appWith(() => {});
    const res = await request(app).get('/missing');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Not found' });
  });
});
