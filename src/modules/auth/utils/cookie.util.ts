export const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'lax' | 'none' | 'strict',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});


export const getClearCookieOptions = () => {
  const options = getCookieOptions();

  return {
    ...options,
    maxAge: 0,
  }
}

