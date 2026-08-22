import { Router } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { AppError, asyncHandler } from "../../middleware/errorHandler";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const accessTokenOptions: SignOptions = {
  expiresIn: env.jwtAccessExpiresIn as SignOptions["expiresIn"],
};

const refreshTokenOptions: SignOptions = {
  expiresIn: env.jwtRefreshExpiresIn as SignOptions["expiresIn"],
};

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        roles: { include: { role: true } },
        scopes: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new AppError("بيانات الدخول غير صحيحة", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      throw new AppError("بيانات الدخول غير صحيحة", 401);
    }

    const roles = user.roles.map((r) => r.role.name);

    const scopes = user.scopes.map((s) => ({
      departmentId: s.departmentId,
      centerId: s.centerId,
      warehouseId: s.warehouseId,
    }));

    const payload = {
      id: user.id,
      roles,
      scopes,
    };

    const accessToken = jwt.sign(
      payload,
      env.jwtAccessSecret,
      accessTokenOptions
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      env.jwtRefreshSecret,
      refreshTokenOptions
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        roles,
        username: user.username,
      },
    });
  })
);

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);

    let decoded: { id: string };

    try {
      decoded = jwt.verify(
        refreshToken,
        env.jwtRefreshSecret
      ) as { id: string };
    } catch {
      throw new AppError("Refresh token غير صالح", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        roles: { include: { role: true } },
        scopes: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new AppError(
        "المستخدم غير موجود أو غير فعّال",
        401
      );
    }

    const roles = user.roles.map((r) => r.role.name);

    const scopes = user.scopes.map((s) => ({
      departmentId: s.departmentId,
      centerId: s.centerId,
      warehouseId: s.warehouseId,
    }));

    const accessToken = jwt.sign(
      {
        id: user.id,
        roles,
        scopes,
      },
      env.jwtAccessSecret,
      accessTokenOptions
    );

    res.json({
      accessToken,
    });
  })
);
