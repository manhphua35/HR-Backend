import jwt, { SignOptions } from 'jsonwebtoken';
import { RoleType } from '../entities/auth/Role';

interface TokenData {
    userId: number;
    roleType: RoleType;
    permissions: string[];
    departmentId?: number;
}

interface TokenPayload extends TokenData {
    type: 'ACCESS' | 'REFRESH';
}

class TokenService {
    private static instance: TokenService;
    private readonly accessTokenSecret: string;
    private readonly refreshTokenSecret: string;
    private readonly accessTokenExpiry: number;
    private readonly refreshTokenExpiry: number;

    private constructor() {
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'access-secret-key';
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';
        this.accessTokenExpiry = 3600; // 1 hour in seconds
        this.refreshTokenExpiry = 604800; // 7 days in seconds
    }

    public static getInstance(): TokenService {
        if (!TokenService.instance) {
            TokenService.instance = new TokenService();
        }
        return TokenService.instance;
    }

    public generateTokens(data: TokenData) {
        const accessTokenOptions: SignOptions = {
            expiresIn: this.accessTokenExpiry
        };

        const refreshTokenOptions: SignOptions = {
            expiresIn: this.refreshTokenExpiry
        };

        const accessToken = jwt.sign(
            { ...data, type: 'ACCESS' } as TokenPayload,
            this.accessTokenSecret,
            accessTokenOptions
        );

        const refreshToken = jwt.sign(
            { ...data, type: 'REFRESH' } as TokenPayload,
            this.refreshTokenSecret,
            refreshTokenOptions
        );

        return {
            accessToken,
            refreshToken,
            expiresIn: this.accessTokenExpiry
        };
    }

    public verifyAccessToken(token: string): TokenPayload {
        try {
            const decoded = jwt.verify(token, this.accessTokenSecret) as TokenPayload;
            if (decoded.type !== 'ACCESS') {
                throw new Error('Invalid token type');
            }
            return decoded;
        } catch (error) {
            throw new Error('Invalid access token');
        }
    }

    public verifyRefreshToken(token: string): TokenPayload {
        try {
            const decoded = jwt.verify(token, this.refreshTokenSecret) as TokenPayload;
            if (decoded.type !== 'REFRESH') {
                throw new Error('Invalid token type');
            }
            return decoded;
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }

    public async refreshAccessToken(refreshToken: string) {
        try {
            const decoded = this.verifyRefreshToken(refreshToken);

            const accessTokenOptions: SignOptions = {
                expiresIn: this.accessTokenExpiry
            };

            // Generate new access token
            return {
                accessToken: jwt.sign(
                    {
                        userId: decoded.userId,
                        roleType: decoded.roleType,
                        permissions: decoded.permissions,
                        departmentId: decoded.departmentId,
                        type: 'ACCESS'
                    } as TokenPayload,
                    this.accessTokenSecret,
                    accessTokenOptions
                ),
                expiresIn: this.accessTokenExpiry
            };
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
}

export const tokenService = TokenService.getInstance();