
function mustHave(name) {
      const value = process.env[name];
  if (!value) throw new Error(`${name} cannot be found, try copying .env.example to .env `);
  return value;
}

export const config = {
port: Number(process.env.PORT ?? 4000),
mongoUrl: mustHave('MONGO_URL'),
elasticUrl: mustHave('ELASTIC_URL'),
jwtSecret: mustHave('JWT_SECRET'),
// The cast tells the type checker this is a valid jsonwebtoken duration like '1d' (env values are plain strings)
jwtExpiresIn: /** @type {import('jsonwebtoken').SignOptions['expiresIn']} */ (process.env.JWT_EXPIRES_IN || '1d')
}