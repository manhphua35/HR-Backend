"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class TokenService {
    constructor() {
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'access-secret-key';
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';
        this.accessTokenExpiry = 3600; // 1 hour in seconds
        this.refreshTokenExpiry = 604800; // 7 days in seconds
    }
    static getInstance() {
        if (!TokenService.instance) {
            TokenService.instance = new TokenService();
        }
        return TokenService.instance;
    }
    generateTokens(data) {
        const accessTokenOptions = {
            expiresIn: this.accessTokenExpiry
        };
        const refreshTokenOptions = {
            expiresIn: this.refreshTokenExpiry
        };
        const accessToken = jsonwebtoken_1.default.sign(Object.assign(Object.assign({}, data), { type: 'ACCESS' }), this.accessTokenSecret, accessTokenOptions);
        const refreshToken = jsonwebtoken_1.default.sign(Object.assign(Object.assign({}, data), { type: 'REFRESH' }), this.refreshTokenSecret, refreshTokenOptions);
        return {
            accessToken,
            refreshToken,
            expiresIn: this.accessTokenExpiry
        };
    }
    verifyAccessToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.accessTokenSecret);
            if (decoded.type !== 'ACCESS') {
                throw new Error('Invalid token type');
            }
            return decoded;
        }
        catch (error) {
            throw new Error('Invalid access token');
        }
    }
    verifyRefreshToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.refreshTokenSecret);
            if (decoded.type !== 'REFRESH') {
                throw new Error('Invalid token type');
            }
            return decoded;
        }
        catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    refreshAccessToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const decoded = this.verifyRefreshToken(refreshToken);
                const accessTokenOptions = {
                    expiresIn: this.accessTokenExpiry
                };
                // Generate new access token
                return {
                    accessToken: jsonwebtoken_1.default.sign({
                        userId: decoded.userId,
                        roleType: decoded.roleType,
                        permissions: decoded.permissions,
                        departmentId: decoded.departmentId,
                        type: 'ACCESS'
                    }, this.accessTokenSecret, accessTokenOptions),
                    expiresIn: this.accessTokenExpiry
                };
            }
            catch (error) {
                throw new Error('Invalid refresh token');
            }
        });
    }
}
exports.tokenService = TokenService.getInstance();
