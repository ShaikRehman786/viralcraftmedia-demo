import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/User.js';
import crypto from 'crypto';

// Helper to generate access token
export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtAccessExpiry
  });
};

// Helper to generate refresh token
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiry
  });
};

// Generate and send token in response cookies
export const getSignedTokenResponse = async (user, statusCode, res) => {
  // Create tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token in user document with expiry (7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  user.refreshTokens.push({ token: refreshToken, expiresAt });
  
  // Cap stored tokens limit to 10 to avoid bloating user document
  if (user.refreshTokens.length > 10) {
    user.refreshTokens.shift();
  }

  await user.save();

  // Access token cookie options
  const isProduction = config.nodeEnv === 'production';
  const accessTokenOptions = {
    expires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  };

  // Refresh token cookie options
  const refreshTokenOptions = {
    expires: expiresAt,
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  };

  res.cookie('accessToken', accessToken, accessTokenOptions);
  res.cookie('refreshToken', refreshToken, refreshTokenOptions);

  return res.status(statusCode).json({
    success: true,
    role: user.role,
    user: {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

// Refresh token rotation logic
export const rotateRefreshToken = async (oldToken, res) => {
  try {
    // 1. Verify old refresh token
    const decoded = jwt.verify(oldToken, config.jwtRefreshSecret);

    // 2. Find user containing the active token
    const user = await User.findOne({ 
      _id: decoded.id, 
      'refreshTokens.token': oldToken 
    });

    if (!user) {
      // Replay attack: Old token is used but not found (already reused).
      // Clear all refresh tokens of the victim user for security.
      if (decoded.id) {
        const compromisedUser = await User.findById(decoded.id);
        if (compromisedUser) {
          compromisedUser.refreshTokens = [];
          await compromisedUser.save();
        }
      }
      throw new Error('Refresh token compromised. Please log in again.');
    }

    // 3. Filter out the old token
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== oldToken);

    // 4. Generate new tokens
    return await getSignedTokenResponse(user, 200, res);
  } catch (err) {
    const isProduction = config.nodeEnv === 'production';
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax'
    };
    res.clearCookie('accessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);
    throw new Error('Invalid or expired session. Please log in again.');
  }
};
