// Reads every setting from environment variables, in one place

// Returns the variable's value, or stops the API with a clear message if it's missing
function mustHave(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} cannot be found, try copying .env.example to .env`);
  }
  return value;
}

// How long a login token lasts, like '1d'. The cast tells the type checker this is a valid
// jsonwebtoken duration (values from process.env are plain strings).
const jwtExpiresIn = /** @type {import('jsonwebtoken').SignOptions['expiresIn']} */ (
  process.env.JWT_EXPIRES_IN || '1d'
);

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUrl: mustHave('MONGO_URL'),
  elasticUrl: mustHave('ELASTIC_URL'),
  jwtSecret: mustHave('JWT_SECRET'),
  jwtExpiresIn: jwtExpiresIn,
};
