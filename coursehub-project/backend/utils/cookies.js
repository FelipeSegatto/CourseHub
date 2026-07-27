const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

const DURATION_UNITS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Converte strings de duração no formato usado pelo jsonwebtoken
 * ("15m", "7d", "1h"...) em milissegundos, para uso em maxAge de cookie.
 */
function durationToMs(value, fallbackMs) {
  const match = /^(\d+)(s|m|h|d)$/.exec(String(value || "").trim());

  if (!match) {
    return fallbackMs;
  }

  const [, amount, unit] = match;

  return Number(amount) * DURATION_UNITS[unit];
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

function setAccessTokenCookie(res, accessToken) {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions(),
    path: "/",
    maxAge: durationToMs(process.env.ACCESS_TOKEN_EXPIRES_IN, 15 * 60 * 1000),
  });
}

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    path: "/api/auth",
    maxAge: durationToMs(
      process.env.REFRESH_TOKEN_EXPIRES_IN,
      7 * 24 * 60 * 60 * 1000
    ),
  });
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseCookieOptions(), path: "/" });

  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    ...baseCookieOptions(),
    path: "/api/auth",
  });
}

module.exports = {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  durationToMs,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
};
