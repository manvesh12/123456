import { Router } from "express";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { permissionsFor, roleToFrontend, signToken } from "../lib/auth.js";
import { recordAudit } from "../lib/audit.js";
import { config } from "../lib/config.js";
import { prisma } from "../lib/prisma.js";
import { jsonSafe } from "../lib/json.js";

const loginSchema = z.object({
  username: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(256)
});

const registerSchema = z.object({
  username: z.string().trim().min(3).max(64).optional(),
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(10).max(128).regex(/[A-Za-z]/).regex(/[0-9]/)
});

const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: "strict" as const,
  path: "/",
  maxAge: 15 * 60 * 1000
};

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: "strict" as const,
  path: "/api/auth/refresh",
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export const authRouter = Router();

import crypto from "crypto";

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const usernameOrEmail = parsed.data.username.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
    }
  });

  if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) {
    recordAudit(req, "AUTH_LOGIN_FAILED", { username: usernameOrEmail }, 401);
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = signToken(user);
  
  const refreshTokenStr = crypto.randomBytes(40).toString("hex");
  await prisma.refreshToken.create({
    data: {
      token: refreshTokenStr,
      userId: user.id,
      expiresAt: new Date(Date.now() + refreshTokenCookieOptions.maxAge)
    }
  });

  res.cookie(config.sessionCookieName, token, cookieOptions);
  res.cookie("dsr_refresh_token", refreshTokenStr, refreshTokenCookieOptions);
  
  recordAudit(req, "AUTH_LOGIN_SUCCESS", { username: user.username, role: user.role }, 200);
  res.json(
    jsonSafe({
      token,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: `ROLE_${user.role}`,
      uiRole: roleToFrontend(user.role),
      permissions: permissionsFor(user.role),
      scope: {
        district: user.district,
        blockName: user.blockName,
        sectionName: user.sectionName
      },
      accessLabel: user.accessScope || user.role.replaceAll("_", " ")
    })
  );
});

authRouter.post("/refresh", async (req, res) => {
  const refreshTokenStr = req.cookies?.["dsr_refresh_token"];
  if (!refreshTokenStr) {
    res.status(401).json({ error: "No refresh token provided" });
    return;
  }

  const rt = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenStr },
    include: { user: true }
  });

  if (!rt || rt.revoked || rt.expiresAt < new Date() || !rt.user.active) {
    if (rt) {
      await prisma.refreshToken.update({
        where: { id: rt.id },
        data: { revoked: true }
      });
    }
    res.clearCookie("dsr_refresh_token", { path: "/api/auth/refresh" });
    res.status(401).json({ error: "Invalid refresh token" });
    return;
  }

  const token = signToken(rt.user);
  res.cookie(config.sessionCookieName, token, cookieOptions);
  res.json({ token, success: true });
});

authRouter.post("/logout", async (req, res) => {
  const refreshTokenStr = req.cookies?.["dsr_refresh_token"];
  if (refreshTokenStr) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshTokenStr },
      data: { revoked: true }
    });
  }

  res.clearCookie(config.sessionCookieName, { path: "/" });
  res.clearCookie("dsr_refresh_token", { path: "/api/auth/refresh" });
  recordAudit(req, "AUTH_LOGOUT", undefined, 200);
  res.json({ success: true });
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration details" });
    return;
  }

  const username = parsed.data.username || parsed.data.email;
  const exists = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: parsed.data.email }] }
  });
  if (exists) {
    res.status(409).json({ error: "User already exists" });
    return;
  }

  const user = await prisma.user.create({
    data: {
      username,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      password: await bcrypt.hash(parsed.data.password, 10),
      role: Role.OFFICER,
      active: true
    }
  });

  res.json(jsonSafe({ success: true, username: user.username, fullName: user.fullName }));
});
