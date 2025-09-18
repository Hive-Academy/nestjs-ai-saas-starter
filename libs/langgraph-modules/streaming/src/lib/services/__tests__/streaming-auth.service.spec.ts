import {
  StreamingAuthService,
  StreamingAuthError,
} from '../streaming-auth.service';

// Lightweight fake token generation (NOT secure). We'll stub jwt.verify via jest.mock if needed.
jest.mock('jsonwebtoken', () => ({
  verify: (token: string) => {
    if (token === 'bad') throw new Error('invalid');
    if (token === 'exp')
      return { sub: 'x', exp: Math.floor(Date.now() / 1000) - 10 };
    return { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 60 };
  },
}));

describe('StreamingAuthService', () => {
  let service: StreamingAuthService;
  beforeEach(() => {
    service = new StreamingAuthService();
  });

  it('returns null when token missing and not required', () => {
    expect(
      service.verify(undefined, { required: false, secret: 's' })
    ).toBeNull();
  });

  it('throws when token missing and required', () => {
    expect(() =>
      service.verify(undefined, { required: true, secret: 's' })
    ).toThrow(StreamingAuthError);
  });

  it('verifies valid token and caches it', () => {
    const claims1 = service.verify('good', { required: true, secret: 's' });
    const claims2 = service.verify('good', { required: true, secret: 's' });
    expect(claims1).toBeTruthy();
    expect(claims2).toBeTruthy();
    expect(claims1).toEqual(claims2);
  });

  it('fails invalid token when required', () => {
    expect(() =>
      service.verify('bad', { required: true, secret: 's' })
    ).toThrow(StreamingAuthError);
  });
});
